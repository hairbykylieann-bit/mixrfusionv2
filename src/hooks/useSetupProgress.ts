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
      id: "inventory",
      title: "Import Your Color Lines",
      description: "Pick your brands and check off the shades you stock",
      icon: Package,
      isComplete: hasProducts,
      route: "/inventory",
      actionText: "Import Lines",
    },
    {
      id: "settings",
      title: "Set Your Pricing",
      description: "Your markup and bowl fee — two numbers and you're done",
      icon: Settings,
      isComplete: hasReviewedSettings,
      route: "/settings",
      actionText: "Set Pricing",
    },
    {
      id: "staff",
      title: "Add Your Team",
      description: "Name and role — everyone picks their own PIN at the kiosk",
      icon: UserCog,
      isComplete: hasStaff,
      route: "/staff",
      actionText: "Add Staff",
    },
    {
      id: "clients",
      title: "Bring In Your Clients",
      description: "Import from a spreadsheet, or add them as they come in",
      icon: Users,
      isComplete: hasClients,
      route: "/clients",
      actionText: "Add Clients",
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
