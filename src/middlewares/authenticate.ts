import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt";
import { pool } from "../config/database";
import { logger } from "../config/logger";
import {
  UnauthorizedError,
  ForbiddenError,
  DatabaseError,
} from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let token = req.cookies?.accessToken;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    throw new UnauthorizedError("No token provided");
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    logger.warn("Invalid token attempt", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      error: error instanceof Error ? error.message : "Unknown error",
      path: req.path,
    });

    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Token expired");
    }

    throw new UnauthorizedError("Invalid token");
  }
};

export const authorizeRoles = (allowedRoles: string[]) => {
  return asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;

      if (!user || !user.id) {
        throw new UnauthorizedError("User not authenticated");
      }

      let connection;
      try {
        connection = await pool.getConnection();

        if (user.type === "merchant") {
          logger.info("Merchant access granted", {
            userId: user.id,
            requiredRoles: allowedRoles,
            path: req.path,
          });
          return next();
        }

        const rolesResult = await connection.query(
          `SELECT r.name FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ?`,
          [user.id]
        );

        const userRoles = Array.isArray(rolesResult)
          ? rolesResult.map((role: any) => role.name)
          : [];

        const hasRole = allowedRoles.some((role) => userRoles.includes(role));

        if (!hasRole) {
          logger.warn("Access denied - insufficient roles", {
            userId: user.id,
            userRoles,
            requiredRoles: allowedRoles,
            path: req.path,
          });
          throw new ForbiddenError(
            `Access denied. Required roles: ${allowedRoles.join(", ")}`
          );
        }

        logger.info("Role-based access granted", {
          userId: user.id,
          userRoles,
          requiredRoles: allowedRoles,
          path: req.path,
        });

        next();
      } catch (error) {
        if (
          error instanceof UnauthorizedError ||
          error instanceof ForbiddenError
        ) {
          throw error;
        }

        logger.error("Error during role authorization", {
          error: error instanceof Error ? error.message : "Unknown error",
          userId: user.id,
          path: req.path,
        });

        throw new DatabaseError("Error checking user permissions");
      } finally {
        if (connection) connection.release();
      }
    }
  );
};
