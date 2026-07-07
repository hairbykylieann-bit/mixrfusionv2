import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSalonSettings } from "@/hooks/useSalonSettings";

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: { id: string; name: string; email?: string; phone?: string; preferences?: string } | null;
  onSubmit: (id: string, updates: { name: string; email?: string | null; phone?: string | null; preferences?: string | null }) => Promise<void>;
}

export function EditClientDialog({ open, onOpenChange, client, onSubmit }: EditClientDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { settings } = useSalonSettings();

  const requireEmail = settings?.require_client_email ?? false;
  const requirePhone = settings?.require_client_phone ?? false;

  const clientSchema = useMemo(() => {
    return z.object({
      name: z.string().min(1, "Name is required").max(100),
      email: requireEmail
        ? z.string().email("Invalid email").min(1, "Email is required").max(255)
        : z.string().email("Invalid email").max(255).optional().or(z.literal("")),
      phone: requirePhone
        ? z.string().min(1, "Phone is required").max(50)
        : z.string().max(50).optional().or(z.literal("")),
      preferences: z.string().max(1000).optional().or(z.literal("")),
    });
  }, [requireEmail, requirePhone]);

  type ClientFormData = z.infer<typeof clientSchema>;

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      preferences: "",
    },
  });

  useEffect(() => {
    if (open && client) {
      form.reset({
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        preferences: client.preferences || "",
      });
    }
  }, [open, client, form]);

  const handleSubmit = async (data: ClientFormData) => {
    if (!client) return;
    setIsSubmitting(true);
    try {
      await onSubmit(client.id, {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        preferences: data.preferences || null,
      });
      onOpenChange(false);
      toast.success("Client updated successfully");
    } catch (error) {
      toast.error("Failed to update client");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit Client
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email{requireEmail ? " *" : ""}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
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
                  <FormLabel>Phone{requirePhone ? " *" : ""}</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes & Preferences</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hair type, color history, sensitivities..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
