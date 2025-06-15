import winston from "winston";
import Transport from "winston-transport";
import axios from "axios";
import { notifyIfTooManyErrors } from "./alerting";
import { Sentry } from "./sentry";

const getLogLevel = (): string => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }

  switch (process.env.NODE_ENV) {
    case "production":
      return "warn";
    case "test":
      return "error";
    case "development":
    default:
      return "debug";
  }
};

class VictoriaLogsTransport extends Transport {
  log(info: any, callback: () => void) {
    setImmediate(() => this.emit("logged", info));
    const line =
      JSON.stringify({
        log: {
          level: info.level,
          message: info.message,
          ...info,
        },
        date: Date.now(),
        stream: "payment-gateway",
      }) + "\n";

    const victorialogsUrl =
      process.env.VICTORIALOGS_URL || "http://localhost:9428";

    axios
      .post(
        `${victorialogsUrl}/insert/jsonline?_stream_fields=stream&_time_field=date&_msg_field=log.message`,
        line,
        { headers: { "Content-Type": "application/stream+json" } }
      )
      .catch(() => {});
    callback();
  }
}

class SentryTransport extends Transport {
  log(info: any, callback: () => void) {
    setImmediate(() => this.emit("logged", info));
    if (info.level === "error") {
      notifyIfTooManyErrors();
      if (info instanceof Error) {
        Sentry.captureException(info);
      } else if (info.error instanceof Error) {
        Sentry.captureException(info.error, {
          extra: { ...info, error: undefined },
        });
      } else if (info.stack) {
        Sentry.captureException(new Error(info.stack), {
          extra: { ...info },
        });
      } else {
        Sentry.captureException(
          new Error(info.message || JSON.stringify(info)),
          {
            extra: { ...info },
          }
        );
      }
    }
    callback();
  }
}

export const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new VictoriaLogsTransport(),
    new SentryTransport(),
  ],
});
