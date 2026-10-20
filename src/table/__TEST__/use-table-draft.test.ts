import { expect, test, vi } from "vitest";

vi.mock("../actions", () => ({}));

import { isStaleFreeTable } from "../components/use-table-draft";

const openedAt = new Date("2026-10-19T12:00:00Z");

test("ignores a free-table placeholder rendered before this client opened the table", () => {
  expect(
    isStaleFreeTable(
      { id: "", createdAt: new Date("2026-10-19T11:59:59Z") },
      openedAt,
    ),
  ).toBe(true);
});

test("follows a free table rendered after the open, because the session closed", () => {
  expect(
    isStaleFreeTable(
      { id: "", createdAt: new Date("2026-10-19T12:00:05Z") },
      openedAt,
    ),
  ).toBe(false);
});

test("follows real session changes and tables this client did not open", () => {
  expect(
    isStaleFreeTable({ id: "session-2", createdAt: new Date(0) }, openedAt),
  ).toBe(false);
  expect(isStaleFreeTable({ id: "", createdAt: new Date(0) }, null)).toBe(
    false,
  );
});
