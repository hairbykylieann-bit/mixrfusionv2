import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { usePlatformAdmin } from "@/hooks/platform/usePlatformAdmin";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboardingStatus();
  const { isPlatformAdmin, isLoading: platformLoading } = usePlatformAdmin();
  const location = useLocation();

  // Show loader while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If not logged in, redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // HARD WALL: platform-admin accounts live in the HQ portal, never the salon
  // app. (Kylie runs HQ with her admin login; any salon testing uses a
  // separate salon-owner account.) Without this, an HQ account with no salon
  // was pushed into salon onboarding and asked to create one.
  if (platformLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isPlatformAdmin) {
    return <Navigate to="/platform" replace />;
  }

  // Show loader while checking onboarding status
  if (onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If onboarding is needed and we're not already on the onboarding page
  if (needsOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
