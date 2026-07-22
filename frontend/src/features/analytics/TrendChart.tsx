import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyTrendPoint } from "@shared/types";

const COLORS = {
  primary: "#06b6d4",
  danger: "#ef4444",
  grid: "#1f2937",
  muted: "#64748b",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function TrendChart({ data }: { data: DailyTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="incidentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={COLORS.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: COLORS.muted, fontSize: 10 }}
          axisLine={{ stroke: COLORS.grid }}
          tickLine={false}
        />
        <YAxis yAxisId="left" tick={{ fill: COLORS.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 100]}
          tick={{ fill: COLORS.muted, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: "#161f36", border: "1px solid #263349", borderRadius: 8, fontSize: 11 }}
          labelFormatter={(value) => formatDate(String(value))}
          labelStyle={{ color: "#e5e7eb" }}
        />
        <Area yAxisId="left" type="monotone" dataKey="incidents" stroke="none" fill="url(#incidentFill)" />
        <Bar yAxisId="left" dataKey="incidents" fill={COLORS.primary} radius={[3, 3, 0, 0]} barSize={10} name="Incidents" />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="averageThreatScore"
          stroke={COLORS.danger}
          strokeWidth={2}
          dot={false}
          name="Avg threat score"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
