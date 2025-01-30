import ExcelJS from "exceljs";
import { correlative } from "@/document/utils";
import { Document } from "@/document/types";
import { fullName, isBusinessCustomer } from "@/customer/utils";
import {localizeOnlyDate, plus, shortLocalizeDate} from "@/lib/utils";
import {Company} from "@/company/types";

const DOCUMENT_TYPE_MAPPER = {
  invoice: "Factura",
  receipt: "Boleta",
  ticket: "Ticket",
} as const;

const REPORT_SHEET_TITLE = "Reporte de ventas";
const REPORT_HEADERS_ONE = [
  "NÚMERO",
  "FECHA DE",
  "FECHA",
  "COMPROBANTE DE PAGO",
  "",
  "",
  "INFORME DEL CLIENTE",
  "",
  "",
  "VALOR",
  "BASE",
  "IMPORTE DE LA OPERACIÓN",
  "",
  "",
  "",
  "OTROS TRIBUTOS",
  "IMPORTE",
  "",
  "REFERENCIA DEL COMPROBANTE DE PAGO",
  "",
  "",
  "",
]
const REPORT_HEADERS_TWO = [
  "CORRELATIVO",
  "EMISIÓN DEL",
  "DE",
  "O DOCUMENTO",
  "",
  "",
  "",
  "",
  "",
  "FACTURADO",
  "IMPONIBLE",
  "EXONERADA O INAFECTA",
  "",
  "",
  "",
  "Y CARGOS QUE",
  "TOTAL",
  "TIPO",
  "O DOCUMENTO ORIGINAL QUE SE MODIFICA",
  "",
  "",
  "",
]
const REPORT_HEADERS_THREE = [
  "DEL REGISTRO O",
  "COMPROBANTE",
  "VENCIMIENTO",
  "",
  "N° SERIE O",
  "",
  "DOCUMENTO DE IDENTIDAD",
  "",
  "APELLIDOS Y NOMBRES,",
  "DE LA",
  "DE LA",
  "",
  "",
  "ISC",
  "IGV Y/O IPM",
  "NO FORMAN PARTE",
  "DEL",
  "DE",
  "",
  "",
  "",
  "N° DEL",
]
const REPORT_HEADERS_FOUR = [
  "CÓDIGO UNICO",
  "DE PAGO",
  "Y/O PAGO",
  "TIPO",
  "N° DE SERIE DE LA",
  "NÚMERO",
  "TIPO",
  "NÚMERO",
  "DENOMINACIÓN",
  "EXPORTACIÓN",
  "OPERACIÓN",
  "EXONERADA",
  "INAFECTA",
  "",
  "",
  "DE LA",
  "COMPROBANTE",
  "CAMBIO",
  "FECHA",
  "TIPO",
  "SERIE",
  "COMPROBANTE",
]
const REPORT_HEADERS_FIVE = [
  "DE LA OPERACIÓN",
  "O DOCUMENTO",
  "",
  "",
  "MÁQUINA REGISTRADORA",
  "",
  "",
  "",
  "O RAZÓN SOCIAL",
  "",
  "GRAVADA",
  "",
  "",
  "",
  "",
  "BASE IMPONIBLE",
  "DE PAGO",
  "",
  "",
  "",
  "",
  "DE PAGO O DOCUMENTO",
];

const borderStyle = {
  top: { style: 'thin', color: {argb:'000000'}},
  left: { style: 'thin', color: {argb:'000000'}},
  bottom: { style: 'thin', color: {argb:'000000'}},
  right: { style: 'thin', color: {argb:'000000'}}
} as ExcelJS.Borders;

const borderStyleFirst = {
  top: { style: 'thin', color: {argb:'000000'}},
  left: { style: 'thin', color: {argb:'000000'}},
  right: { style: 'thin', color: {argb:'000000'}}
} as ExcelJS.Borders;

const borderStyleMiddle = {
  left: { style: 'thin', color: {argb:'000000'}},
  right: { style: 'thin', color: {argb:'000000'}}
} as ExcelJS.Borders;

const borderStyleLast = {
  left: { style: 'thin', color: {argb:'000000'}},
  bottom: { style: 'thin', color: {argb:'000000'}},
  right: { style: 'thin', color: {argb:'000000'}}
} as ExcelJS.Borders;

export const createWorkbookBufferSire = async (documents: Document[], company: Company) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kogoz.pe";
  workbook.lastModifiedBy = "Kogoz.pe";
  workbook.created = new Date();
  workbook.modified = new Date();
  const reportSheet = workbook.addWorksheet(REPORT_SHEET_TITLE);

  reportSheet.addRow(["PERIODO:","1"]);
  reportSheet.addRow(["RUC:",company.ruc]);
  reportSheet.addRow(["APELLIDOS Y NOMBRES, DENOMINACIÓN O RAZÓN SOCIAL:","","","","","",company.name]);
  reportSheet.addRow([]);
  reportSheet.addRow(REPORT_HEADERS_ONE);
  reportSheet.addRow(REPORT_HEADERS_TWO);
  reportSheet.addRow(REPORT_HEADERS_THREE);
  reportSheet.addRow(REPORT_HEADERS_FOUR);
  reportSheet.addRow(REPORT_HEADERS_FIVE);

  reportSheet.mergeCells("A3:F3");
  reportSheet.mergeCells("D5:F6");
  reportSheet.mergeCells("G5:I6");
  reportSheet.mergeCells("G7:H7");
  reportSheet.mergeCells("L5:M6");
  reportSheet.mergeCells("S5:V6");

  const cells = [
    'A5', 'B5', 'C5', 'J5', 'K5', 'N5', 'O5', 'P5', 'Q5', 'R5',
    'A6', 'B6', 'C6', 'J6', 'K6', 'N6', 'O6', 'P6', 'Q6', 'R6',
    'A7', 'B7', 'C7', 'J7', 'K7', 'N7', 'O7', 'P7', 'Q7', 'R7',
    'A8', 'B8', 'C8', 'J8', 'K8', 'N8', 'O8', 'P8', 'Q8', 'R8',
    'A9', 'B9', 'C9', 'J9', 'K9', 'N9', 'O9', 'P9', 'Q9', 'R9',
  ];

  const cells2 = [
    'D7', 'E7', 'F7', 'I7', 'L7', 'M7', 'S7', 'T7', 'U7', 'V7',
    'D8', 'E8', 'F8', 'I8', 'L8', 'M8', 'S8', 'T8', 'U8', 'V8',
    'D9', 'E9', 'F9', 'I9', 'L9', 'M9', 'S9', 'T9', 'U9', 'V9'
  ]

  cells.forEach((cell, index) => {
    const currentCell = reportSheet.getCell(cell);
    const rowIndex = parseInt(cell.substring(1), 10);
    switch (rowIndex) {
      case 5:
        currentCell.border = borderStyleFirst;
        break;
      case 9:
        currentCell.border = borderStyleLast;
        break;
      default:
        currentCell.border = borderStyleMiddle;
        break;
    }
  });

  cells2.forEach((cell, index) => {
    const currentCell = reportSheet.getCell(cell);
    const rowIndex = parseInt(cell.substring(1), 10);
    switch (rowIndex) {
      case 7:
        currentCell.border = borderStyleFirst;
        break;
      case 9:
        currentCell.border = borderStyleLast;
        break;
      default:
        currentCell.border = borderStyleMiddle;
        break;
    }
  });

  reportSheet.getCell("D5").border = borderStyle;
  reportSheet.getCell("G5").border = borderStyle;
  reportSheet.getCell("G7").border = borderStyle;
  reportSheet.getCell("L5").border = borderStyle;
  reportSheet.getCell("S5").border = borderStyle;
  reportSheet.getCell("G8").border = borderStyleFirst;
  reportSheet.getCell("G9").border = borderStyleLast;
  reportSheet.getCell("H8").border = borderStyleFirst;
  reportSheet.getCell("H9").border = borderStyleLast;

  reportSheet.getCell('G5').alignment = { horizontal: 'center', vertical: 'middle' };
  reportSheet.getCell('D5').alignment = { horizontal: 'center', vertical: 'middle' };
  reportSheet.getCell('D6').alignment = { horizontal: 'center', vertical: 'middle' };
  reportSheet.getCell('G7').alignment = { horizontal: 'center', vertical: 'middle' };
  reportSheet.getCell('L5').alignment = { horizontal: 'center', vertical: 'middle' };
  reportSheet.getCell('L6').alignment = { horizontal: 'center', vertical: 'middle' };
  reportSheet.getCell('S5').alignment = { horizontal: 'center', vertical: 'middle' };
  reportSheet.getCell('S6').alignment = { horizontal: 'center', vertical: 'middle' };

  documents.forEach((doc) => {
    const customer = doc.customer;

    const row = reportSheet.addRow([
      correlative(doc),
      localizeOnlyDate(doc.dateOfIssue),
      "",
      DOCUMENT_TYPE_MAPPER[doc.documentType] === "Factura" ? "01" : DOCUMENT_TYPE_MAPPER[doc.documentType] === "Boleta" ? "03" : "",
      doc.series,
      doc.number,
      customer && isBusinessCustomer(customer) ? 6 : 1,
      customer ? customer.documentNumber : "",
      customer ? fullName(customer) : "Cliente general",
      0,
      0,
      doc.netTotal,
      0,
      0,
      0,
      "",
      doc.netTotal,
      3.728,
      "",
      "",
      "",
      "",
    ]);

    row.eachCell((cell) => {
      cell.border = borderStyle;
    });
  });

  const total = documents.reduce((acc, doc) => plus(acc)(doc.total), 0);
  const netTotal = documents.reduce((acc, doc) => plus(acc)(doc.netTotal), 0);

  reportSheet.addRow([]);
  reportSheet.addRow(["", "", "", "", "", "", "", "","","","","","","","", "Sub total", netTotal]);
  reportSheet.addRow(["", "", "", "", "", "", "", "","","","","","","","", "Igv", 0]);
  reportSheet.addRow(["", "", "", "", "", "", "", "","","","","","","","", "Total", total]);

  return workbook.xlsx.writeBuffer();
};
