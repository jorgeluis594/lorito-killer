import { describe, expect, test } from "vitest";
import { isDeliveryOverdue } from "../use-cases/is-delivery-overdue";

const now = new Date("2026-10-09T18:00:00.000Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe("isDeliveryOverdue", () => {
  test.each([
    [119, false],
    [120, true],
    [180, true],
  ])("despachado hace %i min → %s", (minutes, expected) => {
    expect(
      isDeliveryOverdue(
        { status: "DISPATCHED", dispatchedAt: ago(minutes) },
        now,
      ),
    ).toBe(expected);
  });

  test("Pendiente nunca se resalta, aunque lleve horas", () => {
    expect(
      isDeliveryOverdue({ status: "PENDING", dispatchedAt: null }, now),
    ).toBe(false);
    expect(
      isDeliveryOverdue({ status: "PENDING", dispatchedAt: ago(300) }, now),
    ).toBe(false);
  });

  test("Entregado nunca se resalta", () => {
    expect(
      isDeliveryOverdue({ status: "DELIVERED", dispatchedAt: ago(300) }, now),
    ).toBe(false);
  });

  test("Despachado sin fecha no se resalta", () => {
    expect(
      isDeliveryOverdue({ status: "DISPATCHED", dispatchedAt: null }, now),
    ).toBe(false);
  });
});
