import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
  activeTabId?: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function Tabs({ items, defaultTabId, activeTabId, onChange, className }: TabsProps) {
  const [internalActive, setInternalActive] = useState(defaultTabId ?? items[0]?.id);
  const active = activeTabId ?? internalActive;

  function handleClick(id: string) {
    setInternalActive(id);
    onChange?.(id);
  }

  return (
    <div className={cn("flex items-center gap-1 rounded-lg border border-border bg-surface p-1", className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => handleClick(item.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            active === item.id
              ? "bg-primary/15 text-primary"
              : "text-text-muted hover:bg-surface-raised hover:text-text-secondary",
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
