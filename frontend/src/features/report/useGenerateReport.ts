import { useCallback, useState } from "react";
import { reportApi } from "@/services/reportApi";
import { useAuth } from "@/hooks/useAuth";

export function useGenerateReport() {
  const { token } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(
    async (caseId: string) => {
      if (!token) return;
      setIsGenerating(true);
      setError(null);

      try {
        const [{ report }, { generateInvestigationReportPdf }] = await Promise.all([
          reportApi.get(token, caseId),
          import("@/features/report/generateReportPdf"),
        ]);
        generateInvestigationReportPdf(report);
      } catch {
        setError("Unable to generate report. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    },
    [token],
  );

  return { generateReport, isGenerating, error };
}
