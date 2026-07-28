/** True when this case was opened from a chat/WhatsApp screenshot, not audio. */
export function isScreenshotEvidenceCase(
  source?: string,
  title?: string,
  evidenceImageUrl?: string,
  recordingUrl?: string,
): boolean {
  if (source === "screenshot-upload") return true;
  if (title?.toLowerCase().includes("screenshot")) return true;
  return Boolean(evidenceImageUrl && !recordingUrl);
}
