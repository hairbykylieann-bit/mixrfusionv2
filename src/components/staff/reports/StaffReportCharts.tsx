import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import type { StaffReportSummary } from "@/hooks/useStaffReport";

interface StaffReportChartsProps {
  summary: StaffReportSummary;
  canViewCosts: boolean;
}

const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function StaffReportCharts({ summary, canViewCosts }: StaffReportChartsProps) {
  if (!canViewCosts || summary.services === 0) return null;

  const netProfit = summary.netAfterProduct;

  const pieData = [
    { name: 'Product Cost', value: summary.productCost, color: '#6366f1' },
    { name: 'Salon Keeps', value: Math.max(netProfit, 0), color: '#10b981' },
  ].filter(d => d.value > 0);

  const costPct = summary.grossRevenue > 0 ? (summary.productCost / summary.grossRevenue) * 100 : 0;
  const wasteVal = summary.wastePercent;
  const wasteBarColor = wasteVal < 3 ? 'hsl(var(--success))' : wasteVal <= 5 ? '#f59e0b' : 'hsl(var(--destructive))';
  const costBarColor = costPct <= 12 ? 'hsl(var(--success))' : costPct <= 15 ? '#f59e0b' : 'hsl(var(--destructive))';

  const healthData = [
    { name: 'Waste %', value: parseFloat(wasteVal.toFixed(1)), target: 5, fill: wasteBarColor },
    { name: 'Cost %', value: parseFloat(costPct.toFixed(1)), target: 12, fill: costBarColor },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <motion.div
        className="stat-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Revenue Breakdown</p>
        {pieData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No revenue data for this period
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-medium text-foreground">{fmt(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <motion.div
        className="stat-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Operational Health</p>
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={healthData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
              <XAxis type="number" domain={[0, 20]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }} axisLine={false} tickLine={false} width={60} />
              <RechartsTooltip
                formatter={(value: number, name: string) => [`${value}%`, name]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}>
                {healthData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-around mt-2 text-xs text-muted-foreground">
            <span>Waste target: &lt;5%</span>
            <span>Cost target: 8–12%</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
