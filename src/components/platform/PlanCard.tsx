import { Plan } from "@/hooks/platform/usePlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Check, X, Users, UserCheck } from "lucide-react";

interface PlanCardProps {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function PlanCard({ plan, onEdit, onDelete }: PlanCardProps) {
  const features = plan.features_json as Record<string, any>;

  const featuresList = [
    { key: "reports", label: "Reports & Analytics", enabled: features?.reports },
    { key: "ai_assistant", label: "AI Assistant (Mira)", enabled: features?.ai_assistant },
    { key: "whitelabel", label: "Whitelabel", enabled: features?.whitelabel },
    { key: "api_access", label: "API Access", enabled: features?.api_access },
  ];

  return (
    <Card className={plan.is_active ? "" : "opacity-60"}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            {plan.name}
            {!plan.is_active && (
              <Badge variant="outline" className="text-xs">
                Inactive
              </Badge>
            )}
          </CardTitle>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(plan)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(plan)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Pricing */}
          <div>
            <div className="text-3xl font-bold">
              {formatCurrency(plan.base_price_cents)}
              <span className="text-sm font-normal text-muted-foreground">/mo</span>
            </div>
            <div className="text-sm text-muted-foreground">
              + {formatCurrency(plan.seat_price_cents)} per seat/mo
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-3 w-3" />
                Max Staff
              </span>
              <span className="font-medium">
                {features?.max_staff ? features.max_staff : "Unlimited"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <UserCheck className="h-3 w-3" />
                Max Clients
              </span>
              <span className="font-medium">
                {features?.max_clients ? features.max_clients : "Unlimited"}
              </span>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-1 pt-2 border-t">
            {featuresList.map((feature) => (
              <div
                key={feature.key}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{feature.label}</span>
                {feature.enabled ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
