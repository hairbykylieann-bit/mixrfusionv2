import { useState } from "react";
import { PlatformLayout } from "@/components/platform/PlatformLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useErrorLogs, useErrorLogsCount } from "@/hooks/platform/useErrorLogs";
import { useAuditLogs, useAuditLogsCount } from "@/hooks/platform/useAuditLogs";
import { useTenants } from "@/hooks/platform/useTenants";
import { formatDistanceToNow, format } from "date-fns";
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";

const PAGE_SIZE = 50;

export default function PlatformLogs() {
  const [errorPage, setErrorPage] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const tenantFilter = selectedTenant === "all" ? undefined : selectedTenant;

  const { data: errorLogs, isLoading: errorLoading } = useErrorLogs({
    tenantId: tenantFilter,
    limit: PAGE_SIZE,
    offset: errorPage * PAGE_SIZE,
  });

  const { data: errorCount } = useErrorLogsCount(tenantFilter);

  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs({
    tenantId: tenantFilter,
    limit: PAGE_SIZE,
    offset: auditPage * PAGE_SIZE,
  });

  const { data: auditCount } = useAuditLogsCount(tenantFilter);

  const { tenants } = useTenants();

  const filteredErrorLogs = errorLogs?.filter(
    (log) =>
      !searchTerm ||
      log.error_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.url?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAuditLogs = auditLogs?.filter(
    (log) =>
      !searchTerm ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PlatformLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
          <p className="text-muted-foreground">
            View error reports and audit trail across all tenants.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedTenant} onValueChange={setSelectedTenant}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by tenant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {tenants?.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="errors">
          <TabsList>
            <TabsTrigger value="errors" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Error Logs
              {errorCount ? (
                <Badge variant="secondary" className="ml-1">
                  {errorCount}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="h-4 w-4" />
              Audit Logs
              {auditCount ? (
                <Badge variant="secondary" className="ml-1">
                  {auditCount}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {/* Error Logs Tab */}
          <TabsContent value="errors" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Reports</CardTitle>
                <CardDescription>
                  Frontend crashes and errors reported by the application.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {errorLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : filteredErrorLogs?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No error logs found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredErrorLogs?.map((log) => (
                      <ErrorLogItem key={log.id} log={log} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {(errorCount || 0) > PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {errorPage * PAGE_SIZE + 1} to{" "}
                      {Math.min((errorPage + 1) * PAGE_SIZE, errorCount || 0)} of{" "}
                      {errorCount} entries
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setErrorPage((p) => Math.max(0, p - 1))}
                        disabled={errorPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setErrorPage((p) => p + 1)}
                        disabled={(errorPage + 1) * PAGE_SIZE >= (errorCount || 0)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>
                  Admin actions and important events across the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : filteredAuditLogs?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No audit logs found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAuditLogs?.map((log) => (
                      <AuditLogItem key={log.id} log={log} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {(auditCount || 0) > PAGE_SIZE && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing {auditPage * PAGE_SIZE + 1} to{" "}
                      {Math.min((auditPage + 1) * PAGE_SIZE, auditCount || 0)} of{" "}
                      {auditCount} entries
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
                        disabled={auditPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPage((p) => p + 1)}
                        disabled={(auditPage + 1) * PAGE_SIZE >= (auditCount || 0)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PlatformLayout>
  );
}

interface ErrorLogItemProps {
  log: {
    id: string;
    error_message: string;
    error_stack: string | null;
    component_stack: string | null;
    url: string | null;
    user_agent: string | null;
    created_at: string;
    tenant_name?: string | null;
  };
}

function ErrorLogItem({ log }: ErrorLogItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border p-4">
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <span className="font-medium text-sm truncate">
                    {log.error_message}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </span>
                  {log.tenant_name && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        {log.tenant_name}
                      </Badge>
                    </>
                  )}
                  {log.url && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[200px]">{log.url}</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4 space-y-4 border-t pt-4">
            {log.error_stack && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Stack Trace
                </p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
                  {log.error_stack}
                </pre>
              </div>
            )}
            {log.component_stack && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Component Stack
                </p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap">
                  {log.component_stack}
                </pre>
              </div>
            )}
            {log.user_agent && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  User Agent
                </p>
                <p className="text-xs text-muted-foreground">{log.user_agent}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Timestamp
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), "PPpp")}
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface AuditLogItemProps {
  log: {
    id: string;
    action: string;
    actor_type: "platform_admin" | "tenant_user";
    actor_email?: string | null;
    tenant_name?: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  };
}

function AuditLogItem({ log }: AuditLogItemProps) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm">{log.action}</span>
            <Badge
              variant={log.actor_type === "platform_admin" ? "default" : "secondary"}
              className="text-xs"
            >
              {log.actor_type === "platform_admin" ? "Admin" : "User"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </span>
            {log.actor_email && (
              <>
                <span>•</span>
                <span>{log.actor_email}</span>
              </>
            )}
            {log.tenant_name && (
              <>
                <span>•</span>
                <Badge variant="outline" className="text-xs">
                  {log.tenant_name}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>
      {log.metadata && Object.keys(log.metadata).length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Metadata
          </p>
          <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
