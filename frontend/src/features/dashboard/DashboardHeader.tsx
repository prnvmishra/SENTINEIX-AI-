import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, BarChart3, Bell, ChevronDown, ClipboardList, Crown, FileDown, LogOut, Play, Settings, ShieldHalf, Square } from "lucide-react";
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
import { isLiveMicSession } from "@/context/liveCaseContextInstance";
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
  const { generateReport, isGenerating, error: reportError } = useGenerateReport();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [notifPos, setNotifPos] = useState({ top: 0, right: 0 });
  const userBtnRef = useRef<HTMLButtonElement>(null);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const connection = connectionCopy[socketStatus];
  const liveSessionActive = isRunning && isLiveMicSession(activeCase);

  useEffect(() => {
    if (!menuOpen && !notificationsOpen) return;
    function syncPositions() {
      if (menuOpen && userBtnRef.current) {
        const r = userBtnRef.current.getBoundingClientRect();
        setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
      }
      if (notificationsOpen && notifBtnRef.current) {
        const r = notifBtnRef.current.getBoundingClientRect();
        setNotifPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
      }
    }
    syncPositions();
    window.addEventListener("resize", syncPositions);
    window.addEventListener("scroll", syncPositions, true);
    return () => {
      window.removeEventListener("resize", syncPositions);
      window.removeEventListener("scroll", syncPositions, true);
    };
  }, [menuOpen, notificationsOpen]);

  function handleLogout() {
    logout();
    navigate(ROUTES.landing);
  }

  function openUserMenu() {
    setNotificationsOpen(false);
    if (userBtnRef.current) {
      const r = userBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setMenuOpen((v) => !v);
  }

  function openNotifications() {
    setMenuOpen(false);
    if (notifBtnRef.current) {
      const r = notifBtnRef.current.getBoundingClientRect();
      setNotifPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setNotificationsOpen((v) => !v);
  }

  return (
    <header className="relative z-[200] flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-surface/50 px-4 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-4">
        <Logo showWordmark />
        <div className="hidden items-center gap-2 border-l border-border/80 pl-4 sm:flex">
          <StatusDot tone={connection.tone} pulse={connection.pulse} label={connection.label} />
        </div>
        {activeCase && (
          <Badge tone={isRunning ? "danger" : "neutral"} dot={isRunning} className="hidden max-w-[140px] truncate sm:inline-flex">
            {activeCase.id.toUpperCase()}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          size="sm"
          variant={isRunning ? "danger" : "outline"}
          disabled={socketStatus !== "connected" || liveSessionActive}
          onClick={() => (isRunning ? stopSimulation() : startSimulation())}
          title={
            liveSessionActive
              ? "Stop the live mic session first"
              : "Plays back one of 4 pre-scripted scenarios — a scripted demo, not real data. For a real analysis, use the Live Mic Session tab instead."
          }
        >
          {isRunning ? (
            <>
              <Square className="h-3.5 w-3.5" /> Stop Demo
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" /> Play Demo
            </>
          )}
        </Button>
        {activeCase && (
          <div className="relative hidden sm:inline-flex">
            <Button
              size="sm"
              variant="outline"
              disabled={isGenerating}
              onClick={() => void generateReport(activeCase.id)}
            >
              <FileDown className="h-3.5 w-3.5" /> {isGenerating ? "Generating…" : "Report"}
            </Button>
            {reportError && (
              <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-danger/30 bg-danger/10 px-2.5 py-2 text-[10px] text-danger shadow-lg backdrop-blur-md">
                {reportError}
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => navigate(ROUTES.cases)}
          className="flex items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
        >
          <ClipboardList className="h-3.5 w-3.5" /> Cases
        </button>
        <button
          type="button"
          onClick={() => navigate(ROUTES.analytics)}
          className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-secondary transition hover:bg-surface-raised hover:text-primary sm:flex"
        >
          <BarChart3 className="h-3.5 w-3.5" /> Analytics
        </button>
        <button
          type="button"
          onClick={() => navigate(ROUTES.officerRegistry)}
          className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-secondary transition hover:bg-surface-raised hover:text-primary sm:flex"
        >
          <BadgeCheck className="h-3.5 w-3.5" /> Verify
        </button>
        <button
          type="button"
          onClick={() => navigate(ROUTES.settings)}
          className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-secondary transition hover:bg-surface-raised hover:text-primary sm:flex"
        >
          <Settings className="h-3.5 w-3.5" /> Settings
        </button>
        {user?.role === "gov_admin" && (
          <button
            type="button"
            onClick={() => navigate(ROUTES.admin)}
            className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-primary transition hover:bg-primary/10 sm:flex"
          >
            <Crown className="h-3.5 w-3.5" /> Admin
          </button>
        )}

        <div className="relative">
          <button
            ref={notifBtnRef}
            type="button"
            onClick={openNotifications}
            aria-label="Toggle notifications"
            className="relative rounded-lg p-2 text-text-secondary transition hover:bg-surface-raised hover:text-primary"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger shadow-[0_0_8px_var(--color-danger)]" />}
          </button>

          {typeof document !== "undefined" &&
            createPortal(
              <AnimatePresence>
                {notificationsOpen && (
                  <>
                    <div className="fixed inset-0 z-[300]" onClick={() => setNotificationsOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      style={{ top: notifPos.top, right: notifPos.right }}
                      className="glass-panel fixed z-[310] max-h-96 w-80 overflow-y-auto rounded-2xl shadow-xl"
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
              </AnimatePresence>,
              document.body,
            )}
        </div>

        <div className="relative">
          <button
            ref={userBtnRef}
            type="button"
            onClick={openUserMenu}
            aria-label="Open user menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-xl border border-border-strong/80 bg-surface/80 px-2 py-1.5 transition hover:border-primary/40"
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

          {typeof document !== "undefined" &&
            createPortal(
              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-[300]" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      style={{ top: menuPos.top, right: menuPos.right }}
                      className="glass-panel fixed z-[310] w-56 rounded-2xl p-2 shadow-xl"
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
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(ROUTES.cases);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-text-secondary transition hover:bg-surface-raised hover:text-primary sm:hidden"
                      >
                        <ClipboardList className="h-3.5 w-3.5" /> Cases
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(ROUTES.analytics);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-text-secondary transition hover:bg-surface-raised hover:text-primary sm:hidden"
                      >
                        <BarChart3 className="h-3.5 w-3.5" /> Analytics
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(ROUTES.officerRegistry);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-text-secondary transition hover:bg-surface-raised hover:text-primary sm:hidden"
                      >
                        <BadgeCheck className="h-3.5 w-3.5" /> Verify / Check
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(ROUTES.settings);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-text-secondary transition hover:bg-surface-raised hover:text-primary sm:hidden"
                      >
                        <Settings className="h-3.5 w-3.5" /> Settings
                      </button>
                      {user?.role === "gov_admin" && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            navigate(ROUTES.admin);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-primary transition hover:bg-primary/10 sm:hidden"
                        >
                          <Crown className="h-3.5 w-3.5" /> Admin
                        </button>
                      )}
                      {activeCase && (
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={() => {
                            setMenuOpen(false);
                            void generateReport(activeCase.id);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-text-secondary transition hover:bg-surface-raised hover:text-primary sm:hidden"
                        >
                          <FileDown className="h-3.5 w-3.5" /> {isGenerating ? "Generating…" : "Download Report"}
                        </button>
                      )}
                      <div className="my-1 h-px bg-border sm:hidden" />
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
              </AnimatePresence>,
              document.body,
            )}
        </div>
      </div>
    </header>
  );
}
