import { motion } from "framer-motion";
import { 
  Loader2,
  Users,
  Monitor,
  ShieldAlert,
  Palette,
  Droplets,
  Scissors,
  CircleDot,
} from "lucide-react";

import { Header } from "@/components/layout/Header";
import { PageLayout } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useEffectiveStaff } from "@/hooks/useEffectiveStaff";
import { ClientImportCard } from "@/components/clients/ClientImportCard";
import { ClientRequirementsCard } from "@/components/settings/ClientRequirementsCard";

import { KioskSettingsCard } from "@/components/settings/KioskSettingsCard";

import { SalonBrandingCard } from "@/components/settings/SalonBrandingCard";
import { PreferredDevelopersCard } from "@/components/settings/PreferredDevelopersCard";
import { ServiceMenuCard } from "@/components/settings/ServiceMenuCard";
import { PricingModelCard } from "@/components/settings/PricingModelCard";
import { BillingCard } from "@/components/settings/BillingCard";
import { DisplayUnitCard } from "@/components/settings/DisplayUnitCard";
import { BowlsCard } from "@/components/settings/BowlsCard";



function AccessDenied() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageLayout
        title="Settings"
        subtitle="Configure your salon preferences"
      >
        <motion.div
          className="stat-card flex flex-col items-center justify-center py-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-center max-w-md">
            You don't have permission to access settings. 
            Please contact your salon owner or manager if you need access.
          </p>
        </motion.div>
      </PageLayout>
    </div>
  );
}

export default function Settings() {
  const { effectiveStaff, isLoading: staffLoading } = useEffectiveStaff();

  // Show loading while checking permissions
  if (staffLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PageLayout title="Settings" subtitle="Configure your salon preferences">
          <motion.div
            className="stat-card flex items-center justify-center h-64"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading...</span>
            </div>
          </motion.div>
        </PageLayout>
      </div>
    );
  }

  // Check permission
  if (!effectiveStaff?.permissions.can_manage_settings) {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <PageLayout
        title="Settings"
        subtitle="Configure your salon preferences"
      >
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="bg-secondary mb-6">
            <TabsTrigger value="branding">
              <Palette className="w-4 h-4 mr-1.5" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="formulas">
              <Droplets className="w-4 h-4 mr-1.5" />
              Formulas
            </TabsTrigger>
            
            <TabsTrigger value="clients">
              <Users className="w-4 h-4 mr-1.5" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="kiosk">
              <Monitor className="w-4 h-4 mr-1.5" />
              Kiosk
            </TabsTrigger>
            <TabsTrigger value="services">
              <Scissors className="w-4 h-4 mr-1.5" />
              Services
            </TabsTrigger>
            <TabsTrigger value="bowls">
              <CircleDot className="w-4 h-4 mr-1.5" />
              Bowls
            </TabsTrigger>
          </TabsList>


          <TabsContent value="branding">
            <BillingCard />
            <SalonBrandingCard />
          </TabsContent>
          
          <TabsContent value="pricing">
            <PricingModelCard />
          </TabsContent>

          <TabsContent value="formulas">
            <div className="space-y-6">
              <DisplayUnitCard />
              <PreferredDevelopersCard />
            </div>
          </TabsContent>
          
          
          <TabsContent value="clients">
            <div className="space-y-6">
              <ClientRequirementsCard />
              <ClientImportCard />
            </div>
          </TabsContent>

          <TabsContent value="kiosk">
            <KioskSettingsCard />
          </TabsContent>

          <TabsContent value="services">
            <ServiceMenuCard />
          </TabsContent>

          <TabsContent value="bowls">
            <BowlsCard />
          </TabsContent>



        </Tabs>
      </PageLayout>
    </div>
  );
}
