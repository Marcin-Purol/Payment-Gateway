import { Router } from "express";
import { pool } from "../../config/database";
import { getRabbitMqChannel } from "../../config/rabbitmq";
import { logger } from "../../config/logger";
import { asyncHandler } from "../../utils/asyncHandler";
import { getPoolHealthCheck } from "../../middlewares/connectionPoolManager";

export const healthRouter = Router();

interface HealthCheck {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    database: {
      status: "up" | "down";
      responseTime?: number;
      error?: string;
      poolInfo?: {
        healthy: boolean;
        stats: {
          totalConnections: number;
          activeConnections: number;
          idleConnections: number;
        };
      };
    };
    rabbitmq: {
      status: "up" | "down";
      responseTime?: number;
      error?: string;
    };
    memory?: {
      usage: NodeJS.MemoryUsage;
      limitMB?: number;
    };
  };
}

healthRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const health: Partial<HealthCheck> = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
    };

    res.status(200).json(health);
  })
);

healthRouter.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    const startTime = Date.now();
    const health: HealthCheck = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      checks: {
        database: { status: "down" },
        rabbitmq: { status: "down" },
        memory: {
          usage: process.memoryUsage(),
        },
      },
    };

    try {
      const dbStartTime = Date.now();
      const connection = await pool.getConnection();
      await connection.query("SELECT 1");
      connection.release();

      const poolHealth = await getPoolHealthCheck();

      health.checks.database = {
        status: "up",
        responseTime: Date.now() - dbStartTime,
        poolInfo: poolHealth,
      };
    } catch (error) {
      health.checks.database = {
        status: "down",
        error:
          error instanceof Error ? error.message : "Unknown database error",
      };
      health.status = "unhealthy";
    }
    try {
      const rabbitStartTime = Date.now();
      await getRabbitMqChannel();

      health.checks.rabbitmq = {
        status: "up",
        responseTime: Date.now() - rabbitStartTime,
      };
    } catch (error) {
      health.checks.rabbitmq = {
        status: "down",
        error:
          error instanceof Error ? error.message : "Unknown RabbitMQ error",
      };
      health.status = "unhealthy";
    }

    const responseTime = Date.now() - startTime;
    logger.info("Health check completed", {
      status: health.status,
      responseTime,
      dbStatus: health.checks.database.status,
      rabbitStatus: health.checks.rabbitmq.status,
      memoryUsageMB: Math.round(
        health.checks.memory!.usage.heapUsed / 1024 / 1024
      ),
    });

    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  })
);

healthRouter.get(
  "/live",
  asyncHandler(async (_req, res) => {
    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  })
);

healthRouter.get(
  "/metrics",
  asyncHandler(async (_req, res) => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };

    res.status(200).json(metrics);
  })
);
