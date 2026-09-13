import { describe, expect, test } from "vitest";
import type { TableWithSession } from "../types";
import { reconcileSelectedTableId } from "../use-cases/reconcile-table-selection";

function occupiedTable(overrides: {
  currentRound?: number;
  readyKitchenTickets?: number;
} = {}): TableWithSession {
  return {
    id: "table-1",
    activeSession: {
      id: "session-1",
      currentRound: overrides.currentRound ?? 1,
      readyKitchenTickets: overrides.readyKitchenTickets ?? 0,
    },
  } as TableWithSession;
}

describe("reconcileSelectedTableId", () => {
  test("preserves the modal selection after round and kitchen updates", () => {
    expect(
      reconcileSelectedTableId(
        [occupiedTable({ currentRound: 2 })],
        "table-1",
      ),
    ).toBe("table-1");
    expect(
      reconcileSelectedTableId(
        [occupiedTable({ currentRound: 2, readyKitchenTickets: 1 })],
        "table-1",
      ),
    ).toBe("table-1");
  });

  test("clears the modal selection when the session is no longer active", () => {
    expect(
      reconcileSelectedTableId(
        [{ ...occupiedTable(), activeSession: null }],
        "table-1",
      ),
    ).toBeNull();
  });

  test("clears the modal selection when the table is no longer present", () => {
    expect(reconcileSelectedTableId([], "table-1")).toBeNull();
  });
});
