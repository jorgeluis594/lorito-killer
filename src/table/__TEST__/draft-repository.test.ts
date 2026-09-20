import { beforeEach, expect, test, vi } from "vitest";

const db = vi.hoisted(() => ({
  session: vi.fn(),
  updateSession: vi.fn(),
  products: vi.fn(),
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
} as const;
const session = () => ({
  id: "session-a",
  tableId: "table-a",
  waiterId: "waiter-a",
  draftRevision: 2,
  status: "OPEN",
  draft: [{ productId: "food", quantity: 2, notes: "Sin cebolla" }],
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
      order: { update: db.updateOrder },
    }),
  );
  db.session.mockResolvedValue(session());
  db.updateSession.mockResolvedValue({ count: 1 });
  db.products.mockResolvedValue([{ id: "food", name: "Lomo", price: 25.5 }]);
});

test("reads the protected draft without consuming it", async () => {
  expect(await updateTableDraft({ ...input, operation: "read" })).toEqual({
    success: true,
    data: { revision: 2, tableId: "table-a", items: session().draft },
  });
  expect(db.updateSession).not.toHaveBeenCalled();
});

test("rejects a stale draft revision", async () => {
  db.session.mockResolvedValue({ ...session(), draftRevision: 3 });
  expect(
    (await updateTableDraft({ ...input, operation: "read" })).success,
  ).toBe(false);
});

test("saves an empty draft", async () => {
  expect(
    (await updateTableDraft({ ...input, operation: "save", items: [] }))
      .success,
  ).toBe(true);
  expect(db.updateSession).toHaveBeenCalledOnce();
});

test("draft validation rejects malformed quantities and long notes", () => {
  const base = {
    sessionId: "11111111-1111-4111-8111-111111111111",
    revision: 0,
  };
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
