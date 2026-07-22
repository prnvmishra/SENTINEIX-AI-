import type { AgencyPerformanceStat } from "@shared/types";
import { cn } from "@/utils/cn";

function resolutionTone(rate: number): string {
  if (rate >= 0.85) return "bg-success";
  if (rate >= 0.75) return "bg-primary";
  return "bg-warning";
}

export function AgencyPerformanceTable({ data }: { data: AgencyPerformanceStat[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
            <th className="py-2 pr-3 font-medium">Agency</th>
            <th className="py-2 pr-3 font-medium">Cases</th>
            <th className="py-2 pr-3 font-medium">Resolution rate</th>
            <th className="py-2 pr-3 font-medium">Avg response</th>
          </tr>
        </thead>
        <tbody>
          {data.map((agency) => (
            <tr key={agency.agency} className="border-b border-border/60 last:border-0">
              <td className="py-2.5 pr-3 font-medium text-text-primary">{agency.agency}</td>
              <td className="py-2.5 pr-3 font-mono text-text-secondary">{agency.casesHandled}</td>
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border">
                    <div
                      className={cn("h-full rounded-full", resolutionTone(agency.resolutionRate))}
                      style={{ width: `${agency.resolutionRate * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-text-secondary">{Math.round(agency.resolutionRate * 100)}%</span>
                </div>
              </td>
              <td className="py-2.5 pr-3 font-mono text-text-secondary">{agency.avgResponseMinutes}m</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
