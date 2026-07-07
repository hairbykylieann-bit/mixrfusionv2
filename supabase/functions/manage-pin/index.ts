import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashSync, compareSync, genSaltSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { staff_id, pin, action } = await req.json();

    // Validate action
    if (!action || !['set', 'reset', 'remove'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be "set", "reset", or "remove".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate staff_id
    if (!staff_id || typeof staff_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid staff_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate PIN for set/reset actions
    if ((action === 'set' || action === 'reset') && (!pin || typeof pin !== 'string' || pin.length !== 4 || !/^\d{4}$/.test(pin))) {
      return new Response(
        JSON.stringify({ error: 'Invalid PIN format. Must be 4 digits.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reject PINs a stranger would try first
    if (action === 'set' || action === 'reset') {
      const sameDigit = /^(\d)\1{3}$/.test(pin);
      const asc = '0123456789'.includes(pin);
      const desc = '9876543210'.includes(pin);
      const common = ['2580', '0852', '1122', '1212', '2020', '6969'].includes(pin);
      if (sameDigit || asc || desc || common) {
        return new Response(
          JSON.stringify({ error: 'That PIN is too easy to guess. Pick something less obvious.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Client with user's auth to check permissions
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has permission to manage staff (using service role to bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userRolesList = userRoles?.map(r => r.role) || [];
    let hasPermission = userRolesList.includes('admin') || userRolesList.includes('owner');

    // Resolve the caller's salon (their staff row, or the tenant they own)
    const { data: callerStaff } = await supabaseAdmin
      .from('staff')
      .select('tenant_id, can_manage_staff')
      .eq('user_id', user.id)
      .maybeSingle();
    let callerTenant: string | null = callerStaff?.tenant_id ?? null;
    if (!callerTenant) {
      const { data: ownedTenant } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('owner_user_id', user.id)
        .maybeSingle();
      callerTenant = ownedTenant?.id ?? null;
    }
    if (!callerTenant) {
      return new Response(
        JSON.stringify({ error: 'No salon found for your account' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!hasPermission && callerStaff?.can_manage_staff) hasPermission = true;

    // Target staff must exist AND belong to the caller's salon
    const { data: targetStaff, error: targetError } = await supabaseAdmin
      .from('staff')
      .select('id, name, tenant_id, pin_hash')
      .eq('id', staff_id)
      .single();

    if (targetError || !targetStaff || targetStaff.tenant_id !== callerTenant) {
      return new Response(
        JSON.stringify({ error: 'Staff member not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First-time self-set: anyone signed into this salon's device may CLAIM an
    // unset PIN (kiosk "choose your PIN" flow). Changing or removing an
    // existing PIN still requires staff-management permission.
    const isFirstTimeSet = action === 'set' && targetStaff.pin_hash === null;
    if (!hasPermission && !isFirstTimeSet) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions to manage staff PINs' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if PIN is already in use by another staff member (for set/reset)
    if (action === 'set' || action === 'reset') {
      const { data: allStaff, error: allStaffError } = await supabaseAdmin
        .from('staff')
        .select('id, pin_hash')
        .eq('tenant_id', callerTenant)
        .eq('is_active', true)
        .not('pin_hash', 'is', null)
        .neq('id', staff_id);

      if (!allStaffError && allStaff) {
        for (const staff of allStaff) {
          if (staff.pin_hash) {
            const isDuplicate = compareSync(pin, staff.pin_hash);
            if (isDuplicate) {
              return new Response(
                JSON.stringify({ error: 'This PIN is already in use by another staff member' }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        }
      }
    }

    // Process the action
    let updateData: { pin_hash: string | null };
    
    if (action === 'remove') {
      updateData = { pin_hash: null };
    } else {
      // Hash the PIN
      const salt = genSaltSync(10);
      const pinHash = hashSync(pin, salt);
      updateData = { pin_hash: pinHash };
    }

    // Update the staff record
    const { error: updateError } = await supabaseAdmin
      .from('staff')
      .update(updateData)
      .eq('id', staff_id);

    if (updateError) {
      console.error('Error updating PIN:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update PIN' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actionMessage = action === 'remove' ? 'removed' : 'updated';
    console.log(`PIN ${actionMessage} for staff: ${targetStaff.name} (${staff_id}) by user: ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `PIN ${actionMessage} successfully` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in manage-pin function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
