import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  question: string;
  messages?: ChatMessage[];
  context?: {
    currentPage?: string;
    selectedClientId?: string;
    tenantId?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { question, messages = [], context = {} }: ChatRequest = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Mira Chat] Question:", question);
    console.log("[Mira Chat] Context:", context);

    // Fetch relevant data based on the question
    let dataContext = "";
    const questionLower = question.toLowerCase();

    // Check for client-related questions
    const clientNameMatch = questionLower.match(/(?:on|for|about|with)\s+([a-z]+)/i);
    const mentionsClient = questionLower.includes("client") || 
                          questionLower.includes("formula") || 
                          questionLower.includes("last time") ||
                          questionLower.includes("last visit") ||
                          clientNameMatch;

    if (mentionsClient || context.selectedClientId) {
      // Fetch client data with recent sessions
      let clientQuery = supabase
        .from("clients")
        .select(`
          id, name, email, phone, preferences, client_since,
          color_sessions(
            id, session_date, notes, total_cost,
            session_bowls(
              id, name, amount_mixed, amount_used, notes,
              developer_amount, developer_unit,
              developer_product:products!session_bowls_developer_product_id_fkey(name, brand, shade),
              bowl_items(
                amount, unit,
                product:products(name, brand, shade, type)
              )
            )
          )
        `)
        .order("session_date", { foreignTable: "color_sessions", ascending: false })
        .limit(5, { foreignTable: "color_sessions" });

      if (context.selectedClientId) {
        clientQuery = clientQuery.eq("id", context.selectedClientId);
      } else if (clientNameMatch) {
        const searchName = clientNameMatch[1];
        clientQuery = clientQuery.ilike("name", `%${searchName}%`);
      }

      if (context.tenantId) {
        clientQuery = clientQuery.eq("tenant_id", context.tenantId);
      }

      const { data: clientData, error: clientError } = await clientQuery.limit(5);

      if (!clientError && clientData && clientData.length > 0) {
        dataContext += "\n\n## Client Information:\n";
        for (const client of clientData) {
          dataContext += `\n### ${client.name}\n`;
          dataContext += `- Client since: ${client.client_since}\n`;
          if (client.email) dataContext += `- Email: ${client.email}\n`;
          if (client.preferences) dataContext += `- Preferences: ${client.preferences}\n`;

          const sessions = client.color_sessions as any[];
          if (sessions && sessions.length > 0) {
            dataContext += `\n**Recent Color Sessions:**\n`;
            for (const session of sessions.slice(0, 3)) {
              dataContext += `\n- **${session.session_date}**`;
              if (session.notes) dataContext += ` (Notes: ${session.notes})`;
              dataContext += "\n";
              
              const bowls = session.session_bowls as any[];
              if (bowls) {
                for (const bowl of bowls) {
                  dataContext += `  Bowl "${bowl.name}": `;
                  const items = bowl.bowl_items as any[];
                  if (items && items.length > 0) {
                    const itemStrs = items.map((item: any) => 
                      `${item.amount}${item.unit} ${item.product?.brand || ''} ${item.product?.shade || item.product?.name || 'Unknown'}`
                    );
                    dataContext += itemStrs.join(" + ");
                  }
                  if (bowl.developer_product) {
                    dataContext += ` with ${bowl.developer_amount}${bowl.developer_unit} ${bowl.developer_product.name}`;
                  }
                  dataContext += "\n";
                }
              }
            }
          }
        }
      }
    }

    // Check for inventory-related questions
    const mentionsInventory = questionLower.includes("stock") || 
                             questionLower.includes("inventory") ||
                             questionLower.includes("running low") ||
                             questionLower.includes("out of") ||
                             questionLower.includes("reorder") ||
                             questionLower.includes("how much") ||
                             questionLower.includes("do we have");

    if (mentionsInventory) {
      let productQuery = supabase
        .from("products")
        .select("id, brand, line, name, shade, type, stock, reorder_level, cost_per_unit, size, size_unit")
        .eq("is_active", true)
        .order("stock", { ascending: true });

      if (context.tenantId) {
        productQuery = productQuery.eq("tenant_id", context.tenantId);
      }

      const { data: products, error: productError } = await productQuery.limit(50);

      if (!productError && products) {
        const lowStock = products.filter((p: any) => p.stock <= p.reorder_level);
        const outOfStock = products.filter((p: any) => p.stock === 0);
        
        dataContext += "\n\n## Inventory Status:\n";
        
        if (outOfStock.length > 0) {
          dataContext += `\n**⚠️ Out of Stock (${outOfStock.length} products):**\n`;
          outOfStock.slice(0, 10).forEach((p: any) => {
            dataContext += `- ${p.brand} ${p.shade || p.name} (${p.type})\n`;
          });
        }
        
        if (lowStock.length > outOfStock.length) {
          const lowNotOut = lowStock.filter((p: any) => p.stock > 0);
          dataContext += `\n**⚠️ Low Stock (${lowNotOut.length} products):**\n`;
          lowNotOut.slice(0, 10).forEach((p: any) => {
            dataContext += `- ${p.brand} ${p.shade || p.name}: ${p.stock} left (reorder at ${p.reorder_level})\n`;
          });
        }
        
        // Check for specific product mentions
        const productMatch = questionLower.match(/(\d+[a-z]*|\w+\s*\d+)/i);
        if (productMatch) {
          const searchTerm = productMatch[1];
          const matchingProducts = products.filter((p: any) => 
            p.shade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.name?.toLowerCase().includes(searchTerm.toLowerCase())
          );
          if (matchingProducts.length > 0) {
            dataContext += `\n**Products matching "${searchTerm}":**\n`;
            matchingProducts.forEach((p: any) => {
              dataContext += `- ${p.brand} ${p.shade || p.name}: ${p.stock} in stock (${p.size || ''}${p.size_unit || ''} each, $${p.cost_per_unit}/unit)\n`;
            });
          }
        }
        
        dataContext += `\n**Total active products:** ${products.length}\n`;
      }
    }

    // Check for business insights questions
    const mentionsBusiness = questionLower.includes("how much") ||
                            questionLower.includes("this week") ||
                            questionLower.includes("this month") ||
                            questionLower.includes("total") ||
                            questionLower.includes("cost") ||
                            questionLower.includes("frequent") ||
                            questionLower.includes("busy");

    if (mentionsBusiness) {
      // Get recent session stats
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      let sessionQuery = supabase
        .from("color_sessions")
        .select("session_date, total_cost, client_id")
        .gte("session_date", weekAgo.toISOString().split("T")[0]);

      if (context.tenantId) {
        sessionQuery = sessionQuery.eq("tenant_id", context.tenantId);
      }

      const { data: recentSessions, error: sessionError } = await sessionQuery;

      if (!sessionError && recentSessions) {
        const totalCost = recentSessions.reduce((sum: number, s: any) => sum + (s.total_cost || 0), 0);
        const uniqueClients = new Set(recentSessions.map((s: any) => s.client_id)).size;
        
        dataContext += "\n\n## Business Insights (Last 7 Days):\n";
        dataContext += `- Total color sessions: ${recentSessions.length}\n`;
        dataContext += `- Total product cost: $${totalCost.toFixed(2)}\n`;
        dataContext += `- Unique clients served: ${uniqueClients}\n`;
      }
    }

    // Build the system prompt
    const systemPrompt = `You are Mira, a friendly and knowledgeable AI assistant for MixR Fusion, a salon color management app. You help stylists and salon owners with:

1. **Client formula history** - You can look up what formulas were used on specific clients
2. **Inventory questions** - You know current stock levels and can identify low-stock items
3. **Business insights** - You can share statistics about sessions, costs, and client activity
4. **App navigation** - You can explain how to use different features of the app
5. **General salon knowledge** - Hair color mixing, developer volumes, color theory, etc.

## App Navigation Guide:
- **Home**: The main dashboard with quick access tiles to all features
- **New Bowl**: Create a new color session - select a client, add products, and log the formula
- **Clients**: View and manage client list, add new clients, see client history
- **Inventory**: Manage products, check stock levels, import from catalogs
- **Staff**: Add and manage staff members, set permissions and PIN codes
- **Reports**: View business reports, product usage, and export data
- **Settings**: Configure salon settings, pricing, and preferences

## Current Context:
- User is on: ${context.currentPage || "unknown page"}
${context.selectedClientId ? `- Viewing a specific client` : "- No specific client selected"}

${dataContext ? `## Available Data:\n${dataContext}` : "## Note: No specific data was found for this query."}

## Response Guidelines:
- Be conversational and friendly, but concise
- If you have specific data, present it clearly
- Use bullet points and formatting for readability
- If you don't have the data, be honest and suggest where to find it in the app
- When discussing formulas, be specific about amounts and products
- For navigation questions, give step-by-step guidance`;

    // Build conversation messages
    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ];

    console.log("[Mira Chat] Calling Lovable AI with context length:", dataContext.length);

    // Call Lovable AI Gateway with streaming
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Mira Chat] AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return streaming response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[Mira Chat] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
