import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useStaff, type StaffWithStats } from "@/hooks/useStaff";
import { toast } from "sonner";
import { User, Crown, Shield, Info, ShieldAlert, KeyRound, Check, X, DollarSign, Mail, Pencil, Phone } from "lucide-react";
import { StaffMarkupInput } from "./StaffMarkupInput";
import { StaffPermissions, StaffPermissionsData } from "./StaffPermissions";
import { PinManagementDialog } from "./PinManagementDialog";

import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const formSchema = z.object({
  role: z.enum(["admin", "owner", "manager", "stylist", "assistant", "front_desk"] as const),
  has_custom_markup: z.boolean().default(false),
  custom_markup_percent: z.coerce.number().min(1).default(4),
  has_custom_bowl_fee: z.boolean().default(false),
  custom_bowl_fee: z.coerce.number().min(0).default(0),
  receives_commission: z.boolean().default(false),
  commission_percent: z.coerce.number().min(0).max(100).default(0),
});

type FormValues = z.infer<typeof formSchema>;

interface StaffDetailSheetProps {
  staff: StaffWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwnerViewing?: boolean;
}

const roleConfig: Record<string, { label: string; description: string; icon: typeof User; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  admin: { label: "Admin", description: "Full administrative access (legacy)", icon: Shield, variant: "destructive" },
  owner: { label: "Owner", description: "Full access including billing & settings", icon: Crown, variant: "default" },
  manager: { label: "Manager", description: "Manage staff, products, reports — except billing", icon: Shield, variant: "default" },
  stylist: { label: "Stylist", description: "Create bowls, earn commission on services", icon: User, variant: "secondary" },
  assistant: { label: "Assistant", description: "Support stylists, create bowls, no commission", icon: User, variant: "outline" },
  front_desk: { label: "Front Desk", description: "View sessions & clients for checkout", icon: User, variant: "outline" },
};

export function StaffDetailSheet({ staff, open, onOpenChange, isOwnerViewing = false }: StaffDetailSheetProps) {
  const { updateStaff } = useStaff();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pinAction, setPinAction] = useState<"set" | "reset">("set");
  const [isRemovingPin, setIsRemovingPin] = useState(false);

  // Profile inline editing state
  const [profileEditing, setProfileEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [permissions, setPermissions] = useState<StaffPermissionsData>({
    can_create_bowls: true,
    can_view_basic_client_info: true,
    can_view_all_clients: true,
    can_manage_clients: false,
    can_manage_own_clients: false,
    can_manage_products: false,
    can_view_product_costs: false,
    can_view_reports: false,
    can_manage_staff: false,
    can_manage_settings: false,
    
    can_edit_formulas: false,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    values: staff ? {
      role: staff.role,
      has_custom_markup: staff.has_custom_markup,
      custom_markup_percent: staff.custom_markup_percent,
      has_custom_bowl_fee: staff.has_custom_bowl_fee ?? false,
      custom_bowl_fee: Number(staff.custom_bowl_fee) || 0,
      receives_commission: staff.receives_commission,
      commission_percent: staff.commission_percent,
    } : undefined,
  });

  const receivesCommission = form.watch("receives_commission");
  const hasCustomMarkup = form.watch("has_custom_markup");
  const hasCustomBowlFee = form.watch("has_custom_bowl_fee");
  const { settings: salonSettings } = useSalonSettings();

  // Load permissions + profile fields from staff when it changes
  useEffect(() => {
    if (staff) {
      setPermissions({
        can_create_bowls: staff.can_create_bowls,
        can_view_basic_client_info: staff.can_view_basic_client_info,
        can_view_all_clients: staff.can_view_all_clients,
        can_manage_clients: staff.can_manage_clients,
        can_manage_own_clients: staff.can_manage_own_clients,
        can_manage_products: staff.can_manage_products,
        can_view_product_costs: staff.can_view_product_costs,
        can_view_reports: staff.can_view_reports,
        can_manage_staff: staff.can_manage_staff,
        can_manage_settings: staff.can_manage_settings,
        
        can_edit_formulas: staff.can_edit_formulas,
      });
      setEditName(staff.name);
      setEditEmail(staff.email || "");
      setEditPhone(staff.phone || "");
      setProfileEditing(false);
    }
  }, [staff]);

  const onSubmit = async (values: FormValues) => {
    if (!staff) return;
    setIsSubmitting(true);
    try {
      await updateStaff.mutateAsync({
        id: staff.id,
        updates: {
          role: values.role as AppRole,
          has_custom_markup: values.has_custom_markup,
          custom_markup_percent: values.has_custom_markup ? values.custom_markup_percent : 0,
          has_custom_bowl_fee: values.has_custom_bowl_fee,
          custom_bowl_fee: values.has_custom_bowl_fee ? values.custom_bowl_fee : 0,
          receives_commission: values.receives_commission,
          commission_percent: values.receives_commission ? values.commission_percent : 0,
          ...permissions,
        },
      });
      toast.success("Staff member updated");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!staff || !editName.trim()) {
      toast.error("Name is required");
      return;
    }
    setIsSavingProfile(true);
    try {
      await updateStaff.mutateAsync({
        id: staff.id,
        updates: {
          name: editName.trim(),
          email: editEmail.trim() || null,
          phone: editPhone.trim() || null,
        },
      });
      toast.success("Profile updated");
      setProfileEditing(false);
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelProfile = () => {
    if (staff) {
      setEditName(staff.name);
      setEditEmail(staff.email || "");
      setEditPhone(staff.phone || "");
    }
    setProfileEditing(false);
  };

  const handleToggleActive = async () => {
    if (!staff) return;
    if (staff.role === 'owner') {
      toast.error("Owner accounts cannot be deactivated");
      return;
    }
    try {
      await updateStaff.mutateAsync({
        id: staff.id,
        updates: { is_active: !staff.is_active },
      });
      toast.success(staff.is_active ? "Staff member deactivated" : "Staff member activated");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const isOwner = staff?.role === 'owner';

  const handleSetPin = () => {
    setPinAction("set");
    setIsPinDialogOpen(true);
  };

  const handleChangePin = () => {
    setPinAction("reset");
    setIsPinDialogOpen(true);
  };

  const handleRemovePin = async () => {
    if (!staff) return;
    setIsRemovingPin(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-pin", {
        body: {
          staff_id: staff.id,
          action: "remove",
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success("PIN removed successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    } catch (error: any) {
      console.error("PIN removal error:", error);
      toast.error(error.message || "Failed to remove PIN");
    } finally {
      setIsRemovingPin(false);
    }
  };

  const handlePinSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["staff"] });
  };

  if (!staff) return null;

  const RoleIcon = roleConfig[staff.role]?.icon || User;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                <span className="font-medium text-foreground">
                  {staff.name.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
              <div className="min-w-0">
                {profileEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Name"
                      className="h-8 text-sm font-semibold"
                    />
                    <Input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="Email"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Phone"
                      className="h-8 text-sm"
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={handleCancelProfile}
                        disabled={isSavingProfile}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <SheetTitle>{staff.name}</SheetTitle>
                    <Badge variant={roleConfig[staff.role]?.variant} className="gap-1 mt-1">
                      <RoleIcon className="w-3 h-3" />
                      {roleConfig[staff.role]?.label}
                    </Badge>
                    {(staff.email || staff.phone) && (
                      <div className="mt-1.5 space-y-0.5">
                        {staff.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {staff.email}
                          </p>
                        )}
                        {staff.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {staff.phone}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {!profileEditing && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setProfileEditing(true)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Stats Section - Only visible to owners */}
        {isOwnerViewing && (
          <>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="stat-card">
                <p className="text-2xl font-semibold text-foreground">{staff.servicesRecent}</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{staff.totalServices} total</p>
              </div>
              <div className="stat-card">
                <p className="text-2xl font-semibold text-foreground">
                  ${staff.revenueRecent.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Revenue (30 days)</p>
              </div>
            </div>
            <Separator className="my-4" />
          </>
        )}

        {/* Owner Protection Warning */}
        {isOwner && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 mb-4">
            <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-600">Protected Account</p>
              <p className="text-xs text-amber-600/80">
                Owner accounts cannot be deactivated, demoted, or have permissions modified.
              </p>
            </div>
          </div>
        )}

        {/* Active Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Staff Status</p>
              <p className="text-xs text-muted-foreground">
                {isOwner
                  ? "Owner — always active with full permissions"
                  : staff.is_active 
                    ? "Active — can be assigned to services" 
                    : "Inactive — hidden from assignment lists"}
              </p>
            </div>
            <Switch 
              checked={staff.is_active} 
              onCheckedChange={handleToggleActive} 
              disabled={isOwner}
            />
          </div>
          {!isOwner && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Deactivating preserves all service history and revenue data. Use this instead of deleting.
              </p>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Kiosk PIN Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Kiosk PIN</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {staff.hasPin ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">PIN is set</span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                    <X className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">No PIN assigned</span>
                </>
              )}
            </div>
            
            <div className="flex gap-2">
              {staff.hasPin ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleChangePin}
                  >
                    Change
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePin}
                    disabled={isRemovingPin}
                    className="text-destructive hover:text-destructive"
                  >
                    {isRemovingPin ? "Removing..." : "Remove"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSetPin}
                >
                  Set PIN
                </Button>
              )}
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            Staff use their PIN to log in at the kiosk for quick service entry.
          </p>
        </div>

        <Separator className="my-4" />


        {/* Edit Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isOwner}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="owner">
                        <div className="flex flex-col items-start">
                          <span>Owner</span>
                          <span className="text-xs text-muted-foreground">Full access including billing & settings</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="manager">
                        <div className="flex flex-col items-start">
                          <span>Manager</span>
                          <span className="text-xs text-muted-foreground">Manage staff, products, reports — except billing</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="stylist">
                        <div className="flex flex-col items-start">
                          <span>Stylist</span>
                          <span className="text-xs text-muted-foreground">Create bowls, earn commission on services</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="assistant">
                        <div className="flex flex-col items-start">
                          <span>Assistant</span>
                          <span className="text-xs text-muted-foreground">Support stylists, create bowls, no commission</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="front_desk">
                        <div className="flex flex-col items-start">
                          <span>Front Desk</span>
                          <span className="text-xs text-muted-foreground">View sessions & clients for checkout</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pricing & Commission Settings - Only visible to owners */}
            {isOwnerViewing && (
              <>
                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Pricing & Commission</h3>
                  </div>
                  
                  {/* Markup Settings */}
                  <FormField
                    control={form.control}
                    name="has_custom_markup"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium">Custom Backbar Multiplier</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Override salon default multiplier for this stylist
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {hasCustomMarkup && (
                    <StaffMarkupInput
                      value={form.watch("custom_markup_percent")}
                      onChange={(v) => form.setValue("custom_markup_percent", v)}
                      salonDefault={salonSettings?.backbar_multiplier}
                    />
                  )}

                  {/* Bowl Fee Override */}
                  <FormField
                    control={form.control}
                    name="has_custom_bowl_fee"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium">Custom Bowl Fee</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Override salon default bowl fee (${salonSettings?.bowl_fee?.toFixed(2) ?? '2.50'})
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {hasCustomBowlFee && (
                    <FormField
                      control={form.control}
                      name="custom_bowl_fee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bowl Fee Amount</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.25"
                                {...field}
                                className="w-24"
                              />
                            </div>
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Charged per bowl for this stylist's services
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                </div>
              </>
            )}

            <Separator className="my-4" />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Permissions</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {isOwner 
                  ? "Owners have full access to all features"
                  : `Control what ${staff.name.split(" ")[0]} can access and manage`}
              </p>
              <StaffPermissions
                permissions={permissions}
                onChange={setPermissions}
                disabled={isOwner}
              />
            </div>

            <Separator className="my-4" />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Form>

        <PinManagementDialog
          open={isPinDialogOpen}
          onOpenChange={setIsPinDialogOpen}
          staffId={staff.id}
          staffName={staff.name}
          action={pinAction}
          onSuccess={handlePinSuccess}
        />
      </SheetContent>
    </Sheet>
  );
}
