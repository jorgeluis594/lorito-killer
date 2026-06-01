import { INVOICE, RECEIPT, TICKET, type DocumentType } from "@/document/types";
import {
  billableNumberToWords,
  formatPriceWithoutCurrency,
  paymentMethodToText,
  shortLocalizeDate,
} from "@/lib/utils";
import type {
  PrintAlignment,
  PrintCommand,
  ReceiptPrintData,
} from "@/printing/types";
import { UNIT_TYPE_MAPPER } from "@/product/constants";

const COLUMNS = 48;
const ITEM_NAME_WIDTH = 24;

const documentTypeToText: Record<DocumentType, string> = {
  [INVOICE]: "FACTURA ELECTRONICA",
  [RECEIPT]: "BOLETA ELECTRONICA",
  [TICKET]: "NOTA DE VENTA ELECTRONICA",
};

const customerDocumentTypeToText: Record<string, string> = {
  dni: "DNI",
  ruc: "RUC",
  carnet_extranjeria: "Carnet de extranjeria",
};

const text = (
  value: string,
  options: Omit<Extract<PrintCommand, { type: "text" }>, "type" | "value"> = {},
): PrintCommand => ({
  type: "text",
  value,
  ...options,
});

const columns = (
  values: string[],
  widths: number[],
  aligns: PrintAlignment[],
  bold?: boolean,
): PrintCommand => ({
  type: "columns",
  values,
  widths,
  aligns,
  bold,
});

const separator = (char = "-") => text(char.repeat(COLUMNS));

const clean = (value: string | number | undefined | null): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const money = (value: number): string => formatPriceWithoutCurrency(value);

const formatDate = (value: string): string => shortLocalizeDate(new Date(value));

const chunkText = (value: string, width: number): string[] => {
  const words = clean(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if (!current) {
      current = word;
      return;
    }

    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  return lines.flatMap((line) => {
    if (line.length <= width) return [line];

    const chunks: string[] = [];
    for (let index = 0; index < line.length; index += width) {
      chunks.push(line.slice(index, index + width));
    }
    return chunks;
  });
};

const pushWrappedLabel = (
  commands: PrintCommand[],
  label: string,
  value: string | undefined,
) => {
  if (!value) return;

  chunkText(`${label}: ${value}`, COLUMNS).forEach((line) => {
    commands.push(text(line));
  });
};

const addHeader = (commands: PrintCommand[], data: ReceiptPrintData) => {
  const { company, document } = data;

  commands.push(text(clean(company.commercialName || company.legalName), {
    align: "center",
    bold: true,
    size: 2,
  }));

  if (company.legalName && company.legalName !== company.commercialName) {
    commands.push(text(clean(company.legalName), { align: "center" }));
  }

  pushWrappedLabel(commands, "RUC", company.ruc);
  pushWrappedLabel(commands, "Direccion", company.address);
  pushWrappedLabel(commands, "Ubicacion", company.location);
  pushWrappedLabel(commands, "Email", company.email);
  pushWrappedLabel(commands, "Telefono", company.phone);

  commands.push(separator("="));
  commands.push(text(documentTypeToText[document.type], {
    align: "center",
    bold: true,
  }));
  commands.push(text(document.correlative, { align: "center", bold: true }));
  commands.push(separator("="));
};

const addDocumentData = (commands: PrintCommand[], data: ReceiptPrintData) => {
  const { customer, document, order } = data;
  const customerDocumentLabel = customer?.documentType
    ? customerDocumentTypeToText[customer.documentType] ?? customer.documentType
    : document.type === INVOICE
      ? "RUC"
      : "DNI";

  pushWrappedLabel(commands, "F. Emision", formatDate(document.dateOfIssue));

  if (document.issuedAt) {
    pushWrappedLabel(commands, "F. Envio", formatDate(document.issuedAt));
  }

  pushWrappedLabel(commands, "Pedido", order.id);
  pushWrappedLabel(commands, "Cliente", customer?.name || "Cliente varios");
  pushWrappedLabel(commands, customerDocumentLabel, customer?.documentNumber);
  pushWrappedLabel(commands, "Direccion", customer?.address);
  pushWrappedLabel(commands, "Email", customer?.email);
  pushWrappedLabel(commands, "Telefono", customer?.phone);

  if (document.status === "cancelled") {
    commands.push(text("DOCUMENTO ANULADO", { align: "center", bold: true }));
    pushWrappedLabel(commands, "Motivo", document.cancellationReason);
  }
};

const addItems = (commands: PrintCommand[], data: ReceiptPrintData) => {
  commands.push(separator());
  commands.push(
    columns(
      ["Cant", "Producto", "P.Unit", "Total"],
      [6, 24, 8, 10],
      ["left", "left", "right", "right"],
      true,
    ),
  );
  commands.push(separator());

  data.order.items.forEach((item) => {
    const quantity = `${item.quantity} ${UNIT_TYPE_MAPPER[item.unitType]}`;
    const productLines = chunkText(item.name, ITEM_NAME_WIDTH);
    const [firstLine = ""] = productLines;

    commands.push(
      columns(
        [quantity, firstLine, money(item.unitPrice), money(item.netTotal)],
        [6, 24, 8, 10],
        ["left", "left", "right", "right"],
      ),
    );

    productLines.slice(1).forEach((line) => {
      commands.push(
        columns(
          ["", line, "", ""],
          [6, 24, 8, 10],
          ["left", "left", "right", "right"],
        ),
      );
    });

    if (item.discountAmount > 0) {
      commands.push(
        columns(
          ["", "Descuento", "", `-${money(item.discountAmount)}`],
          [6, 24, 8, 10],
          ["left", "left", "right", "right"],
        ),
      );
    }
  });
};

const addTotals = (commands: PrintCommand[], data: ReceiptPrintData) => {
  commands.push(separator());

  if (data.order.discount > 0) {
    commands.push(
      columns(
        ["Subtotal", money(data.order.subtotal)],
        [34, 14],
        ["right", "right"],
      ),
    );
    commands.push(
      columns(
        ["Descuento", `-${money(data.order.discount)}`],
        [34, 14],
        ["right", "right"],
      ),
    );
  }

  commands.push(
    columns(
      ["TOTAL S/", money(data.order.total)],
      [34, 14],
      ["right", "right"],
      true,
    ),
  );

  chunkText(`Son: ${billableNumberToWords(data.order.total)}`, COLUMNS).forEach(
    (line) => commands.push(text(line)),
  );
};

const addPayments = (commands: PrintCommand[], data: ReceiptPrintData) => {
  if (!data.order.payments.length) return;

  commands.push(separator());
  commands.push(text("Pagos", { bold: true }));

  data.order.payments.forEach((payment) => {
    const label =
      payment.method === "wallet" && payment.walletName
        ? `${paymentMethodToText(payment.method)} ${payment.walletName}`
        : paymentMethodToText(payment.method);

    commands.push(
      columns([label, money(payment.amount)], [34, 14], ["left", "right"]),
    );

    pushWrappedLabel(commands, "Operacion", payment.operationCode);

    if (payment.receivedAmount !== undefined) {
      commands.push(
        columns(
          ["Recibido", money(payment.receivedAmount)],
          [34, 14],
          ["left", "right"],
        ),
      );
    }

    if (payment.change !== undefined && payment.change > 0) {
      commands.push(
        columns(["Vuelto", money(payment.change)], [34, 14], [
          "left",
          "right",
        ]),
      );
    }
  });
};

const addFooter = (commands: PrintCommand[], data: ReceiptPrintData) => {
  if (data.document.hash) {
    commands.push(separator());
    commands.push(text("Codigo hash:", { bold: true }));
    chunkText(data.document.hash, COLUMNS).forEach((line) => {
      commands.push(text(line));
    });
  }

  if (data.document.qr) {
    commands.push({ type: "qr", value: data.document.qr });
  }

  commands.push(text("Gracias por su compra", { align: "center" }));
  commands.push({ type: "feed", lines: 4 });
  commands.push({ type: "cut" });
};

export const buildThermalReceiptCommands = (
  data: ReceiptPrintData,
): PrintCommand[] => {
  const commands: PrintCommand[] = [];

  addHeader(commands, data);
  addDocumentData(commands, data);
  addItems(commands, data);
  addTotals(commands, data);
  addPayments(commands, data);
  addFooter(commands, data);

  return commands;
};
