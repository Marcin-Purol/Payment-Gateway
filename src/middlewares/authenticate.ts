import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt";
import { pool } from "../config/database";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const authorizeRoles = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    let connection;
    try {
      connection = await pool.getConnection();
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
        return res.status(403).json({ error: "Access denied" });
      }

      next();
    } catch (error) {
      console.error("Error authorizing roles:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      if (connection) connection.release();
    }
  };
};
