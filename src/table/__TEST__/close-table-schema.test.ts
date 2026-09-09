import { describe, expect, test } from "vitest";
import { CloseTableSchema } from "../schemas";

describe("CloseTableSchema", () => {
  test("requires and trims the cancellation reason", () => {
    expect(
      CloseTableSchema.safeParse({ tableId: "table-1", cancelled: true, cancellationReason: "   " }).success,
    ).toBe(false);

    const result = CloseTableSchema.safeParse({
      tableId: "table-1",
      cancelled: true,
      cancellationReason: "  error de registro  ",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.cancellationReason).toBe("error de registro");
  });

  test("rejects cancellation reasons longer than 500 characters", () => {
    expect(
      CloseTableSchema.safeParse({
        tableId: "table-1",
        cancelled: true,
        cancellationReason: "a".repeat(501),
      }).success,
    ).toBe(false);
  });

  test("allows closing a table without a cancellation reason", () => {
    expect(CloseTableSchema.safeParse({ tableId: "table-1", cancelled: false }).success).toBe(true);
  });
});
