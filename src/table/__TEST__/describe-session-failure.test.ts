import { expect, test } from "vitest";
import {
  noTableFailureMessage,
  releaseLabel,
  serviceChannel,
  sessionFailureActions,
  sessionFailureMessage,
  type SessionFailureType,
} from "../use-cases/describe-session-failure";

const types: SessionFailureType[] = [
  "SessionChanged",
  "SessionClosed",
  "OrderLocked",
  "SessionHasProducts",
  "SessionInvalid",
  "SessionUnavailable",
  "RoundConflict",
];

test("traduce SessionChanged a «El pedido cambió en otro dispositivo…» en un pedido sin mesa", () => {
  expect(noTableFailureMessage("SessionChanged")).toBe(
    "El pedido cambió en otro dispositivo. Tus cambios siguen aquí; revisa el pedido antes de continuar.",
  );
});

test("traduce SessionClosed a «Este pedido ya se cerró.»", () => {
  expect(noTableFailureMessage("SessionClosed")).toBe(
    "Este pedido ya se cerró.",
  );
});

test("traduce RoundConflict a «Otro envío cambió el pedido. Actualiza el pedido y vuelve a intentarlo.»", () => {
  expect(noTableFailureMessage("RoundConflict")).toBe(
    "Otro envío cambió el pedido. Actualiza el pedido y vuelve a intentarlo.",
  );
});

test("traduce OrderLocked a «Este pedido ya no admite cambios.»", () => {
  expect(noTableFailureMessage("OrderLocked")).toBe(
    "Este pedido ya no admite cambios.",
  );
});

test("ofrece Ver pedido guardado para SessionChanged y RoundConflict, Volver a Mesas para SessionClosed, SessionUnavailable y SessionInvalid, y Volver a Mesas e Ir al cobro para OrderLocked", () => {
  expect(sessionFailureActions("SessionChanged")).toEqual(["viewSaved"]);
  expect(sessionFailureActions("RoundConflict")).toEqual(["viewSaved"]);
  for (const type of [
    "SessionClosed",
    "SessionUnavailable",
    "SessionInvalid",
  ] as const)
    expect(sessionFailureActions(type)).toEqual(["backToTables"]);
  expect(sessionFailureActions("OrderLocked")).toEqual([
    "backToTables",
    "goToPayment",
  ]);
  expect(sessionFailureActions("SessionHasProducts")).toEqual([]);
  expect(sessionFailureActions(undefined)).toEqual([]);
});

test("conserva el mensaje del servidor en una mesa", () => {
  const result = {
    success: false as const,
    type: "SessionClosed" as const,
    message: "La mesa cambió en otro dispositivo.",
  };
  expect(sessionFailureMessage(result, "TABLE")).toBe(result.message);
  expect(
    sessionFailureMessage({ ...result, type: undefined }, "TAKE_AWAY"),
  ).toBe(result.message);
  expect(sessionFailureMessage(result, "TAKE_AWAY")).toBe(
    "Este pedido ya se cerró.",
  );
  expect(sessionFailureMessage(result, "DELIVERY")).toBe(
    "Este pedido ya se cerró.",
  );
});

test("ignora un type que no es de sesión y conserva el mensaje", () => {
  expect(
    sessionFailureMessage(
      { success: false, type: "AuthError", message: "Sin acceso" },
      "TAKE_AWAY",
    ),
  ).toBe("Sin acceso");
});

test("ningún texto de pedido sin mesa contiene «mesa»", () => {
  for (const type of types)
    expect(noTableFailureMessage(type).toLowerCase()).not.toMatch(/\bmesa\b/);
});

test("nombra el botón de descartar «Liberar mesa», «Liberar pedido» o «Liberar delivery» según el canal", () => {
  expect(releaseLabel("TABLE")).toBe("Liberar mesa");
  expect(releaseLabel("TAKE_AWAY")).toBe("Liberar pedido");
  expect(releaseLabel("DELIVERY")).toBe("Liberar delivery");
});

test("deduce el canal de la sesión", () => {
  expect(serviceChannel({ tableId: "t", delivery: null })).toBe("TABLE");
  expect(serviceChannel({ tableId: null, delivery: null })).toBe("TAKE_AWAY");
  expect(
    serviceChannel({ tableId: null, delivery: { status: "PENDING" } }),
  ).toBe("DELIVERY");
});
