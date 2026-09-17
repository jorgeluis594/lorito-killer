import { describe, expect, test } from "vitest";
import { isValidTransition } from "../use-cases/validate-table-action";

describe("isValidTransition", () => {
  test("allows an open paid table to be released", () => {
    expect(isValidTransition("OPEN", "CLOSED")).toBe(true);
  });
});
