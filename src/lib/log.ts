import pino, { BaseLogger, Logger } from "pino";

export const pinoLogger: Logger =
  process.env["NODE_ENV"] === "production"
    ? pino()
    : pino({
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        },
        level: "debug",
      });

const logger = (
  type: "info" | "warn" | "debug" | "fatal" | "error",
  event: string,
  data: any,
) => pinoLogger[type]({ ...data, event });

export const log = {
  info: (event: string, data: any) => logger("info", event, data),
  warn: (event: string, data: any) => logger("warn", event, data),
  debug: (event: string, data: any) => logger("debug", event, data),
  fatal: (event: string, data: any) => logger("fatal", event, data),
  error: (event: string, data: any) => logger("error", event, data),
};
