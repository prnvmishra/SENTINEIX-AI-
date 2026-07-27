import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/services/firebaseClient";

/**
 * Uploads real evidence (an actual call recording or a chat-screenshot
 * image) to Firebase Storage so it can be played back / viewed later from
 * the Historical Cases detail view — not just transcribed text. Best-effort:
 * if Storage isn't configured or the upload fails, the case still gets
 * registered without the media attached, it just won't be replayable.
 */
async function uploadCaseMedia(path: string, blob: Blob): Promise<string | null> {
  if (!storage) return null;
  try {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob);
    return await getDownloadURL(fileRef);
  } catch (error) {
    console.warn(`[media-storage] upload failed for ${path}:`, error);
    return null;
  }
}

export function uploadCaseRecording(caseId: string, blob: Blob): Promise<string | null> {
  const extension = blob.type.includes("wav") ? "wav" : blob.type.includes("mp3") || blob.type.includes("mpeg") ? "mp3" : "webm";
  return uploadCaseMedia(`recordings/${caseId}.${extension}`, blob);
}

export function uploadCaseEvidenceImage(caseId: string, blob: Blob): Promise<string | null> {
  const extension = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
  return uploadCaseMedia(`evidence/${caseId}.${extension}`, blob);
}
