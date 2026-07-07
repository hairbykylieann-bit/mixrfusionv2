import { useClients } from "./useClients";
import { useProducts } from "./useProducts";
import { useStaff } from "./useStaff";
import { useSalonSettings } from "./useSalonSettings";
import { Users, Package, UserCog, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  isComplete: boolean;
  route: string;
  actionText: string;
}

export function useSetupProgress() {
  const { clients, isLoading: clientsLoading } = useClients();
  const { products, isLoading: productsLoading } = useProducts();
  const { staff, isLoading: staffLoading } = useStaff();
  const { settings, isLoading: settingsLoading } = useSalonSettings();

  const isLoading = clientsLoading || productsLoading || staffLoading || settingsLoading;

  // Check if setup wizard should be shown
  const isSetupComplete = settings?.setup_completed_at !== null && settings?.setup_completed_at !== undefined;

  // Calculate step completion
  const hasStaff = (staff?.length ?? 0) > 1; // More than just the owner
  const hasProducts = (products?.length ?? 0) > 0;
  const hasClients = (clients?.length ?? 0) > 0;
  const hasReviewedSettings = settings?.salon_name !== null && settings?.salon_name !== undefined;

  const steps: SetupStep[] = [
    {
      id: "staff",
      title: "Add Your Team",
      description: "Invite stylists and assistants to your salon",
      icon: UserCog,
      isComplete: hasStaff,
      route: "/staff",
      actionText: "Add Staff",
    },
    {
      id: "inventory",
      title: "Stock Your Inventory",
      description: "Add color products, developers, and treatments",
      icon: Package,
      isComplete: hasProducts,
      route: "/inventory",
      actionText: "Add Products",
    },
    {
      id: "clients",
      title: "Import Your Clients",
      description: "Add existing clients or import from a spreadsheet",
      icon: Users,
      isComplete: hasClients,
      route: "/clients",
      actionText: "Add Clients",
    },
    {
      id: "settings",
      title: "Review Settings",
      description: "Configure pricing, fees, and preferences",
      icon: Settings,
      isComplete: hasReviewedSettings,
      route: "/settings",
      actionText: "Configure",
    },
  ];

  const completedSteps = steps.filter((s) => s.isComplete).length;
  const totalSteps = steps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  const allStepsComplete = completedSteps === totalSteps;

  return {
    steps,
    completedSteps,
    totalSteps,
    progressPercent,
    allStepsComplete,
    isSetupComplete,
    isLoading,
  };
}
