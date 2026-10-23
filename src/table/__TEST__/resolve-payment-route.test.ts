import { expect, test, vi } from "vitest";
import { resolvePaymentRoute } from "../use-cases/resolve-payment-route";

const paymentHref = "/dashboard/tables/delivery/old/payment?session=old";

test("Ir al cobro tras OrderLocked llega al cobro sin reintentar el guardado bloqueado", async () => {
  const flush = vi.fn(async () => false);
  expect(await resolvePaymentRoute({ paymentHref, sessionId: "s1" })).toEqual({
    ok: true,
    href: "/dashboard/tables/delivery/old/payment?session=s1",
  });
  expect(flush).not.toHaveBeenCalled();
});

test("el cobro normal guarda primero y no navega si el guardado falla", async () => {
  const flush = vi.fn(async () => false);
  expect(
    await resolvePaymentRoute({ paymentHref, sessionId: "s1", flush }),
  ).toEqual({ ok: false, reason: "unsaved" });
  expect(flush).toHaveBeenCalledOnce();
});

test("sin sesión no hay cobro", async () => {
  expect(await resolvePaymentRoute({ paymentHref, sessionId: "" })).toEqual({
    ok: false,
    reason: "no-session",
  });
});
