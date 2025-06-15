import { Request, Response, NextFunction } from "express";
import { pool } from "../config/database";
import { logger } from "../config/logger";

interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
}

export const connectionPoolMonitor = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || "20");

      const testConnection = await pool.getConnection();
      testConnection.release();

      (req as any).poolInfo = {
        connectionLimit,
        timestamp: Date.now(),
      };

      next();
    } catch (error) {
      logger.error("Error monitoring connection pool", { error });
      next();
    }
  };
};

export const getPoolHealthCheck = async (): Promise<{
  healthy: boolean;
  stats: PoolStats;
}> => {
  try {
    const connection = await pool.getConnection();
    connection.release();

    return {
      healthy: true,
      stats: {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
      },
    };
  } catch (error) {
    logger.error("Database health check failed", { error });
    return {
      healthy: false,
      stats: {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
      },
    };
  }
};

export const autoReleaseConnection = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    const originalJson = res.json;

    const cleanup = () => {
      const connection = (req as any).dbConnection;
      if (connection && typeof connection.release === "function") {
        try {
          connection.release();
          logger.debug("Database connection auto-released", {
            path: req.path,
            method: req.method,
          });
        } catch (error) {
          logger.warn("Error auto-releasing database connection", { error });
        }
      }
    };

    res.send = function (body: any) {
      cleanup();
      return originalSend.call(this, body);
    };

    res.json = function (body: any) {
      cleanup();
      return originalJson.call(this, body);
    };

    next();
  };
};
