import { beforeEach, expect, test, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { AuthorizedUser } from "@/authorization/server";
import {
  tableReceiptsEqual,
  TablePaymentSchema,
  type TablePaymentInput,
} from "../payment-schema";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  session: vi.fn(),
  updateSession: vi.fn(),
  updateOrder: vi.fn(),
  createPayment: vi.fn(),
  company: vi.fn(),
  shift: vi.fn(),
  customer: vi.fn(),
  query: vi.fn(),
  document: vi.fn(),
  stock: vi.fn(),
  createStock: vi.fn(),
  transfers: vi.fn(),
  dispatch: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: () => ({ $transaction: mocks.transaction }),
}));
vi.mock("@/document/use_cases/build-and-persist-document", () => ({
  buildAndPersistDocument: mocks.document,
}));
vi.mock("@/document/db_repository", () => ({
  createDocument: vi.fn(),
  getLatestDocumentNumber: vi.fn(),
}));
vi.mock("@/product/db_repository", () => ({ find: vi.fn() }));
vi.mock("@/stock-transfer/use-cases/generate-order-stock-transfer", () => ({
  generateOrderStocksTransfers: mocks.transfers,
}));
vi.mock("@/order/db_repository", () => ({
  mapReceiptPrintOrderItem: (item: unknown) => item,
}));
import { payTable } from "../payment-repository";
const user: AuthorizedUser = {
  id: "mozo",
  companyId: "company",
  role: "WAITER",
  active: true,
  name: "Mozo",
  email: "mozo@example.test",
};
const input: TablePaymentInput = {
  sessionId: "61d88b85-e72a-48ed-90a5-7185eb3be5c7",
  revision: 1,
  orderVersion: "2026-09-12T12:00:00.000Z",
  expectedTotal: 100,
  method: "wallet",
  cashShiftId: "09408274-0732-4a8d-8ee7-b659e41a96b5",
  receipt: { documentType: "ticket" },
};
test("detects a remotely replaced ticket with invoice customer data", () => {
  expect(
    tableReceiptsEqual(input.receipt, {
      documentType: "invoice",
      customer: {
        documentType: "RUC",
        documentNumber: "12345678901",
        legalName: "Empresa",
        address: "Dirección fiscal",
      },
    }),
  ).toBe(false);
});
test("treats structurally equivalent receipts as unchanged", () => {
  const receipt: TablePaymentInput["receipt"] = {
    documentType: "receipt",
    customer: {
      documentType: "DNI",
      documentNumber: "12345678",
      legalName: "Cliente Prueba",
      address: "",
    },
  };
  expect(tableReceiptsEqual(receipt, structuredClone(receipt))).toBe(true);
});
function session() {
  return {
    id: input.sessionId,
    companyId: user.companyId,
    current: true,
    status: "OPEN",
    draft: [],
    draftRevision: 1,
    order: {
      id: "order",
      status: "PENDING",
      paymentStatus: "PENDING",
      updatedAt: new Date(input.orderVersion),
      total: new Prisma.Decimal(100),
      netTotal: new Prisma.Decimal(100),
      discountAmount: new Prisma.Decimal(0),
      payments: [],
      documents: [],
      orderItems: [
        {
          id: "item",
          kitchenStatus: "PREPARING",
          quantity: new Prisma.Decimal(1),
          total: new Prisma.Decimal(100),
        },
        {
          id: "cancelled",
          kitchenStatus: "CANCELLED",
          quantity: new Prisma.Decimal(0),
          total: new Prisma.Decimal(20),
        },
      ],
    },
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((fn) =>
    fn({
      $queryRaw: mocks.query,
      tableSession: { findFirst: mocks.session, update: mocks.updateSession },
      order: { update: mocks.updateOrder },
      payment: { create: mocks.createPayment },
      company: { findUnique: mocks.company },
      cashShift: { findFirst: mocks.shift },
      customer: { create: mocks.customer },
      product: { updateMany: mocks.stock },
      stockTransfer: { create: mocks.createStock },
      documentTaxDispatch: { create: mocks.dispatch },
    }),
  );
  mocks.session.mockResolvedValue(session());
  mocks.company.mockResolvedValue({
    active: true,
    billingCredentials: {
      receiptSerialNumber: "B001",
      invoiceSerialNumber: "F001",
    },
  });
  mocks.shift.mockResolvedValue({
    id: input.cashShiftId,
    user: { name: "Cajero" },
  });
  mocks.document.mockResolvedValue({ success: true, data: { id: "document" } });
  mocks.transfers.mockResolvedValue({ success: true, data: [] });
  mocks.customer.mockResolvedValue({ id: "customer" });
  mocks.stock.mockResolvedValue({ count: 1 });
});
test("waiter records a verified wallet payment without completing or freeing the table", async () => {
  expect((await payTable(user, input)).success).toBe(true);
  expect(mocks.shift).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        companyId: user.companyId,
        status: "OPEN",
      }),
    }),
  );
  expect(mocks.createPayment).toHaveBeenCalledWith({
    data: expect.objectContaining({
      method: "WALLET",
      cashShiftId: input.cashShiftId,
      amount: 100,
      data: {
        confirmedById: user.id,
        source: "table",
        name: null,
        operationCode: null,
      },
    }),
  });
  expect(mocks.updateOrder).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        sellerId: user.id,
        cashShiftId: input.cashShiftId,
      }),
    }),
  );
  expect(mocks.document.mock.calls[0][1].orderItems).toHaveLength(1);
  expect(mocks.updateOrder).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ paymentStatus: "PAID" }),
    }),
  );
  expect(mocks.updateSession).not.toHaveBeenCalled();
});
test("retries recover the existing payment without stock, receipt or payment duplication", async () => {
  const paid = session();
  mocks.session.mockResolvedValue({
    ...paid,
    status: "CLOSED",
    current: null,
    order: {
      ...paid.order,
      status: "COMPLETED",
      paymentStatus: "PAID",
      documents: [{ id: "original" }],
      payments: [{ method: "WALLET" }],
    },
  });
  expect(await payTable(user, input)).toMatchObject({
    success: true,
    data: { documentId: "original", state: "paid" },
  });
  expect(mocks.createPayment).not.toHaveBeenCalled();
  expect(mocks.document).not.toHaveBeenCalled();
  expect(mocks.transfers).not.toHaveBeenCalled();
});
test.for(["cash", "combine"] as const)(
  "waiter cannot forge %s payments",
  async (method) => {
    expect((await payTable(user, { ...input, method })).success).toBe(false);
    expect(mocks.createPayment).not.toHaveBeenCalled();
  },
);
test.for([
  { draft: [{ productId: "unsent" }] },
  { draftRevision: 2 },
  { current: null },
  { status: "CANCELLED" },
])("blocks unresolved or stale session %j", async (changes) => {
  mocks.session.mockResolvedValue({ ...session(), ...changes });
  expect((await payTable(user, input)).success).toBe(false);
  expect(mocks.createPayment).not.toHaveBeenCalled();
});
test("rejects a changed order version even when total is unchanged", async () => {
  expect(
    (
      await payTable(user, {
        ...input,
        orderVersion: "2026-09-12T11:00:00.000Z",
      })
    ).success,
  ).toBe(false);
  expect(mocks.createPayment).not.toHaveBeenCalled();
});
test("checks tenant ownership and rejects a missing session", async () => {
  mocks.session.mockResolvedValue(null);
  expect((await payTable(user, input)).success).toBe(false);
  expect(mocks.session).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: input.sessionId, companyId: user.companyId },
    }),
  );
});
test("does not free the table when receipt generation fails", async () => {
  mocks.document.mockResolvedValue({ success: false, message: "failed" });
  expect((await payTable(user, input)).success).toBe(false);
  expect(mocks.updateSession).not.toHaveBeenCalled();
});
test("cash referral persists receipt customer and leaves the table occupied with no financial writes", async () => {
  expect(
    (
      await payTable(user, {
        ...input,
        method: "register",
        receipt: {
          documentType: "receipt",
          customer: {
            documentType: "DNI",
            documentNumber: "12345678",
            legalName: "Cliente Prueba",
            address: "",
          },
        },
      })
    ).success,
  ).toBe(true);
  expect(mocks.updateOrder).toHaveBeenCalledWith({
    where: { id: "order" },
    data: { customerId: "customer", documentType: "receipt" },
  });
  expect(mocks.updateSession).toHaveBeenCalledWith({
    where: { id: input.sessionId },
    data: { status: "BILL_REQUESTED" },
  });
  expect(mocks.createPayment).not.toHaveBeenCalled();
  expect(mocks.document).not.toHaveBeenCalled();
  expect(mocks.transfers).not.toHaveBeenCalled();
});
test("cashier wallet still requires name and operation code", async () => {
  expect((await payTable({ ...user, role: "CASHIER" }, input)).success).toBe(
    false,
  );
  expect(mocks.createPayment).not.toHaveBeenCalled();
});
test("cashier completes referred account with exact combined total and cash change", async () => {
  mocks.session.mockResolvedValue({ ...session(), status: "BILL_REQUESTED" });
  const result = await payTable(
    { ...user, role: "CASHIER" },
    {
      ...input,
      method: "combine",
      contributions: { cash: 30, debit_card: 70, credit_card: 0, wallet: 0 },
      cashReceived: 50,
    },
  );
  expect(result.success).toBe(true);
  expect(mocks.createPayment).toHaveBeenCalledTimes(2);
  expect(mocks.createPayment.mock.calls[0][0].data.data).toMatchObject({
    received_amount: 50,
    change: 20,
  });
});
test("mismatched combined amounts and insufficient cash are rejected", async () => {
  for (const cashReceived of [20, 40]) {
    const result = await payTable(
      { ...user, role: "CASHIER" },
      {
        ...input,
        method: "combine",
        contributions: { cash: 30, debit_card: 60, credit_card: 0, wallet: 0 },
        cashReceived,
      },
    );
    expect(result.success).toBe(false);
  }
  expect(mocks.createPayment).not.toHaveBeenCalled();
});
test("missing or changed shared register cannot accept a payment", async () => {
  for (const shift of [null, { id: "new-shift" }]) {
    mocks.shift.mockResolvedValue(shift);
    expect((await payTable(user, input)).success).toBe(false);
  }
  expect(mocks.createPayment).not.toHaveBeenCalled();
});
test("stock failure aborts before payment and closure", async () => {
  mocks.transfers.mockResolvedValue({
    success: true,
    data: [
      {
        productId: "product",
        productName: "Lomo",
        value: -2,
        orderItemId: "item",
      },
    ],
  });
  mocks.stock.mockResolvedValue({ count: 0 });
  expect((await payTable(user, input)).success).toBe(false);
  expect(mocks.createPayment).not.toHaveBeenCalled();
  expect(mocks.updateSession).not.toHaveBeenCalled();
});
test("receipt validation rejects invalid identity, incomplete invoice, non-finite amounts and excess precision", () => {
  expect(TablePaymentSchema.safeParse(input).success).toBe(true);
  for (const expectedTotal of [NaN, Infinity, 0, 100.001])
    expect(
      TablePaymentSchema.safeParse({ ...input, expectedTotal }).success,
    ).toBe(false);
  expect(
    TablePaymentSchema.safeParse({
      ...input,
      receipt: { documentType: "invoice" },
    }).success,
  ).toBe(false);
  expect(
    TablePaymentSchema.safeParse({
      ...input,
      receipt: {
        documentType: "invoice",
        customer: {
          documentType: "RUC",
          documentNumber: "12345678901",
          legalName: "Empresa",
          address: "Dirección fiscal",
        },
      },
    }).success,
  ).toBe(true);
});
