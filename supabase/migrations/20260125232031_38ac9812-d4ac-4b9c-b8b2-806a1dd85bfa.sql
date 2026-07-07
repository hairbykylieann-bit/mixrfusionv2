-- Create staff_invitations table
CREATE TABLE public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  short_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'))
);

-- Indexes for fast lookups
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(token);
CREATE INDEX idx_staff_invitations_short_code ON public.staff_invitations(short_code);
CREATE INDEX idx_staff_invitations_staff_id ON public.staff_invitations(staff_id);
CREATE INDEX idx_staff_invitations_tenant_id ON public.staff_invitations(tenant_id);

-- RLS Policies
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Platform admins can manage all
CREATE POLICY "Platform admins can manage invitations"
  ON public.staff_invitations FOR ALL
  USING (is_platform_admin());

-- Tenant staff managers can manage their invitations
CREATE POLICY "Staff managers can manage tenant invitations"
  ON public.staff_invitations FOR ALL
  USING (tenant_id = get_user_tenant_id() AND current_user_can_manage_staff());

-- Public read for token validation (actual validation in edge function)
CREATE POLICY "Anyone can view invitation by token"
  ON public.staff_invitations FOR SELECT
  USING (true);

-- Add invitation_status column to staff table
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'none';

COMMENT ON COLUMN public.staff.invitation_status IS 
  'Invitation status: none, pending, accepted';