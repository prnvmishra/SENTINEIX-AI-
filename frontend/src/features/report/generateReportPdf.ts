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

function pdfSafe(text: string): string {
  // jsPDF built-in fonts are Latin-1 only — strip unsupported chars so save() never crashes.
  return text.replace(/[^\u0009\u000a\u000d\u0020-\u00ff]/g, "?");
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; format: "JPEG" | "PNG"; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const maxEdge = 1400;
        const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);
        const isPng = url.startsWith("data:image/png");
        const dataUrl = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.85);
        resolve({ dataUrl, format: isPng ? "PNG" : "JPEG", width, height });
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
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
    const lines: string[] = this.doc.splitTextToSize(pdfSafe(text), CONTENT_WIDTH);
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
      const lines: string[] = this.doc.splitTextToSize(pdfSafe(item), CONTENT_WIDTH - 6);
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
      this.doc.text(pdfSafe(value), x, y + 4.6);
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
    this.doc.text("NATIONAL FRAUD INTELLIGENCE PLATFORM · INVESTIGATION ENGINE", MARGIN, 18.5);

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(COLORS.textPrimary);
    this.doc.text("INVESTIGATION REPORT", MARGIN, 26.5);

    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.textMuted);
    const generated = `Generated: ${new Date(this.report.generatedAt).toLocaleString("en-IN")}`;
    this.doc.text(generated, PAGE_WIDTH - MARGIN, 13, { align: "right" });
    this.doc.text(`Case ID: ${pdfSafe(this.report.caseId)}`, PAGE_WIDTH - MARGIN, 18, { align: "right" });

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

  async evidenceScreenshot() {
    if (!this.report.evidenceImageUrl) return;

    this.sectionTitle("Chat Screenshot Evidence");
    const loaded = await loadImageAsDataUrl(this.report.evidenceImageUrl);
    if (!loaded) {
      this.paragraph(
        "Screenshot evidence is attached to this case but could not be embedded in the PDF (network/CORS). Open the case in Historical Cases to view the image.",
        9,
        COLORS.warning,
      );
      return;
    }

    const maxWidthMm = CONTENT_WIDTH;
    const maxHeightMm = 120;
    const pxToMm = 0.15;
    let drawW = loaded.width * pxToMm;
    let drawH = loaded.height * pxToMm;
    const scale = Math.min(1, maxWidthMm / drawW, maxHeightMm / drawH);
    drawW *= scale;
    drawH *= scale;

    this.ensureSpace(drawH + 6);
    try {
      this.doc.addImage(loaded.dataUrl, loaded.format, MARGIN, this.cursorY, drawW, drawH);
      this.cursorY += drawH + 6;
    } catch (error) {
      console.warn("[report] addImage failed:", error);
      this.paragraph("Screenshot evidence present on the case record but could not be rendered into this PDF.", 9, COLORS.warning);
    }
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

  async render(): Promise<jsPDF> {
    const r = this.report;
    this.header();

    this.sectionTitle("Case Summary");
    this.keyValueGrid([
      ["Case Title", pdfSafe(r.title)],
      ["Impersonated Authority", pdfSafe(r.impersonatedAuthority)],
      ["Victim Alias", pdfSafe(r.victimAlias)],
      ["Location", pdfSafe(`${r.city}, ${r.state}`)],
    ]);
    this.threatBadge();

    this.sectionTitle("Incident Summary");
    this.paragraph(r.incidentSummary);

    await this.evidenceScreenshot();

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
      this.bulletList(
        r.evidence.map((item) => {
          if (item.startsWith("Screenshot evidence URL: data:") || item.includes("data:image")) {
            return "Screenshot evidence: embedded image above (inline copy)";
          }
          if (item.startsWith("Audio evidence URL: data:") || item.includes("data:audio")) {
            return "Audio evidence attached — play in Historical Cases (not inlined as base64 in this PDF)";
          }
          return item;
        }),
      );
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

export async function generateInvestigationReportPdf(report: InvestigationReport): Promise<void> {
  const renderer = new ReportRenderer(report);
  const doc = await renderer.render();
  const safeId = report.caseId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  const filename = `SentinelX-Investigation-Report-${safeId}.pdf`;

  try {
    doc.save(filename);
  } catch (saveError) {
    console.warn("[report] doc.save failed, trying blob download:", saveError);
    try {
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (blobError) {
      console.error("[report] blob download failed:", blobError);
      throw new Error("PDF download blocked by the browser — allow downloads for localhost and try again.");
    }
  }
}
