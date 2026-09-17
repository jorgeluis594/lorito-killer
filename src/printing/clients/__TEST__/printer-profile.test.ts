import { expect, test, vi } from "vitest";
import { UpdatePrinterSchema } from "../schema";
import { updatePrinter } from "../use-cases/update-printer";

const valid = {
  id: "f019cbbc-429b-46cd-9d87-7f619db34376",
  status: "ACTIVE" as const,
  paperWidth: "MM58" as const,
  columns: 32,
  codepageMapping: "epson" as const,
  cutEnabled: true,
  feedBeforeCut: 3,
};

test.each([
  { ...valid, columns: 0 },
  { ...valid, feedBeforeCut: -1 },
  { ...valid, codepageMapping: "unknown" },
])("rejects invalid printer profile %#", (input) => {
  expect(UpdatePrinterSchema.safeParse(input).success).toBe(false);
});

test("passes the authenticated company to persistence", async () => {
  const save = vi.fn().mockResolvedValue({ success: true, data: valid });
  await updatePrinter(save, "company-1", valid);
  expect(save).toHaveBeenCalledWith("company-1", valid);
});
