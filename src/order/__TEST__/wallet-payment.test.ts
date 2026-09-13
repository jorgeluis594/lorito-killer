import { beforeEach, expect, test, vi } from "vitest";
import { Prisma } from "@prisma/client";
import {
  walletPaymentDetailsSchema,
  walletPaymentReference,
} from "../wallet-payment";
import { create, mapPrismaPaymentToPayment } from "../db_repository";
import type { Order, Payment } from "../types";

const db = vi.hoisted(() => ({
  order: { create: vi.fn() },
  orderItem: { create: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ default: () => db }));
vi.mock("@/lib/log", () => ({ log: { info: vi.fn(), error: vi.fn() } }));
vi.mock("@/product/db_repository", () => ({ UNIT_TYPE_MAPPER: {} }));
vi.mock("@/customer/db_repository", () => ({ prismaToCustomer: vi.fn() }));

const wallet: Payment = {
  method: "wallet",
  amount: 5,
  cashShiftId: "shift",
  name: "  Yape  ",
  operationCode: "  000123  ",
};
const cash: Payment = {
  method: "cash",
  amount: 5,
  cashShiftId: "shift",
  received_amount: 5,
  change: 0,
};
const order = (payments: Payment[]): Order => ({
  companyId: "company",
  orderItems: [],
  payments,
  total: 10,
  netTotal: 10,
  discountAmount: 0,
  documentType: "ticket",
  status: "completed",
  createdAt: new Date(),
});

beforeEach(() => vi.clearAllMocks());

test.for([undefined, null, "", "   ", 123, {}, "x".repeat(101)])(
  "rejects invalid wallet input %j before any mixed-payment write",
  async (value) => {
    for (const field of ["name", "operationCode"]) {
      const result = await create(
        order([cash, { ...wallet, [field]: value } as Payment]),
      );
      expect(result.success).toBe(false);
      expect(db.order.create).not.toHaveBeenCalled();
      expect(db.orderItem.create).not.toHaveBeenCalled();
    }
  },
);

test("trims both fields, preserves leading zeros and other payment data, and reads them back", async () => {
  db.order.create.mockImplementation(async ({ data }) => ({
    ...data,
    id: "order",
    total: new Prisma.Decimal(10),
    netTotal: new Prisma.Decimal(10),
    discountAmount: new Prisma.Decimal(0),
    payments: data.payments.create,
  }));
  const result = await create(order([cash, wallet]));
  expect(result.success).toBe(true);
  if (!result.success) return;
  expect(result.data.payments[0]).toMatchObject(cash);
  expect(result.data.payments[1]).toMatchObject({
    name: "Yape",
    operationCode: "000123",
    amount: 5,
  });
  expect(walletPaymentReference(result.data.payments[1])).toBe(
    "Yape · Operación: 000123",
  );
  expect(wallet.name).toBe("  Yape  ");
});

test("accepts exact limits and keeps incomplete historical payments readable", () => {
  expect(
    walletPaymentDetailsSchema.safeParse({
      name: "a".repeat(80),
      operationCode: "0".repeat(100),
    }).success,
  ).toBe(true);
  expect(
    walletPaymentDetailsSchema.safeParse({
      name: "a".repeat(81),
      operationCode: "1",
    }).success,
  ).toBe(false);
  const historical = mapPrismaPaymentToPayment({
    method: "WALLET",
    amount: new Prisma.Decimal(10),
    cashShiftId: "shift",
    data: null,
  });
  expect(walletPaymentReference(historical)).toBe("");
  expect(walletPaymentReference(cash)).toBe("");
});
