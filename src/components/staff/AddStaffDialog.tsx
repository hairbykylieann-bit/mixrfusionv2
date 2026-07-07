import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Separator } from "@/components/ui/separator";
import { useStaff } from "@/hooks/useStaff";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { Shield, DollarSign, KeyRound } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { StaffMarkupInput } from "./StaffMarkupInput";
import { StaffPermissions, StaffPermissionsData, getRoleDefaults } from "./StaffPermissions";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(20).optional().or(z.literal("")),
  role: z.enum(["admin", "owner", "manager", "stylist", "assistant", "front_desk"] as const),
  has_custom_markup: z.boolean().default(false),
  custom_markup_percent: z.coerce.number().min(1).default(4),
  has_custom_bowl_fee: z.boolean().default(false),
  custom_bowl_fee: z.coerce.number().min(0).default(0),
  pin: z.string().refine((v) => v === "" || /^\d{4}$/.test(v), "PIN must be 4 digits").optional().default(""),
});

type FormValues = z.infer<typeof formSchema>;

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwnerViewing?: boolean;
}

export function AddStaffDialog({ open, onOpenChange, isOwnerViewing = false }: AddStaffDialogProps) {
  const { createStaff } = useStaff();
  const { settings: salonSettings } = useSalonSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissions, setPermissions] = useState<StaffPermissionsData>(getRoleDefaults("stylist"));

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      role: "stylist",
      has_custom_markup: false,
      custom_markup_percent: salonSettings?.backbar_multiplier ?? 4,
      has_custom_bowl_fee: false,
      custom_bowl_fee: salonSettings?.bowl_fee ?? 2.5,
      pin: "",
    },
  });

  const hasCustomMarkup = form.watch("has_custom_markup");
  const hasCustomBowlFee = form.watch("has_custom_bowl_fee");

  const selectedRole = form.watch("role");

  useEffect(() => {
    setPermissions(getRoleDefaults(selectedRole as AppRole));
  }, [selectedRole, form]);

  useEffect(() => {
    if (open) {
      form.reset();
      setPermissions(getRoleDefaults("stylist"));
    }
  }, [open, form]);

  const subscription = useSubscription();

  const onSubmit = async (values: FormValues) => {
    if (!subscription.canAddStaff && subscription.maxStaff !== null) {
      toast.error(
        `Your ${subscription.planName ?? "current"} plan covers ${subscription.maxStaff} team member${subscription.maxStaff === 1 ? "" : "s"} and you have ${subscription.activeStaffCount}. Upgrade in Settings → Subscription to add more.`,
        { duration: 6000 },
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await createStaff.mutateAsync({
        name: values.name,
        email: null,
        phone: values.phone || null,
        role: values.role as AppRole,
        has_custom_markup: values.has_custom_markup,
        custom_markup_percent: values.has_custom_markup ? values.custom_markup_percent : 0,
        has_custom_bowl_fee: values.has_custom_bowl_fee,
        custom_bowl_fee: values.has_custom_bowl_fee ? values.custom_bowl_fee : 0,
        ...permissions,
      });

      if (result?.id && values.pin) {
        const { error: pinError } = await supabase.functions.invoke('manage-pin', {
          body: {
            staff_id: result.id,
            pin: values.pin,
            action: 'set',
          },
        });

        if (pinError) {
          console.error('Failed to set PIN:', pinError);
          toast.warning("Staff added but PIN could not be set. You can set it later.");
        }
      }

      toast.success("Staff member added successfully");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to add staff member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
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
                          <span className="text-xs text-muted-foreground">Create bowls and track color services</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="assistant">
                        <div className="flex flex-col items-start">
                          <span>Assistant</span>
                          <span className="text-xs text-muted-foreground">Support stylists, create bowls</span>
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

            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                    <FormLabel>Kiosk PIN (optional)</FormLabel>
                  </div>
                  <FormControl>
                    <InputOTP
                      maxLength={4}
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormDescription>
                    Leave blank (recommended) — they will choose their own PIN the first time they tap their name on the kiosk. Only they will know it.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isOwnerViewing && (
              <>
                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Pricing Overrides</h3>
                  </div>

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
                Control what this staff member can access and manage
              </p>
              <StaffPermissions
                permissions={permissions}
                onChange={setPermissions}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Staff"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
