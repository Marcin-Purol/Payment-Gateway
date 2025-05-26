import winston from "winston";
import Transport from "winston-transport";
import axios from "axios";
import { Sentry } from "./sentry";
import { notifyIfTooManyErrors } from "./alerting";

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
    axios
      .post(
        "http://victorialogs:9428/insert/jsonline?_stream_fields=stream&_time_field=date&_msg_field=log.message",
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
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new VictoriaLogsTransport(),
    new SentryTransport(),
  ],
});
