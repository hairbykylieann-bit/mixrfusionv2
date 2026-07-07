import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pin, tenant_id } = await req.json();

    if (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: 'Invalid PIN format. Must be 4 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tenant_id || typeof tenant_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Tenant ID is required for PIN verification.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active staff members with PIN hashes for this tenant only
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select(`
        id,
        name,
        email,
        phone,
        role,
        custom_role_name,
        is_active,
        pin_hash,
        tenant_id,
        can_manage_staff,
        can_view_reports,
        can_manage_products,
        can_manage_settings,
        can_manage_clients,
        can_view_all_clients,
        can_view_basic_client_info,
        can_create_bowls,
        can_manage_own_clients,
        can_view_product_costs,
        can_edit_formulas,
        can_view_own_reports,
        can_delete_sessions,
        has_custom_markup,
        custom_markup_percent
      `)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .not('pin_hash', 'is', null);

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!staffMembers || staffMembers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No staff members configured with PINs in this salon' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check PIN against each staff member's hash
    for (const staff of staffMembers) {
      if (staff.pin_hash) {
        try {
          const isMatch = compareSync(pin, staff.pin_hash);
          if (isMatch) {
            // Remove pin_hash from response for security
            const { pin_hash, ...staffData } = staff;
            
            console.log(`PIN verified for staff: ${staff.name} (${staff.id})`);
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                staff: staffData 
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (bcryptError) {
          console.error('bcrypt comparison error:', bcryptError);
          // Continue to next staff member if this comparison fails
          continue;
        }
      }
    }

    // No match found
    console.log('PIN verification failed - no match');
    return new Response(
      JSON.stringify({ error: 'Invalid PIN' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-pin function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
