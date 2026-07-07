-- Create a trigger function to protect owner accounts
CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the record being updated is an owner
  IF OLD.role = 'owner' THEN
    -- Prevent role changes
    IF NEW.role != 'owner' THEN
      RAISE EXCEPTION 'Owner role cannot be changed';
    END IF;
    
    -- Prevent deactivation
    IF NEW.is_active = false THEN
      RAISE EXCEPTION 'Owner accounts cannot be deactivated';
    END IF;
    
    -- Force all permissions to true for owners
    NEW.can_create_bowls := true;
    NEW.can_view_basic_client_info := true;
    NEW.can_view_all_client_data := true;
    NEW.can_view_all_clients := true;
    NEW.can_manage_clients := true;
    NEW.can_manage_own_clients := true;
    NEW.can_manage_products := true;
    NEW.can_view_product_costs := true;
    NEW.can_view_reports := true;
    NEW.can_manage_staff := true;
    NEW.can_manage_settings := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on the staff table
DROP TRIGGER IF EXISTS protect_owner_trigger ON public.staff;
CREATE TRIGGER protect_owner_trigger
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_owner_role();