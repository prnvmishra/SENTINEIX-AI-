import type { NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import type { EntityIntelResult } from "@shared/types";
import { checkEntityAgainstFraudIntel, isFraudIntelEnabled } from "../services/intel/fraudIntelClient.js";
import { checkPhoneAgainstCallTracer } from "../services/intel/callTracerClient.js";
import { ApiError } from "../middleware/error.middleware.js";

/**
 * Standalone "check this number before you trust the call" endpoint — does
 * NOT require a live session to be running. A citizen who just got a
 * suspicious call can paste the number here and get a real, on-demand
 * carrier/line-type/spam-score lookup (CallTracer, always) plus a real
 * crowd-sourced fraud-database lookup (FraudIntel India, when configured).
 */
export async function checkPhoneNumber(
  req: Request<{ number: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // NOTE: the validation throw must stay inside this try/catch — Express 4
  // does not catch throws/rejections from `async` handlers automatically,
  // so a throw before the try block would crash the whole server process.
  try {
    const rawNumber = req.params.number?.trim();
    if (!rawNumber || !/^\+?[0-9]{6,15}$/.test(rawNumber.replace(/[-\s]/g, ""))) {
      throw new ApiError(400, "Provide a valid phone number (digits only, 6-15 characters).");
    }

    const number = rawNumber.replace(/[-\s]/g, "");
    const checkId = `manual-check-${uuid()}`;

    const lookups: Promise<EntityIntelResult | null>[] = [checkPhoneAgainstCallTracer(checkId, number)];
    if (isFraudIntelEnabled()) {
      lookups.push(checkEntityAgainstFraudIntel(checkId, number, "phone"));
    }

    const settled = await Promise.allSettled(lookups);
    const results = settled
      .filter((r): r is PromiseFulfilledResult<EntityIntelResult | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((r): r is EntityIntelResult => r !== null);

    res.json({ results, fraudIntelEnabled: isFraudIntelEnabled() });
  } catch (error) {
    next(error);
  }
}
