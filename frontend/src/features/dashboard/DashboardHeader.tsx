import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Bell, ChevronDown, FileDown, LogOut, Play, Settings, ShieldHalf, Square } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { StatusDot } from "@/components/StatusDot";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import { useLiveCase } from "@/hooks/useLiveCase";
import { useNotifications } from "@/features/notifications/useNotifications";
import { NotificationList } from "@/features/notifications/NotificationList";
import { useGenerateReport } from "@/features/report/useGenerateReport";
import { ROUTES } from "@/app/routes";
import { cn } from "@/utils/cn";
import { roleLabels } from "@/constants/roles";
import type { ConnectionStatus } from "@/context/socketContextInstance";

const connectionCopy: Record<ConnectionStatus, { label: string; tone: "success" | "warning" | "danger" | "neutral"; pulse: boolean }> = {
  idle: { label: "INTELLIGENCE FEED IDLE", tone: "neutral", pulse: false },
  connecting: { label: "CONNECTING TO FEED", tone: "warning", pulse: true },
  connected: { label: "INTELLIGENCE FEED LIVE", tone: "success", pulse: true },
  disconnected: { label: "FEED DISCONNECTED", tone: "danger", pulse: false },
  error: { label: "FEED CONNECTION ERROR", tone: "danger", pulse: false },
};

export function DashboardHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { status: socketStatus } = useSocket();
  const { isRunning, activeCase, startSimulation, stopSimulation } = useLiveCase();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const { generateReport, isGenerating } = useGenerateReport();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const connection = connectionCopy[socketStatus];

  function handleLogout() {
    logout();
    navigate(ROUTES.landing);
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface/60 px-4">
      <div className="flex items-center gap-4">
        <Logo showWordmark />
        <div className="hidden items-center gap-2 border-l border-border pl-4 sm:flex">
          <StatusDot tone={connection.tone} pulse={connection.pulse} label={connection.label} />
        </div>
        {activeCase && (
          <Badge tone={isRunning ? "danger" : "neutral"} dot={isRunning} className="hidden sm:inline-flex">
            {activeCase.id.toUpperCase()}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isRunning ? "danger" : "primary"}
          disabled={socketStatus !== "connected"}
          onClick={() => (isRunning ? stopSimulation() : startSimulation())}
          className="mr-1"
        >
          {isRunning ? (
            <>
              <Square className="h-3.5 w-3.5" /> Stop Simulation
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" /> Run Simulation
            </>
          )}
        </Button>
        {activeCase && (
          <Button
            size="sm"
            variant="outline"
            disabled={isGenerating}
            onClick={() => generateReport(activeCase.id)}
            className="mr-1 hidden sm:inline-flex"
          >
            <FileDown className="h-3.5 w-3.5" /> {isGenerating ? "Generating…" : "Report"}
          </Button>
        )}
        <button
          type="button"
          onClick={() => navigate(ROUTES.analytics)}
          className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-text-secondary transition hover:bg-surface-raised hover:text-primary sm:flex"
        >
          <BarChart3 className="h-3.5 w-3.5" /> Analytics
        </button>
        <button
          type="button"
          onClick={() => navigate(ROUTES.settings)}
          className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-text-secondary transition hover:bg-surface-raised hover:text-primary sm:flex"
        >
          <Settings className="h-3.5 w-3.5" /> Settings
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((v) => !v)}
            aria-label="Toggle notifications"
            className="relative rounded-md p-2 text-text-secondary transition hover:bg-surface-raised hover:text-primary"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />}
          </button>

          <AnimatePresence>
            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="glass-panel absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-lg"
                >
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <span className="text-xs font-semibold text-text-primary">Notifications</span>
                    {unreadCount > 0 && (
                      <button type="button" onClick={markAllRead} className="text-[11px] text-primary hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <NotificationList notifications={notifications} compact />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open user menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-md border border-border-strong bg-surface px-2 py-1.5 transition hover:border-primary/40"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-bg"
              style={{ backgroundColor: user?.avatarColor ?? "#06b6d4" }}
            >
              {user?.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span className="hidden text-xs font-medium text-text-primary sm:inline">{user?.name}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-text-muted transition-transform", menuOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="glass-panel absolute right-0 z-50 mt-2 w-56 rounded-lg p-2"
                >
                  <div className="flex items-center gap-2 px-2 py-2">
                    <ShieldHalf className="h-4 w-4 text-primary" />
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-semibold text-text-primary">{user?.name}</span>
                      <Badge tone="primary" className="mt-1">
                        {user ? roleLabels[user.role] : ""}
                      </Badge>
                    </div>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-danger transition hover:bg-danger/10"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
