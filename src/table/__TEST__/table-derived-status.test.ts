import { expect, test } from "vitest";
import type { Table, TableSession } from "../types";
import { getTableDerivedStatus } from "../types";

const item = {
  productId: "p1",
  productName: "Café",
  productPrice: 5,
  quantity: 1,
};

function table(session?: Partial<TableSession>): Table {
  return {
    id: "table-1",
    activeSession: session
      ? ({
          status: "OPEN",
          draft: [],
          order: { id: "o1", orderItems: [] },
          ...session,
        } as TableSession)
      : null,
  } as Table;
}

test("an opened table without products stays available", () => {
  expect(getTableDerivedStatus(table())).toBe("AVAILABLE");
  expect(getTableDerivedStatus(table({}))).toBe("AVAILABLE");
});

test("a table becomes occupied once a product is added or sent", () => {
  expect(getTableDerivedStatus(table({ draft: [item] }))).toBe("OCCUPIED");
  expect(
    getTableDerivedStatus(
      table({
        order: {
          id: "o1",
          orderItems: [{ ...item, id: "i1", total: 5, round: 1 }],
        },
      }),
    ),
  ).toBe("OCCUPIED");
});

test("a requested bill keeps its status", () => {
  expect(getTableDerivedStatus(table({ status: "BILL_REQUESTED" }))).toBe(
    "BILL_REQUESTED",
  );
});
