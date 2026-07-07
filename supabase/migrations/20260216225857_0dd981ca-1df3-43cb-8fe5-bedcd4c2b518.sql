
-- Fix security definer views by setting them to security invoker
ALTER VIEW public.products_public SET (security_invoker = on);
ALTER VIEW public.products_with_costs SET (security_invoker = on);
