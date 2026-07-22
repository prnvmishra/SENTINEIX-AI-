import type { NextFunction, Request, Response } from "express";
import { ApiError } from "./error.middleware.js";
import { resolveUser } from "../services/authService.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(new ApiError(401, "Missing bearer token"));
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = await resolveUser(token);
    next();
  } catch (error) {
    next(error);
  }
}
