import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useErrorLogs, useErrorLogsCount } from "@/hooks/platform/useErrorLogs";
import { useTenants } from "@/hooks/platform/useTenants";
import { formatDistanceToNow, format } from "date-fns";
import { 
  AlertCircle, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Building2,
  List,
  LayoutGrid
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 50;

interface GroupedErrors {
  [tenantId: string]: {
    tenantName: string;
    errors: ErrorLogItemData[];
    count: number;
  };
}

interface ErrorLogItemData {
  id: string;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
  tenant_id: string | null;
  tenant_name?: string | null;
}

export function ErrorLogViewer() {
  const [page, setPage] = useState(0);
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grouped">("grouped");

  const tenantFilter = selectedTenant === "all" ? undefined : selectedTenant;

  const { data: errorLogs, isLoading } = useErrorLogs({
    tenantId: tenantFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: errorCount } = useErrorLogsCount(tenantFilter);
  const { tenants } = useTenants();

  // Filter logs by search term
  const filteredLogs = useMemo(() => {
    if (!errorLogs) return [];
    if (!searchTerm) return errorLogs;
    
    const term = searchTerm.toLowerCase();
    return errorLogs.filter(
      (log) =>
        log.error_message.toLowerCase().includes(term) ||
        log.url?.toLowerCase().includes(term) ||
        log.tenant_name?.toLowerCase().includes(term)
    );
  }, [errorLogs, searchTerm]);

  // Group errors by tenant
  const groupedErrors = useMemo((): GroupedErrors => {
    const groups: GroupedErrors = {};
    
    filteredLogs.forEach((log) => {
      const tenantId = log.tenant_id || "unknown";
      const tenantName = log.tenant_name || "Unknown Tenant";
      
      if (!groups[tenantId]) {
        groups[tenantId] = {
          tenantName,
          errors: [],
          count: 0,
        };
      }
      
      groups[tenantId].errors.push(log);
      groups[tenantId].count += 1;
    });
    
    return groups;
  }, [filteredLogs]);

  // Sort grouped entries by error count (descending)
  const sortedGroups = useMemo(() => {
    return Object.entries(groupedErrors).sort((a, b) => b[1].count - a[1].count);
  }, [groupedErrors]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search errors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedTenant} onValueChange={(v) => { setSelectedTenant(v); setPage(0); }}>
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
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grouped" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grouped")}
            className="rounded-r-none"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{errorCount || 0}</div>
            <p className="text-xs text-muted-foreground">Total Errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{Object.keys(groupedErrors).length}</div>
            <p className="text-xs text-muted-foreground">Affected Tenants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {filteredLogs.filter(l => {
                const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
                return new Date(l.created_at) > hourAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Last Hour</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {filteredLogs.filter(l => {
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return new Date(l.created_at) > dayAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 Hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle>Error Reports</CardTitle>
          <CardDescription>
            Frontend crashes and errors reported by the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No error logs found.</p>
              {searchTerm && <p className="text-sm">Try adjusting your search.</p>}
            </div>
          ) : viewMode === "grouped" ? (
            <div className="space-y-6">
              {sortedGroups.map(([tenantId, group]) => (
                <TenantErrorGroup
                  key={tenantId}
                  tenantId={tenantId}
                  tenantName={group.tenantName}
                  errors={group.errors}
                  count={group.count}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <ErrorLogItem key={log.id} log={log} showTenant />
              ))}
            </div>
          )}

          {/* Pagination */}
          {(errorCount || 0) > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {page * PAGE_SIZE + 1} to{" "}
                {Math.min((page + 1) * PAGE_SIZE, errorCount || 0)} of{" "}
                {errorCount} entries
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= (errorCount || 0)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface TenantErrorGroupProps {
  tenantId: string;
  tenantName: string;
  errors: ErrorLogItemData[];
  count: number;
}

function TenantErrorGroup({ tenantId, tenantName, errors, count }: TenantErrorGroupProps) {
  const [isOpen, setIsOpen] = useState(count <= 3);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{tenantName}</p>
                  <p className="text-xs text-muted-foreground">
                    {count} error{count !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={count > 10 ? "destructive" : count > 3 ? "secondary" : "outline"}>
                  {count}
                </Badge>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4 space-y-3">
            {errors.map((log) => (
              <ErrorLogItem key={log.id} log={log} showTenant={false} />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface ErrorLogItemProps {
  log: ErrorLogItemData;
  showTenant?: boolean;
}

function ErrorLogItem({ log, showTenant = true }: ErrorLogItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border p-4 bg-card">
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
                  {showTenant && log.tenant_name && (
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
                className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${
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
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {log.error_stack}
                </pre>
              </div>
            )}
            {log.component_stack && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Component Stack
                </p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
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
