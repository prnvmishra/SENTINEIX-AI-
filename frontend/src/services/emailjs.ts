import emailjs from "@emailjs/browser";
import { env } from "@/services/env";

export const isEmailJsConfigured = Boolean(
  env.emailjs.serviceId && env.emailjs.templateId && env.emailjs.publicKey,
);

export interface ContactRequestPayload {
  name: string;
  organization: string;
  email: string;
  message: string;
}

function buildTemplateParams(payload: ContactRequestPayload) {
  const now = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return {
    from_name: payload.name,
    organization: payload.organization,
    name: payload.name,
    email: payload.email,
    reply_to: payload.email,
    message: payload.message,
    time: now,
    to_name: "SentinelX Operations",
  };
}

/**
 * Sends the landing contact form via EmailJS.
 * Optional thank-you mail: set VITE_EMAILJS_AUTOREPLY_TEMPLATE_ID
 * (To Email on that template must be {{email}}).
 *
 * Prefer enabling Auto-Reply on the main Contact Us template in the EmailJS UI —
 * that sends a thank-you without a second template.
 */
export async function sendContactRequest(payload: ContactRequestPayload): Promise<void> {
  if (!isEmailJsConfigured) {
    throw new Error(
      "EmailJS is not configured. Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY to frontend/.env",
    );
  }

  const params = buildTemplateParams(payload);

  await emailjs.send(env.emailjs.serviceId!, env.emailjs.templateId!, params, {
    publicKey: env.emailjs.publicKey!,
  });

  // Optional second template → thank-you to the submitter
  if (env.emailjs.autoReplyTemplateId) {
    try {
      await emailjs.send(env.emailjs.serviceId!, env.emailjs.autoReplyTemplateId, params, {
        publicKey: env.emailjs.publicKey!,
      });
    } catch {
      // Don't fail the main submit if auto-reply bounces — ops mail already went out
      console.warn("[EmailJS] Auto-reply template failed; contact request was still delivered.");
    }
  }
}
