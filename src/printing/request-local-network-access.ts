"use client";

export type LocalNetworkAccessPreflightStatus =
  | "granted_or_reachable"
  | "blocked"
  | "timeout"
  | "unsupported";

export type LocalNetworkAccessPreflightResult = {
  status: LocalNetworkAccessPreflightStatus;
  url: string;
  elapsedMs: number;
  message: string;
  error?: unknown;
};

type LocalNetworkAccessRequestInit = RequestInit & {
  targetAddressSpace?: "local";
};

const IMIN_LOCAL_BRIDGE_URL = "http://127.0.0.1:8081/";
const LOCAL_NETWORK_ACCESS_TIMEOUT_MS = 1_200;

const elapsedSince = (startedAt: number) =>
  Math.round(window.performance.now() - startedAt);

export const requestIminLocalNetworkAccess = async (
  timeoutMs = LOCAL_NETWORK_ACCESS_TIMEOUT_MS,
): Promise<LocalNetworkAccessPreflightResult> => {
  if (
    typeof window === "undefined" ||
    typeof window.fetch !== "function" ||
    typeof window.AbortController !== "function"
  ) {
    return {
      status: "unsupported",
      url: IMIN_LOCAL_BRIDGE_URL,
      elapsedMs: 0,
      message: "Este navegador no permite ejecutar el preflight local.",
    };
  }

  const startedAt = window.performance.now();

  if (!window.isSecureContext) {
    return {
      status: "unsupported",
      url: IMIN_LOCAL_BRIDGE_URL,
      elapsedMs: elapsedSince(startedAt),
      message: "Local Network Access requiere un contexto seguro.",
    };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const requestInit: LocalNetworkAccessRequestInit = {
    mode: "no-cors",
    cache: "no-store",
    signal: controller.signal,
    targetAddressSpace: "local",
  };

  try {
    await window.fetch(IMIN_LOCAL_BRIDGE_URL, requestInit);

    return {
      status: "granted_or_reachable",
      url: IMIN_LOCAL_BRIDGE_URL,
      elapsedMs: elapsedSince(startedAt),
      message: "El preflight local termino sin bloqueo del navegador.",
    };
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === "AbortError";

    return {
      status: timedOut ? "timeout" : "blocked",
      url: IMIN_LOCAL_BRIDGE_URL,
      elapsedMs: elapsedSince(startedAt),
      message: timedOut
        ? "El preflight local expiro antes de recibir respuesta."
        : "El navegador bloqueo o rechazo el preflight local.",
      error,
    };
  } finally {
    window.clearTimeout(timeout);
  }
};
