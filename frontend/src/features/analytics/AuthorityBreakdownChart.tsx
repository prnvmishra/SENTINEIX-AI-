import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { AuthorityImpersonationStat } from "@shared/types";

const PALETTE = ["#06b6d4", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#f472b6"];

export function AuthorityBreakdownChart({ data }: { data: AuthorityImpersonationStat[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="authority"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={entry.authority} fill={PALETTE[index % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#161f36", border: "1px solid #263349", borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: "#e5e7eb" }}
        />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
