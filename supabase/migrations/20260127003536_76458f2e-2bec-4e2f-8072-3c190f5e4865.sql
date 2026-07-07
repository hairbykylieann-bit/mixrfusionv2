-- Create error_logs table for frontend crash reporting
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message text NOT NULL,
  error_stack text,
  component_stack text,
  user_id uuid REFERENCES auth.users(id),
  tenant_id uuid REFERENCES public.tenants(id),
  url text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS: Only platform admins can view error logs
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view error logs"
  ON public.error_logs FOR SELECT
  USING (is_platform_admin());

-- Anyone can insert errors (needed for anonymous crash reports)
CREATE POLICY "Anyone can report errors"
  ON public.error_logs FOR INSERT
  WITH CHECK (true);