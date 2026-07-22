import { useMemo, useState } from "react";
import { Bell, History, ScrollText, Timer } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { Tabs } from "@/components/Tabs";
import type { TabItem } from "@/components/Tabs";
import { useLiveCase } from "@/hooks/useLiveCase";
import { useCaseHistory } from "@/features/replay/useCaseHistory";
import { useCaseDetail } from "@/features/replay/useCaseDetail";
import { useNotifications } from "@/features/notifications/useNotifications";
import { CaseHistoryList } from "@/features/replay/CaseHistoryList";
import { ReplayTimeline } from "@/features/replay/ReplayTimeline";
import { SystemLogsFeed } from "@/features/replay/SystemLogsFeed";
import { NotificationList } from "@/features/notifications/NotificationList";
import { LoadingState } from "@/components/Skeleton";

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState("timeline");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const { activeCase, timeline: liveTimeline, logs } = useLiveCase();
  const { cases, isLoading: casesLoading } = useCaseHistory();
  const { caseDetail, isLoading: detailLoading } = useCaseDetail(selectedCaseId);
  const { notifications, unreadCount } = useNotifications();

  const replayData = useMemo(() => {
    if (selectedCaseId && caseDetail) {
      return { caseId: caseDetail.id, title: caseDetail.title, timeline: caseDetail.timeline, durationMs: caseDetail.durationMs };
    }
    if (!selectedCaseId && activeCase) {
      return { caseId: activeCase.id, title: activeCase.title, timeline: liveTimeline, durationMs: activeCase.durationMs };
    }
    return { caseId: null, title: "", timeline: [], durationMs: 0 };
  }, [selectedCaseId, caseDetail, activeCase, liveTimeline]);

  function handleSelectCase(id: string) {
    setSelectedCaseId(id);
    setActiveTab("timeline");
  }

  const tabItems: TabItem[] = useMemo(
    () => [
      { id: "timeline", label: "Investigation Replay", icon: <Timer className="h-3.5 w-3.5" /> },
      { id: "history", label: "Historical Cases", icon: <History className="h-3.5 w-3.5" /> },
      {
        id: "notifications",
        label: "Notifications",
        icon: (
          <span className="relative">
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-danger" />}
          </span>
        ),
      },
      { id: "logs", label: "System Logs", icon: <ScrollText className="h-3.5 w-3.5" /> },
    ],
    [unreadCount],
  );

  return (
    <GlassPanel noPadding className="flex h-full flex-col overflow-hidden">
      <PanelHeader
        icon={Timer}
        title="Investigation Console"
        subtitle="Replay · History · Notifications · Logs"
        actions={<Tabs items={tabItems} activeTabId={activeTab} onChange={setActiveTab} className="border-none bg-transparent p-0" />}
      />
      <div className="flex-1 overflow-hidden">
        {activeTab === "timeline" &&
          (selectedCaseId && detailLoading ? (
            <LoadingState label="Loading case replay..." />
          ) : (
            <ReplayTimeline
              caseId={replayData.caseId}
              caseTitle={replayData.title}
              timeline={replayData.timeline}
              durationMs={replayData.durationMs}
            />
          ))}

        {activeTab === "history" && (
          <div className="h-full overflow-y-auto">
            <CaseHistoryList
              cases={cases}
              isLoading={casesLoading}
              selectedCaseId={selectedCaseId}
              onSelectCase={handleSelectCase}
            />
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="h-full overflow-y-auto">
            <NotificationList notifications={notifications} />
          </div>
        )}

        {activeTab === "logs" && (
          <div className="h-full overflow-y-auto">
            <SystemLogsFeed logs={logs} />
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
