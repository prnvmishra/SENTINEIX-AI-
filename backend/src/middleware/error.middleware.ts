import type { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: { message: err.message } });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  console.error("Unhandled error:", err);
  res.status(500).json({ error: { message } });
}
