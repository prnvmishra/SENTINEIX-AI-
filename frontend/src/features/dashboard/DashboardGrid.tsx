import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { panelMount, staggerContainer } from "@/theme/motion";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface DashboardGridProps {
  transcript: ReactNode;
  threat: ReactNode;
  map: ReactNode;
  graph: ReactNode;
  bottom: ReactNode;
}

export function DashboardGrid({ transcript, threat, map, graph, bottom }: DashboardGridProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="grid h-[calc(100vh-3.5rem)] grid-rows-[minmax(0,1fr)_minmax(220px,240px)] gap-2 overflow-y-auto p-2 lg:overflow-hidden"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[transcript, threat, map, graph].map((panel, index) => (
          <motion.div key={index} variants={panelMount} className="min-h-[360px] sm:col-span-1 xl:min-h-0">
            <ErrorBoundary fallbackTitle="This intelligence module failed to render">{panel}</ErrorBoundary>
          </motion.div>
        ))}
      </div>
      <motion.div variants={panelMount} className="min-h-[220px]">
        <ErrorBoundary fallbackTitle="Investigation console failed to render">{bottom}</ErrorBoundary>
      </motion.div>
    </motion.div>
  );
}
