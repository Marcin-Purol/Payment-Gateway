import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;

    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  set(key: string, data: any, ttlSeconds = 300): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttlSeconds * 1000,
    });

    logger.debug("Cache entry set", { key, ttlSeconds });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      logger.debug("Cache entry expired", { key });
      return null;
    }

    logger.debug("Cache hit", { key, age: Date.now() - entry.timestamp });
    return entry.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      logger.info("Cache cleared completely");
      return;
    }

    const keysToDelete = Array.from(this.cache.keys()).filter((key) =>
      key.includes(pattern)
    );

    keysToDelete.forEach((key) => this.cache.delete(key));
    logger.info("Cache invalidated", {
      pattern,
      deletedKeys: keysToDelete.length,
    });
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug("Cache cleanup completed", {
        expiredEntries: expiredKeys.length,
        remainingEntries: this.cache.size,
      });
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: Math.round((this.cache.size / this.maxSize) * 100),
    };
  }
}

export const cache = new SimpleCache(200);

export const cacheMiddleware = (ttlSeconds = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") {
      return next();
    }

    const user = (req as any).user;
    const cacheKey = `${req.originalUrl}:${user?.id || "anonymous"}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.debug("Serving from cache", {
        path: req.originalUrl,
        userId: user?.id,
      });
      return res.json(cachedData);
    }

    const originalJson = res.json;
    res.json = function (data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data, ttlSeconds);
        logger.debug("Response cached", {
          path: req.originalUrl,
          userId: user?.id,
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

export const invalidateCacheMiddleware = (patterns: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (data: any) {
      if (
        ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
        res.statusCode >= 200 &&
        res.statusCode < 300
      ) {
        patterns.forEach((pattern) => {
          cache.invalidate(pattern);
        });
        logger.debug("Cache invalidated after modification", {
          method: req.method,
          path: req.originalUrl,
          patterns,
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
};
