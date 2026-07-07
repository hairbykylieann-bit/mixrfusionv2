import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { MiraProvider } from "@/contexts/MiraContext";
import { KioskProvider } from "@/contexts/KioskContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PlatformProtectedRoute } from "@/components/platform/PlatformProtectedRoute";
import { MiraGlobalSheet } from "@/components/mira/MiraGlobalSheet";
import { KioskLockScreen } from "@/components/kiosk/KioskLockScreen";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Inventory from "./pages/Inventory";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import NewBowl from "./pages/NewBowl";
import Staff from "./pages/Staff";
import StaffReport from "./pages/StaffReport";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Join from "./pages/Join";
import NotFound from "./pages/NotFound";

// Platform Admin Pages
import PlatformDashboard from "./pages/platform/PlatformDashboard";
import PlatformTenants from "./pages/platform/PlatformTenants";
import PlatformTenantDetail from "./pages/platform/PlatformTenantDetail";
import PlatformPlans from "./pages/platform/PlatformPlans";
import PlatformSettings from "./pages/platform/PlatformSettings";
import PlatformLogs from "./pages/platform/PlatformLogs";
import PlatformCatalogs from "./pages/platform/PlatformCatalogs";
import PlatformCatalogDetail from "./pages/platform/PlatformCatalogDetail";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <TenantProvider>
              <MiraProvider>
                <KioskProvider>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/welcome" element={<Auth />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/join/:shortCode" element={<Join />} />
                    
                    {/* Onboarding route (protected but special) */}
                    <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                    
                    {/* Protected salon routes */}
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                    <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                    <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                    <Route path="/new-bowl" element={<ProtectedRoute><NewBowl /></ProtectedRoute>} />
                    <Route path="/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
                    <Route path="/staff/:staffId/reports" element={<ProtectedRoute><StaffReport /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    
                    {/* Platform Admin routes */}
                    <Route path="/platform" element={<PlatformProtectedRoute><PlatformDashboard /></PlatformProtectedRoute>} />
                    <Route path="/platform/tenants" element={<PlatformProtectedRoute><PlatformTenants /></PlatformProtectedRoute>} />
                    <Route path="/platform/tenants/:tenantId" element={<PlatformProtectedRoute><PlatformTenantDetail /></PlatformProtectedRoute>} />
                    <Route path="/platform/catalogs" element={<PlatformProtectedRoute><PlatformCatalogs /></PlatformProtectedRoute>} />
                    <Route path="/platform/catalogs/:catalogId" element={<PlatformProtectedRoute><PlatformCatalogDetail /></PlatformProtectedRoute>} />
                    <Route path="/platform/plans" element={<PlatformProtectedRoute><PlatformPlans /></PlatformProtectedRoute>} />
                    <Route path="/platform/settings" element={<PlatformProtectedRoute><PlatformSettings /></PlatformProtectedRoute>} />
                    <Route path="/platform/logs" element={<PlatformProtectedRoute><PlatformLogs /></PlatformProtectedRoute>} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <MiraGlobalSheet />
                  <KioskLockScreen />
                </KioskProvider>
              </MiraProvider>
            </TenantProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
