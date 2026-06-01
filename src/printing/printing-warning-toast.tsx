"use client";

import { toast } from "@/shared/components/ui/use-toast";

const PRINTING_WARNING_DURATION_MS = 30_000;
const PRINTING_LOG_DURATION_MS = 60_000;

const serializePrintingWarningDetail = (detail: unknown): string | undefined => {
  if (detail === undefined) return undefined;

  const seen = new WeakSet<object>();

  try {
    const serialized = JSON.stringify(
      detail,
      (_key, value: unknown) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
            cause: value.cause,
          };
        }

        if (typeof value === "bigint") {
          return value.toString();
        }

        if (typeof value === "function") {
          return `[Function ${value.name || "anonymous"}]`;
        }

        if (value && typeof value === "object") {
          if (seen.has(value)) return "[Circular]";
          seen.add(value);
        }

        return value;
      },
      2,
    );

    if (serialized !== undefined) return serialized;
  } catch {
    // Fall back to a plain string below when the payload cannot be serialized.
  }

  return String(detail);
};

export const notifyPrintingWarning = (
  title: string,
  detail?: unknown,
): void => {
  const serializedDetail = serializePrintingWarningDetail(detail);

  toast({
    title,
    description: serializedDetail ? (
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
        {serializedDetail}
      </pre>
    ) : undefined,
    variant: "destructive",
    duration: PRINTING_WARNING_DURATION_MS,
  });
};

type PrintingLogEntry = {
  at: string;
  message: string;
  detail?: unknown;
};

const renderPrintingLog = (entries: PrintingLogEntry[]) => {
  const serializedEntries = serializePrintingWarningDetail(entries);

  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs">
      {serializedEntries}
    </pre>
  );
};

export const createPrintingToastLogger = (title: string) => {
  const entries: PrintingLogEntry[] = [];

  const handle = toast({
    title,
    description: renderPrintingLog(entries),
    duration: PRINTING_LOG_DURATION_MS,
  });

  const log = (message: string, detail?: unknown) => {
    entries.push({
      at: new Date().toLocaleTimeString(),
      message,
      detail,
    });

    handle.update({
      id: handle.id,
      title,
      description: renderPrintingLog(entries),
      duration: PRINTING_LOG_DURATION_MS,
      open: true,
    });
  };

  const fail = (message: string, detail?: unknown) => {
    entries.push({
      at: new Date().toLocaleTimeString(),
      message,
      detail,
    });

    handle.update({
      id: handle.id,
      title,
      description: renderPrintingLog(entries),
      variant: "destructive",
      duration: PRINTING_LOG_DURATION_MS,
      open: true,
    });
  };

  return {
    log,
    fail,
  };
};
