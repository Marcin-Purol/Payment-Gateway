import { Request, Response, NextFunction } from "express";
import {
  validate,
  ValidationError as JsonSchemaValidationError,
} from "jsonschema";
import { logger } from "../config/logger";
import { ValidationError } from "../utils/AppError";

interface ValidationOptions {
  source?: "body" | "query" | "params";
  allowUnknown?: boolean;
}

export const validateSchema = (
  schema: object,
  options: ValidationOptions = { source: "body", allowUnknown: false }
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { source = "body", allowUnknown = false } = options;

    let dataToValidate: any;
    switch (source) {
      case "query":
        dataToValidate = req.query;
        break;
      case "params":
        dataToValidate = req.params;
        break;
      default:
        dataToValidate = req.body;
    }

    const validationResult = validate(dataToValidate, schema);

    if (!validationResult.valid) {
      const errorDetails = validationResult.errors.map(
        (error: JsonSchemaValidationError) => ({
          field: error.property.replace("instance.", ""),
          message: error.message,
          value: error.instance,
        })
      );

      logger.warn("Validation failed", {
        path: req.path,
        source,
        errors: errorDetails,
        data: dataToValidate,
        userId: (req as any).user?.id,
      });

      const mainError = validationResult.errors[0];
      const field = mainError.property.replace("instance.", "") || "unknown";

      throw new ValidationError(
        `Validation failed for field '${field}': ${mainError.message}`,
        field
      );
    }

    if (
      !allowUnknown &&
      typeof dataToValidate === "object" &&
      dataToValidate !== null
    ) {
      const schemaProps = (schema as any).properties || {};
      const extraProps = Object.keys(dataToValidate).filter(
        (key) => !(key in schemaProps)
      );

      if (extraProps.length > 0) {
        logger.warn("Unknown properties detected", {
          path: req.path,
          extraProps,
          userId: (req as any).user?.id,
        });

        throw new ValidationError(
          `Unknown properties not allowed: ${extraProps.join(", ")}`,
          "unknown_properties"
        );
      }
    }

    next();
  };
};
