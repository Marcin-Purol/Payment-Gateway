import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

interface SanitizationOptions {
  allowedFields?: string[];
  sanitizeHtml?: boolean;
  maxLength?: number;
  trimWhitespace?: boolean;
}

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

const escapeHtml = (str: string): string => {
  return str.replace(/[&<>"'/]/g, (match) => HTML_ENTITIES[match] || match);
};

const sanitizeSql = (str: string): string => {
  return str
    .replace(/[';-]/g, "")
    .replace(/--/g, "")
    .replace(
      /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/gi,
      ""
    )
    .trim();
};

const sanitizeValue = (value: any, options: SanitizationOptions): any => {
  if (typeof value !== "string") {
    return value;
  }

  let sanitized = value;

  if (options.trimWhitespace !== false) {
    sanitized = sanitized.trim();
  }

  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
    logger.warn("Input truncated due to length limit", {
      originalLength: value.length,
      maxLength: options.maxLength,
    });
  }

  if (options.sanitizeHtml !== false) {
    sanitized = escapeHtml(sanitized);
  }

  sanitized = sanitizeSql(sanitized);

  return sanitized;
};

const sanitizeObject = (obj: any, options: SanitizationOptions): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options));
  }

  if (typeof obj === "object") {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (options.allowedFields && !options.allowedFields.includes(key)) {
        logger.warn("Unauthorized field removed during sanitization", {
          field: key,
        });
        continue;
      }

      sanitized[key] = sanitizeObject(value, options);
    }

    return sanitized;
  }

  return sanitizeValue(obj, options);
};

export const sanitizeInput = (options: SanitizationOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const defaultOptions: SanitizationOptions = {
      sanitizeHtml: true,
      maxLength: 1000,
      trimWhitespace: true,
      ...options,
    };

    try {
      if (req.body && typeof req.body === "object") {
        req.body = sanitizeObject(req.body, defaultOptions);
      }

      if (req.query && typeof req.query === "object") {
        req.query = sanitizeObject(req.query, defaultOptions);
      }

      if (req.params && typeof req.params === "object") {
        req.params = sanitizeObject(req.params, defaultOptions);
      }

      logger.debug("Input sanitization completed", {
        path: req.path,
        method: req.method,
        hasBody: !!req.body,
        hasQuery: Object.keys(req.query).length > 0,
        hasParams: Object.keys(req.params).length > 0,
      });

      next();
    } catch (error) {
      logger.error("Error during input sanitization", {
        error: error instanceof Error ? error.message : "Unknown error",
        path: req.path,
        method: req.method,
      });

      next();
    }
  };
};

export const strictSanitization = sanitizeInput({
  maxLength: 255,
  sanitizeHtml: true,
  trimWhitespace: true,
});

export const lenientSanitization = sanitizeInput({
  maxLength: 5000,
  sanitizeHtml: false,
  trimWhitespace: true,
});
