import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { file, mimeType, tenantId } = await req.json();
    if (!file || !mimeType || !tenantId) {
      return new Response(JSON.stringify({ error: "Missing file, mimeType, or tenantId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tenant's products for matching
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, brand, line, name, shade, stock, type, size, size_unit")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (productsError) throw productsError;

    const productList = (products || [])
      .map((p: any) => `${p.brand} | ${p.line || ""} | ${p.name} | shade:${p.shade || "none"} | id:${p.id} | stock:${p.stock}`)
      .join("\n");

    // Call Claude via Anthropic API with vision + tool use
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: `You are an inventory receipt parser for a hair salon. You will receive an image or PDF of a product order receipt/invoice. Extract every product line item with its quantity ordered.

Then match each extracted item to the salon's existing inventory below. Match by brand + shade code or product name. If unsure, provide your best guess with confidence "low".

EXISTING INVENTORY:
${productList}

For each item on the receipt, call the extract_receipt_items tool with ALL items found.`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: file,
                },
              },
              {
                type: "text",
                text: "Extract all product line items from this receipt with quantities, then match them to my existing inventory.",
              },
            ],
          },
        ],
        tools: [
          {
            name: "extract_receipt_items",
            description: "Extract and match all product line items from the receipt to existing inventory",
            input_schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      receipt_description: {
                        type: "string",
                        description: "The product description as shown on the receipt",
                      },
                      brand: { type: "string", description: "Extracted brand name" },
                      product_name: { type: "string", description: "Product name or shade name" },
                      shade: {
                        type: "string",
                        description: "Shade code if applicable (e.g. 7N, 6.1)",
                      },
                      quantity: {
                        type: "number",
                        description: "Number of units ordered",
                      },
                      matched_product_id: {
                        type: "string",
                        description: "UUID of the matched product from inventory, or empty string if no match",
                      },
                      confidence: {
                        type: "string",
                        enum: ["high", "medium", "low"],
                        description: "Confidence level of the match",
                      },
                    },
                    required: [
                      "receipt_description",
                      "brand",
                      "product_name",
                      "quantity",
                      "matched_product_id",
                      "confidence",
                    ],
                  },
                },
              },
              required: ["items"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "extract_receipt_items" },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const body = await aiResponse.text();
      console.error("Anthropic API error:", status, body);
      throw new Error(`AI error: ${status}`);
    }

    const aiData = await aiResponse.json();

    // Claude returns tool use in content array with type "tool_use"
    const toolUse = aiData.content?.find((c: any) => c.type === "tool_use");

    if (!toolUse?.input) {
      return new Response(
        JSON.stringify({ error: "AI could not parse the receipt. Try a clearer image." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const extracted = toolUse.input;
    const items = extracted.items || [];

    // Enrich matched items with current stock info
    const productMap = new Map((products || []).map((p: any) => [p.id, p]));
    const enrichedItems = items.map((item: any) => {
      const matched = productMap.get(item.matched_product_id);
      return {
        ...item,
        matched_product: matched
          ? {
              id: matched.id,
              brand: matched.brand,
              line: matched.line,
              name: matched.name,
              shade: matched.shade,
              current_stock: matched.stock,
            }
          : null,
      };
    });

    return new Response(JSON.stringify({ items: enrichedItems }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-receipt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
