import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportRequest {
  catalog_product_ids: string[];
  default_stock?: number;
  pricing?: Record<string, number>; // catalog_id -> cost per tube
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get user's auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to respect RLS
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user and get their tenant
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's tenant_id (primary: tenant_users). Some accounts may only have staff records,
    // so we fall back to staff. This keeps imports working while still respecting RLS.
    const { data: tenantData, error: tenantError } = await supabaseUser
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (tenantError) {
      console.error("Error fetching tenant membership:", tenantError);
    }

    let tenantId: string | null = tenantData?.tenant_id ?? null;

    if (!tenantId) {
      const { data: staffData, error: staffError } = await supabaseUser
        .from("staff")
        .select("tenant_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (staffError) {
        console.error("Error fetching staff tenant:", staffError);
      }

      tenantId = staffData?.tenant_id ?? null;
    }

    if (!tenantId) {
      return new Response(
        JSON.stringify({ error: "User not associated with a tenant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { catalog_product_ids, default_stock = 0, pricing = {} }: ImportRequest = await req.json();

    if (!catalog_product_ids || !Array.isArray(catalog_product_ids) || catalog_product_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "catalog_product_ids array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client to read catalog products
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch catalog products to import (without embedded join)
    const { data: catalogProducts, error: fetchError } = await supabaseAdmin
      .from("catalog_products")
      .select("id, catalog_id, type, shade, name, default_size, default_size_unit, suggested_cost_per_unit")
      .in("id", catalog_product_ids);

    if (fetchError) {
      console.error("Error fetching catalog products:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch catalog products" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!catalogProducts || catalogProducts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid catalog products found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch catalog brand/line separately for reliability
    const uniqueCatalogIds = [...new Set(catalogProducts.map((cp) => cp.catalog_id).filter(Boolean))] as string[];
    const catalogMap: Record<string, { brand: string; line: string }> = {};

    if (uniqueCatalogIds.length > 0) {
      const { data: catalogs, error: catalogError } = await supabaseAdmin
        .from("product_catalogs")
        .select("id, brand, line")
        .in("id", uniqueCatalogIds);

      if (catalogError) {
        console.error("Error fetching catalogs:", catalogError);
      } else if (catalogs) {
        catalogs.forEach((c) => {
          catalogMap[c.id] = { brand: c.brand, line: c.line };
        });
      }
    }

    // Map lowercase catalog types to product_type enum values
    // Toners and additives are mapped to Color - they're just specialized color products
    const typeMapping: Record<string, string> = {
      "color": "Color",
      "developer": "Developer",
      "lightener": "Lightener",
      "treatment": "Treatment",
      "toner": "Color",
      "additive": "Color",
    };

    // Fetch existing products for this tenant to detect duplicates
    const { data: existingProducts, error: existingError } = await supabaseAdmin
      .from("products")
      .select("brand, line, shade, name")
      .eq("tenant_id", tenantId);

    if (existingError) {
      console.error("Error fetching existing products:", existingError);
    }

    // Build a set of existing product signatures for fast lookup
    const existingSet = new Set<string>();
    if (existingProducts) {
      existingProducts.forEach((p) => {
        const sig = `${p.brand?.toLowerCase()}|${p.line?.toLowerCase() || ""}|${p.shade?.toLowerCase() || ""}|${p.name?.toLowerCase()}`;
        existingSet.add(sig);
      });
    }

    // Transform catalog products to tenant products, filtering out duplicates
    const productsToInsert: Array<Record<string, unknown>> = [];
    const skippedDuplicates: string[] = [];

    catalogProducts.forEach((cp) => {
      // Look up brand/line from the separately-fetched catalog map
      const catalogData = cp.catalog_id ? catalogMap[cp.catalog_id] : null;
      const brand = catalogData?.brand || "Unknown";
      const line: string | null = catalogData?.line || null;

      // Check for duplicate
      const sig = `${brand.toLowerCase()}|${line?.toLowerCase() || ""}|${cp.shade?.toLowerCase() || ""}|${cp.name?.toLowerCase()}`;
      if (existingSet.has(sig)) {
        skippedDuplicates.push(cp.name + (cp.shade ? ` ${cp.shade}` : ""));
        return; // Skip this product
      }

      // Convert lowercase type to proper enum value
      const productType = typeMapping[cp.type?.toLowerCase()] || "Color";
      
      // Calculate cost_per_unit from pricing map if provided
      // pricing key format: "catalog_id:Type" (new) or "catalog_id" (legacy fallback)
      let costPerUnit = 0;
      const perTypeKey = cp.catalog_id ? `${cp.catalog_id}:${productType}` : "";
      const perTypeCost = perTypeKey ? pricing[perTypeKey] : undefined;
      const legacyCost = cp.catalog_id ? pricing[cp.catalog_id] : undefined;
      const containerCost = perTypeCost ?? legacyCost;

      if (containerCost && typeof cp.default_size === "number" && cp.default_size > 0) {
        costPerUnit = containerCost / cp.default_size;
      } else if (cp.suggested_cost_per_unit && typeof cp.default_size === "number" && cp.default_size > 0) {
        costPerUnit = cp.suggested_cost_per_unit / cp.default_size;
      }
      
      productsToInsert.push({
        tenant_id: tenantId,
        type: productType,
        brand,
        line,
        shade: cp.shade,
        name: cp.name,
        size: cp.default_size,
        size_unit: cp.default_size_unit || "ml",
        cost_per_unit: costPerUnit,
        stock: default_stock,
        reorder_level: 5,
        target_stock: 20,
        is_active: true,
      });
    });

    // If all products were duplicates, return early with info
    if (productsToInsert.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          imported_count: 0,
          skipped_duplicates: skippedDuplicates.length,
          message: `All ${skippedDuplicates.length} products already exist in your inventory`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert products into tenant's inventory using user's client (respects RLS)
    const { data: insertedProducts, error: insertError } = await supabaseUser
      .from("products")
      .insert(productsToInsert)
      .select("id, name");

    if (insertError) {
      console.error("Error inserting products:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to import products: " + insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported_count: insertedProducts?.length || 0,
        skipped_duplicates: skippedDuplicates.length,
        products: insertedProducts,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Catalog import error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
