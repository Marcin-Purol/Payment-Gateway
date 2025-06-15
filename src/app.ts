import express from "express";
import { json } from "body-parser";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { transactionRouter } from "./api/transaction/transaction.controller";
import { merchantRouter } from "./api/merchant/merchant.controller";
import { healthRouter } from "./api/health/health.controller";
import { errorHandler } from "./middlewares/errorHandler";
import {
  requestIdMiddleware,
  requestLoggerMiddleware,
} from "./middlewares/requestLogger";
import { sanitizeInput } from "./middlewares/sanitization";
import { apiRateLimit, authRateLimit } from "./middlewares/advancedRateLimit";
import { createConnection } from "./config/database";
import { logger } from "./config/logger";
import {
  connectionPoolMonitor,
  autoReleaseConnection,
} from "./middlewares/connectionPoolManager";
import {
  performanceMonitor,
  queryPerformanceLogger,
} from "./middlewares/performanceMonitor";

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL || false
      : ["http://localhost:8080", "http://localhost:8082"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.use(performanceMonitor());
app.use(queryPerformanceLogger());
app.use(connectionPoolMonitor());
app.use(autoReleaseConnection());

if (process.env.NODE_ENV === "production") {
  app.use(apiRateLimit);
  app.use("/api/merchant/login", authRateLimit);
}

app.use(cookieParser());
app.use(json({ limit: "10mb" }));

app.use(sanitizeInput());

if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.header("x-forwarded-proto") !== "https") {
      res.redirect(`https://${req.header("host")}${req.url}`);
    } else {
      next();
    }
  });
}

app.use("/api/transaction", transactionRouter);
app.use("/api/merchant", merchantRouter);
app.use("/", healthRouter);

app.use(errorHandler);

createConnection().catch((error) => {
  logger.error("Failed to connect to database", error);
  process.exit(1);
});

export default app;
