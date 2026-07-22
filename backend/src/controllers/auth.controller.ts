import type { Request, Response } from "express";
import type { LoginRequest, SessionResponse } from "@shared/types";
import { authenticate } from "../services/authService.js";
import { ApiError } from "../middleware/error.middleware.js";

export function login(req: Request<unknown, unknown, LoginRequest>, res: Response): void {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const result = authenticate(email, password);
  res.json(result);
}

export function me(req: Request, res: Response): void {
  if (!req.user) {
    throw new ApiError(401, "Not authenticated");
  }

  const response: SessionResponse = { user: req.user };
  res.json(response);
}
