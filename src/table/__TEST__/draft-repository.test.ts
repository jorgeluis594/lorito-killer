import { beforeEach, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  session: vi.fn(),
  updateSession: vi.fn(),
  products: vi.fn(),
  createItems: vi.fn(),
  totals: vi.fn(),
  updateOrder: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  default: () => ({ $transaction: db.transaction }),
}));
vi.mock("../db_repository", () => ({ findActiveSession: vi.fn() }));
import { updateTableDraft } from "../draft-repository";
import { TableDraftSchema } from "../schemas";

const input = {
  companyId: "company-a",
  userId: "waiter-a",
  sessionId: "session-a",
  revision: 2,
  operation: "send" as const,
};
const session = () => ({
  id: "session-a",
  tableId: "table-a",
  waiterId: "waiter-a",
  draftRevision: 2,
  status: "OPEN",
  draft: [
    { productId: "food", quantity: 2, notes: "Sin cebolla" },
    { productId: "drink", quantity: 1 },
  ],
  order: {
    id: "order-a",
    status: "PENDING",
    orderItems: [],
    payments: [],
    documents: [],
  },
});
beforeEach(() => {
  vi.resetAllMocks();
  db.transaction.mockImplementation(async (callback) =>
    callback({
      tableSession: { findFirst: db.session, updateMany: db.updateSession },
      product: { findMany: db.products },
      orderItem: { createMany: db.createItems, aggregate: db.totals },
      order: { update: db.updateOrder },
    }),
  );
  db.session.mockResolvedValue(session());
  db.updateSession.mockResolvedValue({ count: 1 });
  db.products.mockResolvedValue([
    { id: "food", name: "Lomo", price: 25.5, preparationStation: "KITCHEN" },
    { id: "drink", name: "Chicha", price: 6, preparationStation: "BAR" },
  ]);
  db.totals.mockResolvedValue({ _sum: { total: 57, netTotal: 57 } });
});

test("sends the saved draft atomically with current server prices and preparation stations", async () => {
  expect(await updateTableDraft(input)).toEqual({
    success: true,
    data: { revision: 3, tableId: "table-a" },
  });
  expect(db.session).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        id: "session-a",
        companyId: "company-a",
        current: true,
        table: { active: true },
      },
    }),
  );
  expect(db.updateSession).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        draftRevision: 2,
        current: true,
        status: "OPEN",
        companyId: "company-a",
      }),
      data: { draftRevision: { increment: 1 }, draft: [] },
    }),
  );
  const items = db.createItems.mock.calls[0][0].data;
  expect(
    items.map(
      (item: { preparationStation: string }) => item.preparationStation,
    ),
  ).toEqual(["KITCHEN", "BAR"]);
  expect(items[0].total.toNumber()).toBe(51);
  expect(items[0].notes).toBe("Sin cebolla");
  expect(db.updateOrder).toHaveBeenCalledWith({
    where: { id: "order-a" },
    data: { total: 57, netTotal: 57 },
  });
  expect(db.transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: "Serializable",
  });
});

test("rejects a stale or repeated send without creating items", async () => {
  db.session.mockResolvedValue({ ...session(), draftRevision: 3 });
  expect((await updateTableDraft(input)).success).toBe(false);
  expect(db.createItems).not.toHaveBeenCalled();
  expect(db.updateSession).not.toHaveBeenCalled();
});

test("does not write a round when another device wins the revision check", async () => {
  db.updateSession.mockResolvedValue({ count: 0 });
  expect((await updateTableDraft(input)).success).toBe(false);
  expect(db.createItems).not.toHaveBeenCalled();
});

test("saves an empty draft without sending anything to kitchen", async () => {
  expect(
    (await updateTableDraft({ ...input, operation: "save", items: [] }))
      .success,
  ).toBe(true);
  expect(db.createItems).not.toHaveBeenCalled();
});

test("releases only an empty session owned by the waiter, and cancels its empty order", async () => {
  db.session.mockResolvedValue({ ...session(), draft: [] });
  expect(
    (await updateTableDraft({ ...input, operation: "leave" })).success,
  ).toBe(true);
  expect(db.updateSession).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        current: null,
        status: "CANCELLED",
        cancellationReason: "Apertura sin pedido",
      }),
    }),
  );
  expect(db.updateOrder).toHaveBeenCalledWith({
    where: { id: "order-a" },
    data: { status: "CANCELLED" },
  });
});

test.for(["draft", "sent", "other-waiter"])(
  "leaving preserves a %s session",
  async (kind) => {
    const value = session();
    if (kind !== "draft") value.draft = [];
    if (kind === "sent") value.order.orderItems = [{ round: 1 }] as never[];
    if (kind === "other-waiter") value.waiterId = "someone-else";
    db.session.mockResolvedValue(value);
    expect(
      (await updateTableDraft({ ...input, operation: "leave" })).success,
    ).toBe(true);
    expect(db.updateSession).not.toHaveBeenCalled();
    expect(db.updateOrder).not.toHaveBeenCalled();
  },
);

test.for(["closed", "paid", "document", "missing"])(
  "protects %s orders",
  async (kind) => {
    const value = session();
    if (kind === "closed") value.status = "CLOSED";
    if (kind === "paid") value.order.payments = [{}] as never[];
    if (kind === "document") value.order.documents = [{}] as never[];
    db.session.mockResolvedValue(kind === "missing" ? null : value);
    expect((await updateTableDraft(input)).success).toBe(false);
    expect(db.updateSession).not.toHaveBeenCalled();
  },
);

test("unavailable products do not consume a draft or create a partial round", async () => {
  db.products.mockResolvedValue([]);
  expect((await updateTableDraft(input)).success).toBe(false);
  expect(db.updateSession).not.toHaveBeenCalled();
});

test("draft validation accepts clearing and rejects malformed quantities and long notes", () => {
  const base = {
    sessionId: "11111111-1111-4111-8111-111111111111",
    revision: 0,
  };
  expect(TableDraftSchema.safeParse({ ...base, items: [] }).success).toBe(true);
  for (const quantity of [0, -1, 1.2, NaN]) {
    expect(
      TableDraftSchema.safeParse({
        ...base,
        items: [{ productId: "a", quantity }],
      }).success,
    ).toBe(false);
  }
  expect(
    TableDraftSchema.safeParse({
      ...base,
      items: [{ productId: "a", quantity: 1, notes: "x".repeat(201) }],
    }).success,
  ).toBe(false);
});
