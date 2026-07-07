import { useMemo, useState, Fragment } from "react";
import { format, parseISO } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ServiceGroup } from "@/hooks/useStaffReport";

interface StaffServiceClientsProps {
  serviceGroups: ServiceGroup[];
  canViewCosts: boolean;
  displayUnit: string;
}

type SortKey = "date" | "client" | "service" | "amount" | "count" | "charged" | "cost" | "waste";
type SortDir = "asc" | "desc";

interface ProductLine {
  brand: string;
  name: string;
  shade?: string | null;
  amount: number;
  unit: string;
}

interface Row {
  sessionId: string;
  sessionDate: string;
  clientName: string;
  serviceName: string;
  products: ProductLine[];
  grossRevenue: number;
  productCost: number;
  wastePercent: number;
}

interface BrandGroup {
  brand: string;
  items: { label: string; amount: number; unit: string }[];
}

function groupByBrand(products: ProductLine[]): BrandGroup[] {
  const map = new Map<string, BrandGroup>();
  for (const p of products) {
    const label = p.shade || p.name;
    const key = p.brand || "—";
    if (!map.has(key)) map.set(key, { brand: key, items: [] });
    map.get(key)!.items.push({ label, amount: p.amount, unit: p.unit });
  }
  return Array.from(map.values());
}

export function StaffServiceClients({ serviceGroups, canViewCosts }: StaffServiceClientsProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const g of serviceGroups) {
      for (const s of g.sessions) {
        out.push({
          sessionId: s.sessionId,
          sessionDate: s.sessionDate,
          clientName: s.clientName,
          serviceName: g.serviceName,
          products: s.products,
          grossRevenue: s.grossRevenue,
          productCost: s.productCost,
          wastePercent: s.wastePercent,
        });
      }
    }
    return out;
  }, [serviceGroups]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date":
          cmp = a.sessionDate.localeCompare(b.sessionDate);
          break;
        case "client":
          cmp = a.clientName.localeCompare(b.clientName);
          break;
        case "service":
          cmp = a.serviceName.localeCompare(b.serviceName);
          break;
        case "amount":
          cmp =
            a.products.reduce((s, p) => s + p.amount, 0) -
            b.products.reduce((s, p) => s + p.amount, 0);
          break;
        case "count":
          cmp = a.products.length - b.products.length;
          break;
        case "charged":
          cmp = a.grossRevenue - b.grossRevenue;
          break;
        case "cost":
          cmp = a.productCost - b.productCost;
          break;
        case "waste":
          cmp = a.wastePercent - b.wastePercent;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.charged += r.grossRevenue;
        acc.cost += r.productCost;
        acc.amount += r.products.reduce((s, p) => s + p.amount, 0);
        acc.count += r.products.length;
        return acc;
      },
      { charged: 0, cost: 0, amount: 0, count: 0 }
    );
  }, [rows]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "client" || key === "service" ? "asc" : "desc");
    }
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Services Found</h3>
          <p className="text-muted-foreground">No sessions recorded for this period.</p>
        </CardContent>
      </Card>
    );
  }

  const SortBtn = ({ k, label, align = "left" }: { k: SortKey; label: string; align?: "left" | "right" }) => {
    const active = sortKey === k;
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-2 -mx-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-muted/60",
          align === "right" && "ml-auto"
        )}
        onClick={() => toggleSort(k)}
      >
        {label}
        <Icon className={cn("ml-1.5 w-3 h-3", active ? "opacity-100 text-foreground" : "opacity-40")} />
      </Button>
    );
  };

  const colSpanAll = canViewCosts ? 9 : 7;

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="w-auto min-w-full">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                <TableHead className="w-8" />
                <TableHead className="w-px whitespace-nowrap"><SortBtn k="date" label="Date" /></TableHead>
                <TableHead className="w-px whitespace-nowrap"><SortBtn k="client" label="Client" /></TableHead>
                <TableHead className="w-px whitespace-nowrap"><SortBtn k="service" label="Service" /></TableHead>
                <TableHead className="w-px whitespace-nowrap text-right">
                  <SortBtn k="amount" label="Amount Used" align="right" />
                </TableHead>
                <TableHead className="w-px whitespace-nowrap text-right">
                  <SortBtn k="count" label="Products" align="right" />
                </TableHead>
                {canViewCosts && (
                  <TableHead className="w-px whitespace-nowrap text-right">
                    <SortBtn k="charged" label="Charged" align="right" />
                  </TableHead>
                )}
                {canViewCosts && (
                  <TableHead className="w-px whitespace-nowrap text-right">
                    <SortBtn k="cost" label="Cost" align="right" />
                  </TableHead>
                )}
                <TableHead className="w-px whitespace-nowrap text-right pr-4">
                  <SortBtn k="waste" label="Waste" align="right" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r, idx) => {
                const isOpen = expanded.has(r.sessionId);
                const groups = groupByBrand(r.products);
                const totalAmt = r.products.reduce((s, p) => s + p.amount, 0);
                const productCount = r.products.length;
                const unit = r.products[0]?.unit ?? "";
                const wasteTone =
                  r.wastePercent > 15
                    ? "text-destructive"
                    : r.wastePercent > 5
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400";
                const wasteDot =
                  r.wastePercent > 15
                    ? "bg-destructive"
                    : r.wastePercent > 5
                    ? "bg-amber-500"
                    : "bg-emerald-500";

                return (
                  <Fragment key={r.sessionId}>
                    <TableRow
                      className={cn(
                        "group cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/30",
                        idx % 2 === 1 && "bg-muted/10",
                        isOpen && "bg-muted/30 hover:bg-muted/30"
                      )}
                      onClick={() => toggleExpand(r.sessionId)}
                    >
                      <TableCell className="py-3 pl-3 pr-1 align-middle">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <ChevronRight
                            className={cn(
                              "w-4 h-4 transition-transform",
                              isOpen && "rotate-90"
                            )}
                          />
                          <span className="text-[10px] uppercase tracking-wide opacity-0 group-hover:opacity-70 transition-opacity hidden md:inline">
                            formula
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 align-middle whitespace-nowrap text-sm text-muted-foreground tabular-nums">
                        {format(parseISO(r.sessionDate), "MMM d")}
                        <span className="ml-1 text-xs opacity-60">
                          {format(parseISO(r.sessionDate), "yyyy")}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 align-middle font-medium text-foreground whitespace-nowrap">
                        {r.clientName}
                      </TableCell>
                      <TableCell className="py-3 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {r.serviceName}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 align-middle text-right tabular-nums font-medium text-foreground whitespace-nowrap">
                        {totalAmt.toFixed(1)}{unit}
                      </TableCell>
                      <TableCell className="py-3 align-middle text-right tabular-nums text-muted-foreground whitespace-nowrap">
                        {productCount}
                      </TableCell>
                      {canViewCosts && (
                        <TableCell className="py-3 align-middle text-right tabular-nums font-medium text-foreground whitespace-nowrap">
                          ${r.grossRevenue.toFixed(2)}
                        </TableCell>
                      )}
                      {canViewCosts && (
                        <TableCell className="py-3 align-middle text-right tabular-nums text-muted-foreground whitespace-nowrap">
                          ${r.productCost.toFixed(2)}
                        </TableCell>
                      )}
                      <TableCell className="py-3 pr-4 align-middle text-right whitespace-nowrap">
                        <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium tabular-nums", wasteTone)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", wasteDot)} />
                          {r.wastePercent.toFixed(0)}%
                        </span>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20 border-b border-border/40">
                        <TableCell />
                        <TableCell colSpan={colSpanAll - 1} className="py-3 pr-4">
                          <div className="space-y-2">
                            {groups.map((g) => (
                              <div key={g.brand} className="flex items-baseline gap-3 text-sm">
                                <span className="min-w-[140px] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  {g.brand}
                                </span>
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                  {g.items.map((it, i) => (
                                    <span key={i} className="text-foreground/90">
                                      <span className="font-medium">{it.label}</span>
                                      <span className="ml-1.5 text-muted-foreground tabular-nums">
                                        {it.amount.toFixed(1)}{it.unit}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/40 border-t border-border/60 hover:bg-muted/40">
                <TableCell />
                <TableCell colSpan={3} className="py-3 text-sm font-medium text-foreground whitespace-nowrap">
                  {rows.length} {rows.length === 1 ? "session" : "sessions"}
                </TableCell>
                <TableCell className="py-3 text-right font-semibold tabular-nums text-foreground whitespace-nowrap">
                  {totals.amount.toFixed(1)}{rows[0]?.products[0]?.unit ?? ""}
                </TableCell>
                <TableCell className="py-3 text-right font-semibold tabular-nums text-foreground whitespace-nowrap">
                  {totals.count}
                </TableCell>
                {canViewCosts && (
                  <TableCell className="py-3 text-right font-semibold tabular-nums text-foreground whitespace-nowrap">
                    ${totals.charged.toFixed(2)}
                  </TableCell>
                )}
                {canViewCosts && (
                  <TableCell className="py-3 text-right font-semibold tabular-nums text-foreground whitespace-nowrap">
                    ${totals.cost.toFixed(2)}
                  </TableCell>
                )}
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
