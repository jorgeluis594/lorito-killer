import ExcelJS from "exceljs";
import { correlative } from "@/document/utils";
import { Document } from "@/document/types";
import { fullName, isBusinessCustomer } from "@/customer/utils";
import { plus } from "@/lib/utils";
import { format } from "date-fns";

const DOCUMENT_TYPE_MAPPER = {
  invoice: "Factura",
  receipt: "Boleta",
  ticket: "Ticket",
} as const;

const REPORT_SHEET_TITLE = "Reporte de ventas";
const REPORT_HEADERS = [
  "Tipo de comprobante",
  "Nro correlativo",
  "Fecha de venta",
  "Tipo de cliente",
  "Cliente",
  "Ruc cliente",
  "Dni",
  "Sub total",
  "Igv",
  "Total",
];

export const createWorkbookBuffer = async (documents: Document[]) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kogoz.pe";
  workbook.lastModifiedBy = "Kogoz.pe";
  workbook.created = new Date();
  workbook.modified = new Date();
  const reportSheet = workbook.addWorksheet(REPORT_SHEET_TITLE);
  reportSheet.addRow(REPORT_HEADERS);

  documents.forEach((doc) => {
    const customer = doc.customer;

    reportSheet.addRow([
      DOCUMENT_TYPE_MAPPER[doc.documentType],
      correlative(doc),
      format(doc.dateOfIssue, "dd/MM/yyyy hh:mm aa"),
      customer && isBusinessCustomer(customer) ? "Empresa" : "Natural",
      customer ? fullName(customer) : "Cliente general",
      customer ? customer.documentNumber : "",
      customer ? customer.documentNumber : "",
      doc.netTotal,
      doc.taxTotal,
      doc.total,
    ]);
  });

  const total = documents.reduce((acc, doc) => plus(acc)(doc.total), 0);
  const netTotal = documents.reduce((acc, doc) => plus(acc)(doc.netTotal), 0);

  reportSheet.addRow([]);
  reportSheet.addRow([]);
  reportSheet.addRow(["", "", "", "", "", "", "", "", "Sub total", netTotal]);
  reportSheet.addRow(["", "", "", "", "", "", "", "", "Igv", 0]);
  reportSheet.addRow(["", "", "", "", "", "", "", "", "Total", total]);

  return workbook.xlsx.writeBuffer();
};
