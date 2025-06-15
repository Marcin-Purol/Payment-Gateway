import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../config/logger";

interface RequestWithId extends Request {
  requestId?: string;
}

export const requestIdMiddleware = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.get("X-Request-ID") || uuidv4();
  req.requestId = requestId;
  res.set("X-Request-ID", requestId);
  next();
};

export const requestLoggerMiddleware = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get("User-Agent");
  const requestId = req.requestId;

  logger.info("Incoming request", {
    requestId,
    method,
    url,
    ip,
    userAgent,
    userId: (req as any).user?.id,
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    const logLevel = statusCode >= 400 ? "warn" : "info";
    const message = "Request completed";

    logger[logLevel](message, {
      requestId,
      method,
      url,
      statusCode,
      duration,
      ip,
      userAgent,
      userId: (req as any).user?.id,
    });
  });

  next();
};
