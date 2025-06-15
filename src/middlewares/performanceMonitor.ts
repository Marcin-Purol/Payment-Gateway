import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

interface PerformanceMetrics {
  path: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  ip: string;
  userAgent?: string;
}

export const performanceMonitor = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    const originalSend = res.send;
    const originalJson = res.json;

    const logMetrics = () => {
      const responseTime = Date.now() - startTime;
      const user = (req as any).user;

      const metrics: PerformanceMetrics = {
        path: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        responseTime,
        userId: user?.id,
        ip: req.ip || "unknown",
        userAgent: req.get("User-Agent"),
      };

      if (responseTime > 1000) {
        logger.warn("Slow request detected", metrics);
      } else if (responseTime > 500) {
        logger.info("Moderate response time", metrics);
      } else {
        logger.debug("Request completed", metrics);
      }
    };

    res.send = function (body: any) {
      logMetrics();
      return originalSend.call(this, body);
    };

    res.json = function (body: any) {
      logMetrics();
      return originalJson.call(this, body);
    };

    next();
  };
};

export const queryPerformanceLogger = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalQuery = req.query;

    if (originalQuery && Object.keys(originalQuery).length > 0) {
      const queryParams = {
        path: req.originalUrl,
        query: originalQuery,
        userId: (req as any).user?.id,
      };

      const limit = parseInt((originalQuery.limit as string) || "0");
      if (limit > 100) {
        logger.warn("Large query limit detected", {
          ...queryParams,
          limit,
          recommendation:
            "Consider using smaller page sizes for better performance",
        });
      }
    }

    next();
  };
};
