import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";
import { AppError } from "../utils/AppError";
import { Sentry } from "../config/sentry";

interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
  path: string;
  method: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl;
  const method = req.method;

  if (err instanceof AppError) {
    const errorResponse: ErrorResponse = {
      error: err.message,
      code: err.code,
      timestamp,
      path,
      method,
    };

    logger.warn("Application error", {
      error: err.message,
      code: err.code,
      statusCode: err.statusCode,
      path,
      method,
      userId: (req as any).user?.id,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    if (!err.isOperational || err.statusCode >= 500) {
      Sentry.captureException(err);
    }

    return res.status(err.statusCode).json(errorResponse);
  }

  if (err.name === "ValidationError") {
    const errorResponse: ErrorResponse = {
      error: "Validation failed",
      details: err.message,
      timestamp,
      path,
      method,
    };

    logger.warn("Validation error", {
      error: err.message,
      path,
      method,
      userId: (req as any).user?.id,
    });

    return res.status(400).json(errorResponse);
  }

  if (err.name === "JsonWebTokenError") {
    const errorResponse: ErrorResponse = {
      error: "Invalid token",
      code: "INVALID_TOKEN",
      timestamp,
      path,
      method,
    };

    logger.warn("JWT error", {
      error: err.message,
      path,
      method,
      ip: req.ip,
    });

    return res.status(401).json(errorResponse);
  }

  if (
    err.message.includes("ECONNREFUSED") ||
    err.message.includes("ETIMEDOUT")
  ) {
    const errorResponse: ErrorResponse = {
      error: "Service temporarily unavailable",
      code: "SERVICE_UNAVAILABLE",
      timestamp,
      path,
      method,
    };

    logger.error("Database connection error", {
      error: err.message,
      stack: err.stack,
      path,
      method,
    });

    Sentry.captureException(err);
    return res.status(503).json(errorResponse);
  }

  const errorResponse: ErrorResponse = {
    error:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
    code: "INTERNAL_ERROR",
    timestamp,
    path,
    method,
  };

  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path,
    method,
    userId: (req as any).user?.id,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  Sentry.captureException(err);
  res.status(500).json(errorResponse);
};
