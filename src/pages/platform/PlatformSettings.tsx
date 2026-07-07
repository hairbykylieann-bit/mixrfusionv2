import { PlatformLayout } from "@/components/platform/PlatformLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function PlatformSettings() {
  return (
    <PlatformLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Platform configuration and integration status.
          </p>
        </div>

        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
            <CardDescription>
              Monitor the status of external integrations and services.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stripe */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-[#635BFF] flex items-center justify-center text-white font-bold">
                  S
                </div>
                <div>
                  <h3 className="font-medium">Stripe</h3>
                  <p className="text-sm text-muted-foreground">
                    Payment processing and subscription management
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <Badge variant="outline">Not Connected</Badge>
              </div>
            </div>

            {/* Database */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold">
                  DB
                </div>
                <div>
                  <h3 className="font-medium">Database</h3>
                  <p className="text-sm text-muted-foreground">
                    PostgreSQL database via Supabase
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <Badge variant="default">Connected</Badge>
              </div>
            </div>

            {/* Edge Functions */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">
                  λ
                </div>
                <div>
                  <h3 className="font-medium">Edge Functions</h3>
                  <p className="text-sm text-muted-foreground">
                    Serverless functions for backend logic
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <Badge variant="default">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Configuration</CardTitle>
            <CardDescription>
              Configure payment processing and billing settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Mock Billing Mode</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Stripe integration is not yet configured. The platform is currently running
                    in mock billing mode. Subscription statuses can be managed manually, but no
                    real payments will be processed.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    To enable real billing, provide your Stripe API keys.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Stripe Secret Key
                </h4>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Not configured</span>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Stripe Webhook Secret
                </h4>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Not configured</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Info */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Information</CardTitle>
            <CardDescription>
              General information about the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Platform Name</h4>
                <p className="font-medium">MixR Fusion</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Version</h4>
                <p className="font-medium">1.0.0</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Environment</h4>
                <p className="font-medium">Production</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Multi-Tenancy</h4>
                <p className="font-medium">Enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformLayout>
  );
}
