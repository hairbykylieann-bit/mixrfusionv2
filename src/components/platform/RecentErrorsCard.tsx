import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentErrors } from "@/hooks/platform/useErrorLogs";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, ArrowRight } from "lucide-react";

export function RecentErrorsCard() {
  const { data: errors, isLoading } = useRecentErrors(5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium">Recent Errors</CardTitle>
        <Link to="/platform/logs">
          <Button variant="ghost" size="sm" className="gap-1">
            View all
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : errors?.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No errors reported</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {errors?.map((error) => (
              <div
                key={error.id}
                className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {error.error_message}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(error.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {error.tenant_name && (
                      <Badge variant="outline" className="text-xs py-0">
                        {error.tenant_name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
