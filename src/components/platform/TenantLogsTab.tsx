import { useState } from "react";
import { useErrorLogs } from "@/hooks/platform/useErrorLogs";
import { useAuditLogs } from "@/hooks/platform/useAuditLogs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface TenantLogsTabProps {
  tenantId: string;
}

export function TenantLogsTab({ tenantId }: TenantLogsTabProps) {
  const [logType, setLogType] = useState<"errors" | "audit">("errors");

  const { data: errorLogs, isLoading: isLoadingErrors } = useErrorLogs({
    tenantId,
    limit: 50,
  });

  const { data: auditLogs, isLoading: isLoadingAudit } = useAuditLogs({
    tenantId,
    limit: 50,
  });

  const isLoading = logType === "errors" ? isLoadingErrors : isLoadingAudit;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              Error Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errorLogs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Recent errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Recent actions</p>
          </CardContent>
        </Card>
      </div>

      {/* Log Tables */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>Recent errors and audit trail for this tenant</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={logType} onValueChange={(v) => setLogType(v as "errors" | "audit")}>
            <TabsList>
              <TabsTrigger value="errors" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Errors ({errorLogs?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <FileText className="h-4 w-4" />
                Audit ({auditLogs?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="errors" className="mt-4">
              {isLoadingErrors ? (
                <Skeleton className="h-[200px]" />
              ) : errorLogs && errorLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Error Message</TableHead>
                      <TableHead>URL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(log.created_at || ""), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          <p className="font-mono text-sm text-destructive max-w-md truncate">
                            {log.error_message}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {log.url || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No errors logged for this tenant.
                </p>
              )}
            </TabsContent>

            <TabsContent value="audit" className="mt-4">
              {isLoadingAudit ? (
                <Skeleton className="h-[200px]" />
              ) : auditLogs && auditLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Actor Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(log.created_at), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={log.actor_type === "platform_admin" ? "default" : "secondary"}
                          >
                            {log.actor_type === "platform_admin" ? "Platform Admin" : "Tenant User"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No audit logs recorded for this tenant.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
