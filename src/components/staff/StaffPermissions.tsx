import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Palette, Users, Building2, Eye, UserCog } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface StaffPermissionsData {
  can_create_bowls: boolean;
  can_view_basic_client_info: boolean;
  can_view_all_clients: boolean;
  can_manage_clients: boolean;
  can_manage_own_clients: boolean;
  can_manage_products: boolean;
  can_view_product_costs: boolean;
  can_view_reports: boolean;
  can_manage_staff: boolean;
  can_manage_settings: boolean;
  can_edit_formulas: boolean;
  can_view_own_reports: boolean;
  can_delete_sessions: boolean;
}

interface StaffPermissionsProps {
  permissions: StaffPermissionsData;
  onChange: (permissions: StaffPermissionsData) => void;
  disabled?: boolean;
}

export const getRoleDefaults = (role: AppRole): StaffPermissionsData => {
  const defaults: Record<AppRole, StaffPermissionsData> = {
    owner: {
      can_create_bowls: true,
      can_view_basic_client_info: true,
      can_view_all_clients: true,
      can_manage_clients: true,
      can_manage_own_clients: true,
      can_manage_products: true,
      can_view_product_costs: true,
      can_view_reports: true,
      can_manage_staff: true,
      can_manage_settings: true,
      can_edit_formulas: true,
      can_view_own_reports: true,
      can_delete_sessions: true,
    },
    admin: {
      can_create_bowls: true,
      can_view_basic_client_info: true,
      can_view_all_clients: true,
      can_manage_clients: true,
      can_manage_own_clients: true,
      can_manage_products: true,
      can_view_product_costs: true,
      can_view_reports: true,
      can_manage_staff: true,
      can_manage_settings: true,
      can_edit_formulas: true,
      can_view_own_reports: true,
      can_delete_sessions: true,
    },
    manager: {
      can_create_bowls: true,
      can_view_basic_client_info: true,
      can_view_all_clients: true,
      can_manage_clients: true,
      can_manage_own_clients: true,
      can_manage_products: true,
      can_view_product_costs: true,
      can_view_reports: true,
      can_manage_staff: true,
      can_manage_settings: false,
      can_edit_formulas: true,
      can_view_own_reports: true,
      can_delete_sessions: true,
    },
    stylist: {
      can_create_bowls: true,
      can_view_basic_client_info: true,
      can_view_all_clients: false,
      can_manage_clients: false,
      can_manage_own_clients: true,
      can_manage_products: false,
      can_view_product_costs: false,
      can_view_reports: false,
      can_manage_staff: false,
      can_manage_settings: false,
      can_edit_formulas: false,
      can_view_own_reports: true,
      can_delete_sessions: false,
    },
    assistant: {
      can_create_bowls: true,
      can_view_basic_client_info: true,
      can_view_all_clients: false,
      can_manage_clients: false,
      can_manage_own_clients: false,
      can_manage_products: false,
      can_view_product_costs: false,
      can_view_reports: false,
      can_manage_staff: false,
      can_manage_settings: false,
      can_edit_formulas: false,
      can_view_own_reports: false,
      can_delete_sessions: false,
    },
    front_desk: {
      can_create_bowls: false,
      can_view_basic_client_info: true,
      can_view_all_clients: true,
      can_manage_clients: true,
      can_manage_own_clients: true,
      can_manage_products: false,
      can_view_product_costs: false,
      can_view_reports: false,
      can_manage_staff: false,
      can_manage_settings: false,
      can_edit_formulas: false,
      can_view_own_reports: false,
      can_delete_sessions: false,
    },
  };

  return defaults[role];
};

const getClientVisibility = (permissions: StaffPermissionsData): "all" | "own" => {
  return permissions.can_view_all_clients ? "all" : "own";
};

const getClientManagement = (permissions: StaffPermissionsData): "all" | "own" | "none" => {
  if (permissions.can_manage_clients) return "all";
  if (permissions.can_manage_own_clients) return "own";
  return "none";
};

export function StaffPermissions({ permissions, onChange, disabled }: StaffPermissionsProps) {
  const handleToggle = (key: keyof StaffPermissionsData) => {
    const newValue = !permissions[key];

    if (key === "can_view_basic_client_info" && !newValue) {
      onChange({
        ...permissions,
        can_view_basic_client_info: false,
        can_manage_clients: false,
        can_manage_own_clients: false,
      });
      return;
    }

    onChange({
      ...permissions,
      [key]: newValue,
    });
  };

  const handleClientVisibilityChange = (value: "all" | "own") => {
    const newPerms = {
      ...permissions,
      can_view_all_clients: value === "all",
    };

    if (value === "own" && permissions.can_manage_clients) {
      newPerms.can_manage_clients = false;
      newPerms.can_manage_own_clients = true;
    }

    onChange(newPerms);
  };

  const handleClientManagementChange = (value: "all" | "own" | "none") => {
    const needsContactInfo = value === "all" || value === "own";
    onChange({
      ...permissions,
      can_manage_clients: value === "all",
      can_manage_own_clients: value === "all" || value === "own",
      ...(needsContactInfo && { can_view_basic_client_info: true }),
    });
  };

  const canManageClientsDisabled = !permissions.can_view_basic_client_info;

  return (
    <div className="space-y-5">
      {/* Color Services */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <Palette className="w-3.5 h-3.5" />
          Color Services
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
            <div className="space-y-0.5">
              <Label htmlFor="can_create_bowls" className="text-sm font-medium cursor-pointer">
                Create color bowls
              </Label>
              <p className="text-xs text-muted-foreground">Mix and track color formulas</p>
            </div>
            <Switch
              id="can_create_bowls"
              checked={permissions.can_create_bowls}
              onCheckedChange={() => handleToggle("can_create_bowls")}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
            <div className="space-y-0.5">
              <Label htmlFor="can_delete_sessions" className="text-sm font-medium cursor-pointer">
                Delete color sessions
              </Label>
              <p className="text-xs text-muted-foreground">Remove sessions and return their product to inventory</p>
            </div>
            <Switch
              id="can_delete_sessions"
              checked={permissions.can_delete_sessions}
              onCheckedChange={() => handleToggle("can_delete_sessions")}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Client Access */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <Users className="w-3.5 h-3.5" />
          Client Access
        </div>

        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
          <div className="space-y-0.5">
            <Label htmlFor="can_view_basic_client_info" className="text-sm font-medium cursor-pointer">
              See client contact info
            </Label>
            <p className="text-xs text-muted-foreground">Phone numbers and emails</p>
          </div>
          <Switch
            id="can_view_basic_client_info"
            checked={permissions.can_view_basic_client_info}
            onCheckedChange={() => handleToggle("can_view_basic_client_info")}
            disabled={disabled}
          />
        </div>

        <div className="py-3 px-3 rounded-lg bg-muted/50 space-y-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Which clients can they see?</Label>
          </div>
          <RadioGroup
            value={getClientVisibility(permissions)}
            onValueChange={(v) => handleClientVisibilityChange(v as "all" | "own")}
            disabled={disabled}
            className="space-y-2 pl-1"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="all" id="visibility-all" />
              <Label htmlFor="visibility-all" className="text-sm font-normal cursor-pointer">
                All clients
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="own" id="visibility-own" />
              <Label htmlFor="visibility-own" className="text-sm font-normal cursor-pointer">
                Only clients they've worked with
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className={`py-3 px-3 rounded-lg space-y-3 ${canManageClientsDisabled ? 'bg-muted/30' : 'bg-muted/50'}`}>
          <div className="flex items-center gap-2">
            <UserCog className={`w-4 h-4 ${canManageClientsDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} />
            <Label className={`text-sm font-medium ${canManageClientsDisabled ? 'text-muted-foreground/50' : ''}`}>
              Which clients can they manage?
            </Label>
          </div>
          {canManageClientsDisabled && (
            <p className="text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 px-2 py-1.5 rounded">
              Requires "See client contact info" permission to manage clients
            </p>
          )}
          <RadioGroup
            value={canManageClientsDisabled ? "none" : getClientManagement(permissions)}
            onValueChange={(v) => handleClientManagementChange(v as "all" | "own" | "none")}
            disabled={disabled || canManageClientsDisabled}
            className="space-y-2 pl-1"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem
                value="all"
                id="manage-all"
                disabled={canManageClientsDisabled || !permissions.can_view_all_clients}
              />
              <div className="flex flex-col">
                <Label
                  htmlFor="manage-all"
                  className={`text-sm font-normal cursor-pointer ${
                    canManageClientsDisabled || !permissions.can_view_all_clients
                      ? 'text-muted-foreground/50'
                      : ''
                  }`}
                >
                  All clients (add, edit, delete)
                </Label>
                {!permissions.can_view_all_clients && !canManageClientsDisabled && (
                  <span className="text-xs text-muted-foreground/60">
                    Requires "All clients" visibility
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="own" id="manage-own" disabled={canManageClientsDisabled} />
              <Label htmlFor="manage-own" className={`text-sm font-normal cursor-pointer ${canManageClientsDisabled ? 'text-muted-foreground/50' : ''}`}>
                Only their clients (edit only)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="none" id="manage-none" />
              <Label htmlFor="manage-none" className={`text-sm font-normal cursor-pointer ${canManageClientsDisabled ? 'text-muted-foreground/50' : ''}`}>
                None
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
          <div className="space-y-0.5">
            <Label htmlFor="can_edit_formulas" className="text-sm font-medium cursor-pointer">
              Edit past formulas
            </Label>
            <p className="text-xs text-muted-foreground">Edit notes or delete past color sessions</p>
          </div>
          <Switch
            id="can_edit_formulas"
            checked={permissions.can_edit_formulas}
            onCheckedChange={() => handleToggle("can_edit_formulas")}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Business Access */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <Building2 className="w-3.5 h-3.5" />
          Business Access
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
            <div className="space-y-0.5">
              <Label htmlFor="can_manage_products" className="text-sm font-medium cursor-pointer">
                View & manage inventory
              </Label>
              <p className="text-xs text-muted-foreground">Products and stock levels</p>
            </div>
            <Switch
              id="can_manage_products"
              checked={permissions.can_manage_products}
              onCheckedChange={() => handleToggle("can_manage_products")}
              disabled={disabled}
            />
          </div>

          {permissions.can_manage_products && (
            <div className="flex items-center justify-between py-2 px-3 ml-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border-l-2 border-muted-foreground/20">
              <div className="space-y-0.5">
                <Label htmlFor="can_view_product_costs" className="text-sm font-medium cursor-pointer">
                  See product costs
                </Label>
                <p className="text-xs text-muted-foreground">Cost per unit and pricing info</p>
              </div>
              <Switch
                id="can_view_product_costs"
                checked={permissions.can_view_product_costs}
                onCheckedChange={() => handleToggle("can_view_product_costs")}
                disabled={disabled}
              />
            </div>
          )}

          {[
            { key: "can_view_own_reports", label: "View own performance", description: "Their own usage and waste stats only — no salon revenue, no other stylists" },
            { key: "can_view_reports", label: "View all reports", description: "Salon-wide sales, profit, and every stylist's numbers" },
            { key: "can_manage_staff", label: "Manage staff", description: "Add, edit team members" },
            { key: "can_manage_settings", label: "Manage settings", description: "Salon configuration" },
          ].map((permission) => (
            <div
              key={permission.key}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
            >
              <div className="space-y-0.5">
                <Label
                  htmlFor={permission.key}
                  className="text-sm font-medium cursor-pointer"
                >
                  {permission.label}
                </Label>
                <p className="text-xs text-muted-foreground">{permission.description}</p>
              </div>
              <Switch
                id={permission.key}
                checked={permissions[permission.key as keyof StaffPermissionsData] as boolean}
                onCheckedChange={() => handleToggle(permission.key as keyof StaffPermissionsData)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
