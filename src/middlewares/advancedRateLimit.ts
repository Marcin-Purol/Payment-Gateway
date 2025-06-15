import rateLimit from "express-rate-limit";
import { Request } from "express";
import { logger } from "../config/logger";

const userLimitStore = new Map<string, { count: number; resetTime: number }>();

const cleanupUserStore = () => {
  const now = Date.now();
  for (const [key, value] of userLimitStore.entries()) {
    if (now > value.resetTime) {
      userLimitStore.delete(key);
    }
  }
};

setInterval(cleanupUserStore, 5 * 60 * 1000);

const customKeyGenerator = (req: Request): string => {
  const user = (req as any).user;
  const userId = user?.id;
  const ip = req.ip;

  if (userId) {
    return `user:${userId}:${ip}`;
  }

  return `ip:${ip}`;
};

export const createAdvancedRateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  userMaxRequests?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  const {
    windowMs,
    maxRequests,
    userMaxRequests = maxRequests * 2,
    message = "Too many requests, please try again later.",
    skipSuccessfulRequests = false,
  } = options;
  return rateLimit({
    windowMs,
    max: (req: Request) => {
      const user = (req as any).user;
      return user?.id ? userMaxRequests : maxRequests;
    },
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
      limit: maxRequests,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: customKeyGenerator,
    skipSuccessfulRequests,
    handler: (req: Request, res: any) => {
      const user = (req as any).user;
      logger.warn("Rate limit exceeded", {
        ip: req.ip,
        userId: user?.id,
        path: req.path,
        method: req.method,
        userAgent: req.get("User-Agent"),
      });

      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

export const authRateLimit = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  userMaxRequests: 10,
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true,
});

export const apiRateLimit = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
  userMaxRequests: 500,
  message: "Too many API requests, please try again later.",
});

export const staticRateLimit = createAdvancedRateLimit({
  windowMs: 1 * 60 * 1000,
  maxRequests: 60,
  userMaxRequests: 120,
  message: "Too many requests for static content.",
});

export const perUserRateLimit = (options: {
  maxOperations: number;
  windowMs: number;
  operation: string;
}) => {
  return (req: Request, res: any, next: any) => {
    const user = (req as any).user;

    if (!user?.id) {
      return next();
    }

    const key = `operation:${options.operation}:user:${user.id}`;
    const now = Date.now();
    const resetTime = now + options.windowMs;

    const userLimit = userLimitStore.get(key);

    if (!userLimit || now > userLimit.resetTime) {
      userLimitStore.set(key, { count: 1, resetTime });
      return next();
    }

    if (userLimit.count >= options.maxOperations) {
      logger.warn("Per-user operation limit exceeded", {
        userId: user.id,
        operation: options.operation,
        limit: options.maxOperations,
        path: req.path,
      });

      return res.status(429).json({
        error: `Too many ${options.operation} operations. Please try again later.`,
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000),
      });
    }

    userLimit.count++;
    userLimitStore.set(key, userLimit);
    next();
  };
};

export const uploadRateLimit = perUserRateLimit({
  maxOperations: 10,
  windowMs: 60 * 60 * 1000,
  operation: "file_upload",
});

export const reportRateLimit = perUserRateLimit({
  maxOperations: 5,
  windowMs: 60 * 60 * 1000,
  operation: "report_generation",
});
