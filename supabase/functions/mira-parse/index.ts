import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParseRequest {
  transcription: string;
  preferredUnit: string;
  products: Array<{
    id: string;
    name: string;
    brand: string;
    line: string | null;
    shade: string | null;
    type: string;
  }>;
  clients: Array<{
    id: string;
    name: string;
  }>;
}

// Convert spoken numbers to digits
const spokenToDigit: Record<string, string> = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
  'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
  'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
  'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
  'eighty': '80', 'ninety': '90', 'hundred': '100'
};

function normalizeTranscription(text: string): string {
  let normalized = text.toLowerCase();

  for (const [word, digit] of Object.entries(spokenToDigit)) {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
  }

  // Handle common patterns like "6 n" -> "6N"
  normalized = normalized.replace(/(\d+)\s*([a-zA-Z])\b/g, '$1$2');

  // Handle "volume" patterns
  normalized = normalized.replace(/(\d+)\s*(?:volume|vol)\b/gi, '$1 vol');

  return normalized;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { transcription, preferredUnit, products, clients }: ParseRequest = await req.json();

    if (!transcription) {
      return new Response(
        JSON.stringify({ error: "No transcription provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const salonUnit = preferredUnit || "oz";
    const normalizedTranscription = normalizeTranscription(transcription);
    console.log("Original transcription:", transcription);
    console.log("Normalized transcription:", normalizedTranscription);
    console.log("Salon preferred unit:", salonUnit);

    const productList = products.slice(0, 100).map(p => {
      const parts = [p.brand];
      if (p.line) parts.push(p.line);
      if (p.shade) parts.push(p.shade);
      parts.push(`(${p.type})`);
      return `- ${parts.join(" ")} [id:${p.id}]`;
    }).join("\n");

    const clientList = clients.slice(0, 50).map(c => `- ${c.name} [id:${c.id}]`).join("\n");

    const systemPrompt = `You are Mira, an AI assistant for salon stylists. Parse spoken color mix instructions into structured data.

TRANSCRIPTION ERROR CORRECTION:
Speech-to-text often mishears hair color terminology. Apply these corrections:
- "six end", "six in", "6 end" → "6N" (shade code)
- "seven a", "seventy" → "7A" (shade code)
- "eight g", "eighty" → "8G" (shade code)
- "five rv", "five are vee" → "5RV" (shade code)
- "ten volume", "ten vol" → "10 vol" (developer)
- "twenty volume" → "20 vol", "thirty volume" → "30 vol", "forty volume" → "40 vol"
- Any number followed by a single letter is likely a shade code (e.g. "9N", "6A", "7G")
- "developer" or "dev" refers to developer/peroxide
- Always consider that isolated letters after numbers are shade codes, not separate words

CRITICAL UNIT RULES:
- The salon's preferred unit is "${salonUnit}".
- PRESERVE the exact unit the stylist spoke. If they say "0.3 oz", output 0.3 with unit "oz". If they say "30 grams", output 30 with unit "g". If they say "60 ml", output 60 with unit "ml".
- If the stylist does NOT mention a unit (e.g. just "30 of 6N"), default to "${salonUnit}".
- NEVER convert between units. Output the number exactly as spoken.
- Valid units: "g", "oz", "ml"

IMPORTANT: Convert ALL spoken numbers to digits. Examples:
- "six N" = "6N" (shade code)
- "thirty grams" = 30 (amount)
- "point three oz" = 0.3 (amount)
- "ten volume" = "10 Vol" (developer)
- "twenty vol" = "20 Vol"

Available products:
${productList || "No products available"}

Available clients:
${clientList || "No clients available"}

Instructions:
1. Extract the client name if mentioned - match to available clients list
2. Extract ALL color products with amounts and their spoken units
3. Extract developer information separately (look for "volume", "vol", "developer"). There may be MULTIPLE developers — e.g. "mix 10 vol and 20 vol" means two developers.
4. IMPORTANT for developers: If the user mentions a specific developer brand or line name (e.g., "Kenra 20 vol", "Prolific developer"), include that brand/line name in the developer's "brandHint" field. If they just say a volume number without a brand (e.g., "20 volume", "20 vol"), set brandHint to null.
5. Common hair color patterns to recognize:
   - Shade codes: "6N", "7A", "8G", "5RV", "10N" (number + letter(s))
   - Developer: "10 vol", "20 volume", "30 vol", "40 volume"
   - Amounts: "30g", "60ml", "0.3 oz", "2 oz"
   - Ratios: "1:1", "equal parts", "double developer"
6. If someone says "for [name]", that's the client
7. Match product names/shades to the available products list when possible

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "clientName": "string or null",
  "clientId": "matched client id from the list or null",
  "bowls": [{
    "name": "Bowl 1",
    "items": [{"productId": "id from product list or null", "productName": "what was said", "amount": number, "unit": "${salonUnit}"}],
    "developers": [{"productId": "id or null", "productName": "e.g. 20 Vol", "amount": number, "unit": "${salonUnit}", "brandHint": "brand/line name if explicitly mentioned, or null"}],
    "notes": "any special instructions or null"
  }],
  "confidence": 0.0-1.0
}`;

    console.log("Calling Anthropic API...");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: "user", content: `Parse this spoken color mix instruction: "${normalizedTranscription}"\n\nOriginal speech: "${transcription}"` },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `AI parsing failed: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    console.log("AI Response received");

    const content = aiData.content?.[0]?.text;

    if (!content) {
      console.error("No content in AI response:", aiData);
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI content:", content);

    // Parse the JSON response — strip markdown fences if present
    let parsed: Record<string, unknown>;
    try {
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      parsed = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", e, "Content:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: content }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize: if AI returned old single `developer` field, convert to `developers` array
    if (parsed.bowls && Array.isArray(parsed.bowls)) {
      for (const bowl of parsed.bowls as Record<string, unknown>[]) {
        if (bowl.developer && !bowl.developers) {
          bowl.developers = [bowl.developer];
          delete bowl.developer;
        }
        if (!bowl.developers) {
          bowl.developers = [];
        }
      }
    }

    console.log("Parsed result:", JSON.stringify(parsed, null, 2));

    return new Response(
      JSON.stringify({ success: true, ...parsed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Parse error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
