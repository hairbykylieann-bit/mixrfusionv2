import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePlatformAdmin } from "@/hooks/platform/usePlatformAdmin";
import { Loader2 } from "lucide-react";

interface PlatformProtectedRouteProps {
  children: ReactNode;
}

export function PlatformProtectedRoute({ children }: PlatformProtectedRouteProps) {
  const { isPlatformAdmin, isLoading, user } = usePlatformAdmin();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
