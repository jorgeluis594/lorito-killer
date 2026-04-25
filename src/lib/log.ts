import pino, { type Logger, type TransportTargetOptions } from "pino";

type LogLevel = "info" | "warn" | "debug" | "fatal" | "error";
type LogData = Record<string, unknown>;
type RuntimeLogger = Pick<Logger, LogLevel>;

const isBrowser = typeof window !== "undefined";

const redact = {
  paths: [
    "password",
    "*.password",
    "token",
    "*.token",
    "secret",
    "*.secret",
    "authorization",
    "*.authorization",
    "cookie",
    "*.cookie",
    "billingToken",
    "*.billingToken",
    "billingCredentials",
    "*.billingCredentials",
  ],
  censor: "[REDACTED]",
};

const createBrowserLogger = (): RuntimeLogger => ({
  info: (data: unknown) => console.info(data),
  warn: (data: unknown) => console.warn(data),
  debug: (data: unknown) => console.debug(data),
  fatal: (data: unknown) => console.error(data),
  error: (data: unknown) => console.error(data),
});

const createServerLogger = (): RuntimeLogger => {
  if (process.env["NODE_ENV"] !== "production") {
    return pino({
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
      level: "debug",
      redact,
    });
  }

  const sourceToken = process.env["BETTER_STACK_SOURCE_TOKEN"];
  const ingestingHost = process.env["BETTER_STACK_INGESTING_HOST"];

  if (!sourceToken) {
    return pino({ redact });
  }

  const targets: TransportTargetOptions[] = [
    {
      target: "pino/file",
      level: "info",
      options: { destination: 1 },
    },
    {
      target: "@logtail/pino",
      level: process.env["BETTER_STACK_LOG_LEVEL"] || "warn",
      options: {
        sourceToken,
        ...(ingestingHost
          ? { options: { endpoint: `https://${ingestingHost}` } }
          : {}),
      },
    },
  ];

  return pino(
    { redact },
    pino.transport({
      targets,
    }),
  );
};

export const pinoLogger: RuntimeLogger = isBrowser
  ? createBrowserLogger()
  : createServerLogger();

const logger = (type: LogLevel, event: string, data: LogData = {}) =>
  pinoLogger[type]({ ...data, event });

export const log = {
  info: (event: string, data?: LogData) => logger("info", event, data),
  warn: (event: string, data?: LogData) => logger("warn", event, data),
  debug: (event: string, data?: LogData) => logger("debug", event, data),
  fatal: (event: string, data?: LogData) => logger("fatal", event, data),
  error: (event: string, data?: LogData) => logger("error", event, data),
};
