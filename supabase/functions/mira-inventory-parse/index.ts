import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InventoryProduct {
  id: string;
  name: string;
  brand: string;
  line: string | null;
  shade: string | null;
  type: string;
  stock: number;
}

interface ParseRequest {
  transcription: string;
  products: InventoryProduct[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { transcription, products }: ParseRequest = await req.json();
    if (!transcription || !Array.isArray(products)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Compact catalog for the model
    const catalog = products.map((p) => ({
      id: p.id,
      brand: p.brand,
      line: p.line ?? "",
      shade: p.shade ?? "",
      name: p.name,
      type: p.type,
      stock: p.stock,
    }));

    const systemPrompt = `You are an inventory assistant for a hair salon. The user is doing a stock count and will say things like "in Kenra Demi we have 2 1N, 3 3N, and 1 5NA" or "Redken Shades EQ 9V is at 4". Your job is to map their spoken updates to specific products in the catalog and return the NEW absolute stock count for each.

Rules:
- Numbers are SET to that exact count (not added). "2 1N" means stock of product 1N becomes 2.
- A brand or line mentioned at the start applies to every product after it until a new brand/line is mentioned.
- Match by shade code first (e.g. "1N", "3N", "9V"), then by line, then by brand. Prefer exact shade matches.
- Fractional counts are allowed (e.g. "two and a half" = 2.5, "half a tube" = 0.5).
- If you cannot confidently match a phrase to a product, put the raw phrase in "unmatched" instead of guessing.
- Each updated product appears at most once. If the user repeats one, use the latest value.
- Respond with ONLY valid JSON matching this shape:
{ "updates": [{ "productId": "uuid", "matchedName": "Brand Line Shade", "newStock": number, "confidence": 0.0-1.0 }], "unmatched": [string] }`;

    const userPrompt = `Catalog (JSON):\n${JSON.stringify(catalog)}\n\nUser said: "${transcription}"\n\nReturn the JSON now.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Lovable AI error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `AI gateway error: ${aiResponse.status}`, detail: errText }),
        { status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content ?? "{}";
    let parsed: { updates?: unknown; unmatched?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const updates = Array.isArray(parsed.updates)
      ? (parsed.updates as Array<Record<string, unknown>>)
          .map((u) => {
            const productId = String(u.productId ?? "");
            const product = productMap.get(productId);
            if (!product) return null;
            const newStock = Number(u.newStock);
            if (!Number.isFinite(newStock) || newStock < 0) return null;
            return {
              productId,
              matchedName:
                String(u.matchedName ?? "") ||
                [product.brand, product.line, product.shade || product.name].filter(Boolean).join(" "),
              currentStock: product.stock,
              newStock: Math.round(newStock * 100) / 100,
              confidence: Math.max(0, Math.min(1, Number(u.confidence) || 0.5)),
            };
          })
          .filter((u): u is NonNullable<typeof u> => u !== null)
      : [];

    const unmatched = Array.isArray(parsed.unmatched)
      ? (parsed.unmatched as unknown[]).map(String).filter(Boolean)
      : [];

    return new Response(JSON.stringify({ updates, unmatched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mira-inventory-parse error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
