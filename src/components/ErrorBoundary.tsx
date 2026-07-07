import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Application error:", error, errorInfo);
    this.logErrorToBackend(error, errorInfo);
  }

  private async logErrorToBackend(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn("Supabase credentials not available for error logging");
        return;
      }

      // Try to get auth token from localStorage
      const storageKey = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;
      const authData = localStorage.getItem(storageKey);
      let authHeader = "";

      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed?.access_token) {
            authHeader = `Bearer ${parsed.access_token}`;
          }
        } catch {
          // Ignore parse errors
        }
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      };

      if (authHeader) {
        headers["Authorization"] = authHeader;
      }

      await fetch(`${supabaseUrl}/functions/v1/log-error`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          error_message: error.message,
          error_stack: error.stack,
          component_stack: errorInfo.componentStack,
          url: window.location.href,
          user_agent: navigator.userAgent,
          metadata: {
            timestamp: new Date().toISOString(),
            errorName: error.name,
          },
        }),
      });
    } catch (logError) {
      // Don't throw if logging fails - we don't want to crash the error boundary
      console.error("Failed to log error to backend:", logError);
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error Icon */}
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                We've encountered an unexpected error. Our team has been notified
                and is working to fix it.
              </p>
            </div>

            {/* Error Details (development only) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-muted/50 rounded-lg p-4 text-left overflow-auto max-h-32">
                <p className="text-xs font-mono text-destructive">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Reload Button */}
            <Button
              onClick={this.handleReload}
              size="lg"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload App
            </Button>

            {/* Support Link */}
            <p className="text-sm text-muted-foreground">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
