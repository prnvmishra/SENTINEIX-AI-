import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StateStat } from "@shared/types";

const COLORS = { primary: "#06b6d4", grid: "#1f2937", muted: "#64748b" };

export function StateHotspotChart({ data }: { data: StateStat[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={COLORS.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: COLORS.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="state"
          width={110}
          tick={{ fill: "#e5e7eb", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
          contentStyle={{ background: "#161f36", border: "1px solid #263349", borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: "#e5e7eb" }}
          formatter={(value) => [value, "Incidents"]}
        />
        <Bar dataKey="incidents" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={14} name="incidents" />
      </BarChart>
    </ResponsiveContainer>
  );
}
