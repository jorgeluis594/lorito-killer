import { expect, test, vi } from "vitest";
import ExcelJS from "exceljs";
import { Prisma } from "@prisma/client";
import { createWorkbookBufferSire } from "../renders/sire_list_xlsx";
import { getMany } from "../db_repository";
import type { Document } from "../types";
import type { Company } from "@/company/types";

const db = vi.hoisted(() => ({ document: { findMany: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ default: () => db }));
vi.mock("@/lib/log", () => ({ log: { info: vi.fn() } }));
vi.mock("@/customer/db_repository", () => ({ findCustomer: vi.fn() }));
vi.mock("@/product/db_repository", () => ({ UNIT_TYPE_MAPPER: {} }));

const document: Document = { id: "document", companyId: "company", orderId: "order", documentType: "ticket", status: "registered", series: "T001", number: "1", total: 10, netTotal: 10, taxTotal: 0, discountAmount: 0, dateOfIssue: new Date("2026-09-10T12:00:00Z"), payments: [
  { method: "cash", amount: 6, cashShiftId: "shift", received_amount: 6, change: 0 },
  { method: "wallet", amount: 4, cashShiftId: "shift", name: "Plin", operationCode: "000123" },
] };

test("report reads wallet details from the selected tenant's documents", async () => {
  db.document.findMany.mockResolvedValue([{ ...document, documentType: "TICKET", status: "REGISTERED", order: { status: "COMPLETED", paymentStatus: "PAID", createdAt: new Date(), orderItems: [], payments: [{ method: "WALLET", amount: new Prisma.Decimal(4), cashShiftId: "shift", data: { name: "Plin", operationCode: "000123" } }] } }]);
  const result = await getMany({ companyId: "company", ticket: true });
  expect(db.document.findMany.mock.calls[0][0]).toMatchObject({ where: { companyId: "company" }, include: { order: { select: { payments: true } } } });
  expect(result.success).toBe(true);
  if (result.success) expect(result.data[0].payments?.[0]).toMatchObject({ name: "Plin", operationCode: "000123", amount: 4 });
});

test("Excel keeps the sales sheet and exports only wallet amounts with literal references", async () => {
  const bytes = await createWorkbookBufferSire([document, { ...document, id: "old", payments: undefined }], { name: "QA", ruc: "20000000001" } as Company);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  expect(workbook.getWorksheet("Reporte de ventas")).toBeDefined();
  const sheet = workbook.getWorksheet("Pagos por billetera")!;
  expect(sheet.rowCount).toBe(2);
  expect(sheet.getCell("C2").value).toBe("Plin");
  expect(sheet.getCell("D2").value).toBe("000123");
  expect(sheet.getCell("D2").type).toBe(ExcelJS.ValueType.String);
  expect(sheet.getCell("E2").value).toBe(4);
});
