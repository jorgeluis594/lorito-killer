import { describe, expect, test } from "vitest";
import {
  describeServiceSession,
  sortServiceSessions,
} from "../use-cases/describe-service-session";

const item = {
  id: "i",
  productId: "p",
  productName: "A",
  productPrice: 10,
  quantity: 1,
  total: 10,
  round: 1,
};
const delivery = (status: "PENDING" | "DISPATCHED" | "DELIVERED") => ({
  status,
  name: null,
  phone: "987654321",
  address: "Av. Sol 123",
  reference: null,
  fee: 5,
  dispatchedAt: null,
});
const session = (
  id: string,
  openedAt: string,
  options: {
    status?: "PENDING" | "DISPATCHED" | "DELIVERED";
    paid?: boolean;
    items?: boolean;
  } = {},
) => ({
  id,
  openedAt: new Date(openedAt),
  delivery: options.status ? delivery(options.status) : null,
  paymentStatus: options.paid ? ("PAID" as const) : ("PENDING" as const),
  order: { id: "o", orderItems: options.items === false ? [] : [item] },
});

describe("describeServiceSession", () => {
  test("delivery: despachar, entregar y cobrar", () => {
    expect(
      describeServiceSession(
        session("a", "2026-10-15T10:00", { status: "PENDING" }),
      ),
    ).toEqual({ stage: "PREPARING", action: "DISPATCH" });
    expect(
      describeServiceSession(
        session("a", "2026-10-15T10:00", { status: "DISPATCHED", paid: true }),
      ),
    ).toEqual({ stage: "ON_THE_WAY", action: "DELIVER" });
    expect(
      describeServiceSession(
        session("a", "2026-10-15T10:00", { status: "DELIVERED" }),
      ),
    ).toEqual({ stage: "DELIVERED", action: "CHARGE" });
  });

  test("sin productos solo ofrece tomar el pedido", () => {
    expect(
      describeServiceSession(
        session("a", "2026-10-15T10:00", { status: "PENDING", items: false }),
      ).action,
    ).toBe("TAKE_ORDER");
    expect(
      describeServiceSession(session("a", "2026-10-15T10:00", { items: false }))
        .action,
    ).toBe("TAKE_ORDER");
  });

  test("para llevar: cobrar y luego entregar", () => {
    expect(
      describeServiceSession(session("a", "2026-10-15T10:00")).action,
    ).toBe("CHARGE");
    expect(
      describeServiceSession(session("a", "2026-10-15T10:00", { paid: true })),
    ).toEqual({ stage: "READY", action: "DELIVER" });
  });
});

describe("sortServiceSessions", () => {
  test("ordena por despachar, en camino, sin cobrar y luego por antigüedad", () => {
    const sorted = sortServiceSessions([
      session("delivered", "2026-10-15T09:00", { status: "DELIVERED" }),
      session("onTheWay", "2026-10-15T09:30", { status: "DISPATCHED" }),
      session("newer", "2026-10-15T11:00", { status: "PENDING" }),
      session("older", "2026-10-15T10:00", { status: "PENDING" }),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual([
      "older",
      "newer",
      "onTheWay",
      "delivered",
    ]);
  });
});
