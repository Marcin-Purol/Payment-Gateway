import { Request, Response, NextFunction } from "express";
import { validate } from "jsonschema";
import { logger } from "../config/logger";

export const validateSchema = (schema: object) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationResult = validate(req.body, schema);
    if (!validationResult.valid) {
      logger.warn("Validation failed", {
        path: req.path,
        errors: validationResult.errors.map((error) => error.stack),
        body: req.body,
      });
      return res.status(400).json({
        errors: validationResult.errors.map((error) => error.stack),
      });
    }
    next();
  };
};
