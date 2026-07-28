import { useMemo, useState } from "react";
import { AlertTriangle, Bell, History, Mic, ScrollText, Timer } from "lucide-react";
import { GlassPanel } from "@/components/GlassPanel";
import { PanelHeader } from "@/components/PanelHeader";
import { Tabs } from "@/components/Tabs";
import type { TabItem } from "@/components/Tabs";
import { useLiveCase } from "@/hooks/useLiveCase";
import { isLiveMicSession } from "@/context/liveCaseContextInstance";
import { useCaseDetail } from "@/features/replay/useCaseDetail";
import { useCaseRegistry } from "@/hooks/useCaseRegistry";
import { useNotifications } from "@/features/notifications/useNotifications";
import { CaseHistoryList } from "@/features/replay/CaseHistoryList";
import { ReplayTimeline } from "@/features/replay/ReplayTimeline";
import { SystemLogsFeed } from "@/features/replay/SystemLogsFeed";
import { NotificationList } from "@/features/notifications/NotificationList";
import { LoadingState } from "@/components/Skeleton";
import { LiveSessionControls } from "@/features/live/LiveSessionControls";

export function BottomPanel() {
  const [activeTab, setActiveTab] = useState("live");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const { activeCase, timeline: liveTimeline, logs } = useLiveCase();
  const { cases: registryCases, isLoading: registryLoading, error: registryError } = useCaseRegistry();
  const { caseDetail, isLoading: detailLoading } = useCaseDetail(selectedCaseId, registryCases);
  const { notifications, unreadCount } = useNotifications();

  const cases = registryCases;

  const replayData = useMemo(() => {
    if (selectedCaseId && caseDetail) {
      return {
        caseId: caseDetail.id,
        title: caseDetail.title,
        timeline: caseDetail.timeline,
        durationMs: caseDetail.durationMs,
        recordingUrl: caseDetail.recordingUrl,
        evidenceImageUrl: caseDetail.evidenceImageUrl,
        status: caseDetail.status,
        resolution: caseDetail.resolution,
        isRealCase: isLiveMicSession(caseDetail) || caseDetail.source === "manual",
        caseDetail,
      };
    }
    if (!selectedCaseId && activeCase) {
      return {
        caseId: activeCase.id,
        title: activeCase.title,
        timeline: liveTimeline,
        durationMs: activeCase.durationMs,
        status: activeCase.status,
        resolution: activeCase.resolution,
        isRealCase: isLiveMicSession(activeCase),
        caseDetail: null as null,
      };
    }
    return {
      caseId: null,
      title: "",
      timeline: [],
      durationMs: 0,
      status: undefined,
      resolution: undefined,
      isRealCase: false,
      caseDetail: null as null,
    };
  }, [selectedCaseId, caseDetail, activeCase, liveTimeline]);

  function handleSelectCase(id: string) {
    setSelectedCaseId(id);
    setActiveTab("timeline");
  }

  const tabItems: TabItem[] = useMemo(
    () => [
      { id: "live", label: "Live Mic Session", icon: <Mic className="h-3.5 w-3.5" /> },
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
    <GlassPanel noPadding className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0">
        <PanelHeader
          icon={Timer}
          title="Investigation Console"
          subtitle="Replay · History · Notifications · Logs"
          actions={<Tabs items={tabItems} activeTabId={activeTab} onChange={setActiveTab} className="border-none bg-transparent p-0" />}
        />
      </div>

      {/* h-0 + flex-1 is required so this pane gets a real height and can scroll */}
      <div className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
        {activeTab === "live" && <LiveSessionControls />}

        {activeTab === "timeline" &&
          (selectedCaseId && detailLoading ? (
            <LoadingState label="Loading case replay..." />
          ) : (
            <ReplayTimeline
              caseId={replayData.caseId}
              caseTitle={replayData.title}
              timeline={replayData.timeline}
              durationMs={replayData.durationMs}
              recordingUrl={replayData.recordingUrl}
              evidenceImageUrl={replayData.evidenceImageUrl}
              source={replayData.caseDetail?.source}
              status={replayData.status}
              resolution={replayData.resolution}
              isRealCase={replayData.isRealCase}
              caseDetail={replayData.caseDetail}
              onCaseDeleted={() => {
                setSelectedCaseId(null);
                setActiveTab("history");
              }}
            />
          ))}

        {activeTab === "history" && (
          <>
            {registryError && (
              <div className="m-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-[11px] text-danger">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Cannot load cases from Firebase:</strong> {registryError}
                </span>
              </div>
            )}
            <CaseHistoryList
              cases={cases}
              isLoading={registryLoading}
              selectedCaseId={selectedCaseId}
              onSelectCase={handleSelectCase}
            />
          </>
        )}

        {activeTab === "notifications" && <NotificationList notifications={notifications} />}

        {activeTab === "logs" && <SystemLogsFeed logs={logs} />}
      </div>
    </GlassPanel>
  );
}
