import { useState } from "react";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CategoryUsage } from "@/hooks/useStaffReport";

interface StaffProductUsageProps {
  products: CategoryUsage[];
  canViewCosts: boolean;
  displayUnit?: string;
}

function CategoryRow({
  category,
  canViewCosts,
  isExpanded,
  onToggle,
}: {
  category: CategoryUsage;
  canViewCosts: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50 font-medium"
        onClick={onToggle}
      >
        <TableCell className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span>{category.category}</span>
          <span className="text-muted-foreground text-sm font-normal">
            ({category.items.length} products)
          </span>
        </TableCell>
        <TableCell className="text-right">
          {category.totalAmountUsed.toFixed(1)} {category.unit}
        </TableCell>
        {canViewCosts && (
          <>
            <TableCell className="text-right">
              ${category.totalCost.toFixed(2)}
            </TableCell>
            <TableCell className="text-right">
              ${category.totalRevenue.toFixed(2)}
            </TableCell>
            <TableCell className="text-right text-green-500">
              ${category.totalProfit.toFixed(2)}
            </TableCell>
          </>
        )}
      </TableRow>

      {isExpanded &&
        category.items.map((item) => (
          <TableRow key={item.id} className="bg-muted/30">
            <TableCell className="pl-10">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-foreground">{item.name}</span>
                  {item.shade && (
                    <span className="text-muted-foreground ml-2">
                      ({item.shade})
                    </span>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right">
              {item.amountUsed.toFixed(1)} {item.unit}
            </TableCell>
            {canViewCosts && (
              <>
                <TableCell className="text-right">
                  ${item.cost.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  ${item.revenue.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-green-500">
                  ${item.profit.toFixed(2)}
                </TableCell>
              </>
            )}
          </TableRow>
        ))}
    </>
  );
}

export function StaffProductUsage({ products, canViewCosts, displayUnit = "g" }: StaffProductUsageProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(new Set(products.map((p) => p.category)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Calculate totals
  const totals = {
    amount: products.reduce((sum, c) => sum + c.totalAmountUsed, 0),
    cost: products.reduce((sum, c) => sum + c.totalCost, 0),
    revenue: products.reduce((sum, c) => sum + c.totalRevenue, 0),
    profit: products.reduce((sum, c) => sum + c.totalProfit, 0),
  };

  if (products.length === 0) {
    return (
      <div className="stat-card text-center py-8">
        <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No product usage recorded for this period.</p>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">Product Usage</h3>
          <p className="text-sm text-muted-foreground">
            Click a category to view individual products
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-sm text-primary hover:underline"
          >
            Expand all
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-primary hover:underline"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty Used</TableHead>
              {canViewCosts && (
                <>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((category) => (
              <CategoryRow
                key={category.category}
                category={category}
                canViewCosts={canViewCosts}
                isExpanded={expandedCategories.has(category.category)}
                onToggle={() => toggleCategory(category.category)}
              />
            ))}

            {/* Totals row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">
                {totals.amount.toFixed(1)}{displayUnit === 'oz' ? 'oz' : 'g'}
              </TableCell>
              {canViewCosts && (
                <>
                  <TableCell className="text-right">
                    ${totals.cost.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${totals.revenue.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-green-500">
                    ${totals.profit.toFixed(2)}
                  </TableCell>
                </>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
