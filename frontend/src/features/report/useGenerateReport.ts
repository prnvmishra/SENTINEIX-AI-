import { useCallback, useState } from "react";
import type { CaseDetail } from "@shared/types";
import { reportApi } from "@/services/reportApi";
import { useAuth } from "@/hooks/useAuth";
import { useLiveCase } from "@/hooks/useLiveCase";
import { useCaseRegistry } from "@/hooks/useCaseRegistry";
import { buildInvestigationReportFromCase } from "@/features/report/buildReportFromCase";
import { buildCaseDetailFromLiveState } from "@/utils/buildCaseDetailFromLiveState";

export function useGenerateReport() {
  const { token } = useAuth();
  const liveCase = useLiveCase();
  const { cases: registryCases } = useCaseRegistry();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(
    async (caseId: string, caseDetail?: CaseDetail | null) => {
      setIsGenerating(true);
      setError(null);

      try {
        const { generateInvestigationReportPdf } = await import("@/features/report/generateReportPdf");

        let detail: CaseDetail | null | undefined = caseDetail;

        if (!detail) {
          detail = registryCases.find((entry) => entry.id === caseId) ?? null;
        }

        if (!detail && liveCase.pendingRegistration?.id === caseId) {
          detail = liveCase.pendingRegistration;
        }

        if (!detail && liveCase.activeCase?.id === caseId) {
          detail = buildCaseDetailFromLiveState(liveCase);
        }

        if (detail) {
          await generateInvestigationReportPdf(buildInvestigationReportFromCase(detail));
          return;
        }

        // Scripted demo cases only — backend knows 4 mock ids, not live-* Firebase cases.
        if (!token) {
          setError("Sign in to download a report for demo cases.");
          return;
        }

        const { report } = await reportApi.get(token, caseId);
        await generateInvestigationReportPdf(report);
      } catch (err) {
        console.warn("[report] generation failed:", err);
        const message =
          caseId.startsWith("live-")
            ? "Report failed — register the case first (Cases page), or run analysis and try Report again while the session is still loaded."
            : "Unable to generate report. Open the case from Cases / Historical Cases and try again.";
        setError(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [token, liveCase, registryCases],
  );

  return { generateReport, isGenerating, error, clearError: () => setError(null) };
}
