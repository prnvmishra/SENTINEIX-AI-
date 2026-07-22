import { jsPDF } from "jspdf";
import type { InvestigationReport, ThreatLevel } from "@shared/types";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  bg: "#050816",
  surface: "#111827",
  border: "#1f2937",
  primary: "#06b6d4",
  danger: "#ef4444",
  success: "#10b981",
  warning: "#f59e0b",
  textPrimary: "#e5e7eb",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  ink: "#0f172a",
};

const levelColor: Record<ThreatLevel, string> = {
  low: COLORS.success,
  elevated: COLORS.warning,
  high: COLORS.warning,
  critical: COLORS.danger,
};

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

class ReportRenderer {
  doc: jsPDF;
  cursorY = MARGIN;
  page = 1;
  report: InvestigationReport;

  constructor(report: InvestigationReport) {
    this.report = report;
    this.doc = new jsPDF({ unit: "mm", format: "a4" });
  }

  ensureSpace(height: number) {
    if (this.cursorY + height > PAGE_HEIGHT - MARGIN - 10) {
      this.doc.addPage();
      this.page += 1;
      this.cursorY = MARGIN;
    }
  }

  sectionTitle(title: string) {
    this.ensureSpace(12);
    this.doc.setFillColor(COLORS.primary);
    this.doc.rect(MARGIN, this.cursorY, 3, 4.2, "F");
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(COLORS.ink);
    this.doc.text(title.toUpperCase(), MARGIN + 5, this.cursorY + 3.6);
    this.cursorY += 9;
  }

  paragraph(text: string, size = 9.5, color = "#334155") {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(size);
    this.doc.setTextColor(color);
    const lines: string[] = this.doc.splitTextToSize(text, CONTENT_WIDTH);
    for (const line of lines) {
      this.ensureSpace(5.5);
      this.doc.text(line, MARGIN, this.cursorY);
      this.cursorY += 5;
    }
    this.cursorY += 2;
  }

  bulletList(items: string[], color = "#334155") {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(color);
    for (const item of items) {
      const lines: string[] = this.doc.splitTextToSize(item, CONTENT_WIDTH - 6);
      this.ensureSpace(5 * lines.length + 1);
      this.doc.setFillColor(COLORS.primary);
      this.doc.circle(MARGIN + 1, this.cursorY - 1.2, 0.8, "F");
      lines.forEach((line: string, index: number) => {
        this.doc.text(line, MARGIN + 5, this.cursorY + index * 5);
      });
      this.cursorY += 5 * lines.length + 1.5;
    }
    this.cursorY += 1;
  }

  keyValueGrid(pairs: Array<[string, string]>) {
    const colWidth = CONTENT_WIDTH / 2;
    const rowHeight = 8;

    pairs.forEach(([key, value], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = MARGIN + col * colWidth;
      const y = this.cursorY + row * rowHeight;

      if (col === 0) this.ensureSpace(rowHeight);

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(COLORS.textMuted);
      this.doc.text(key.toUpperCase(), x, y);

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(9.5);
      this.doc.setTextColor(COLORS.ink);
      this.doc.text(value, x, y + 4.6);
    });

    const rows = Math.ceil(pairs.length / 2);
    this.cursorY += rows * rowHeight + 3;
  }

  header() {
    this.doc.setFillColor(COLORS.bg);
    this.doc.rect(0, 0, PAGE_WIDTH, 32, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(16);
    this.doc.setTextColor(COLORS.primary);
    this.doc.text("SENTINELX AI", MARGIN, 13);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(COLORS.textSecondary);
    this.doc.text("NATIONAL FRAUD INTELLIGENCE PLATFORM · MOCK INTELLIGENCE ENGINE", MARGIN, 18.5);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(COLORS.textPrimary);
    this.doc.text("PROTOTYPE INVESTIGATION REPORT", MARGIN, 26.5);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.textMuted);
    const generated = `Generated: ${new Date(this.report.generatedAt).toLocaleString("en-IN")}`;
    this.doc.text(generated, PAGE_WIDTH - MARGIN, 13, { align: "right" });
    this.doc.text(`Case ID: ${this.report.caseId}`, PAGE_WIDTH - MARGIN, 18, { align: "right" });

    this.cursorY = 40;
  }

  threatBadge() {
    const color = levelColor[this.report.threatLevel];
    this.ensureSpace(16);
    this.doc.setFillColor(color);
    this.doc.roundedRect(MARGIN, this.cursorY, 62, 14, 2, 2, "F");
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(14);
    this.doc.setTextColor("#050816");
    this.doc.text(`${this.report.finalScore}/100`, MARGIN + 4, this.cursorY + 9);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(COLORS.ink);
    this.doc.text(`${this.report.threatLevel.toUpperCase()} THREAT LEVEL`, MARGIN + 68, this.cursorY + 9);
    this.cursorY += 20;
  }

  footer() {
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
      this.doc.setPage(i);
      this.doc.setDrawColor(COLORS.border);
      this.doc.line(MARGIN, PAGE_HEIGHT - 16, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 16);
      this.doc.setFont("helvetica", "italic");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(COLORS.textMuted);
      const disclaimerLines: string[] = this.doc.splitTextToSize(this.report.disclaimer, CONTENT_WIDTH);
      this.doc.text(disclaimerLines, MARGIN, PAGE_HEIGHT - 12);
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7.5);
      this.doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12, { align: "right" });
    }
  }

  render(): jsPDF {
    const r = this.report;
    this.header();

    this.sectionTitle("Case Summary");
    this.keyValueGrid([
      ["Case Title", r.title],
      ["Impersonated Authority", r.impersonatedAuthority],
      ["Victim Alias", r.victimAlias],
      ["Location", `${r.city}, ${r.state}`],
    ]);
    this.threatBadge();

    this.sectionTitle("Incident Summary");
    this.paragraph(r.incidentSummary);

    if (r.indicators.length > 0) {
      this.sectionTitle(`Detected Threat Indicators (${r.indicators.length})`);
      this.bulletList(
        r.indicators.map(
          (indicator) =>
            `[+${indicator.delta}] ${indicator.label} — "${indicator.matchedPhrase}" (${formatTimestamp(indicator.timestampMs)})`,
        ),
      );
    }

    if (r.evidence.length > 0) {
      this.sectionTitle("Evidence Log");
      this.bulletList(r.evidence);
    }

    if (r.timeline.length > 0) {
      this.sectionTitle("Investigation Timeline");
      this.bulletList(r.timeline.map((event) => `${formatTimestamp(event.timestampMs)} — ${event.title}: ${event.description}`));
    }

    if (r.recommendations.length > 0) {
      this.sectionTitle("Recommended Actions");
      this.bulletList(r.recommendations);
    }

    this.footer();
    return this.doc;
  }
}

export function generateInvestigationReportPdf(report: InvestigationReport): void {
  const renderer = new ReportRenderer(report);
  const doc = renderer.render();
  const filename = `SentinelX-Investigation-Report-${report.caseId}.pdf`;
  doc.save(filename);
}
