import { INVOICE, RECEIPT, TICKET, type DocumentType } from "@/document/types";
import {
  billableNumberToWords,
  formatPrice,
  formatPriceWithoutCurrency,
  paymentMethodToText,
  shortLocalizeDate,
} from "@/lib/utils";
import type { PrintCommand, ReceiptPrintData } from "@/printing/types";

const COLUMNS = 36;
const ITEM_INDENT = 3;

const documentTypeToText: Record<DocumentType, string> = {
  [INVOICE]: "FACTURA ELECTRONICA",
  [RECEIPT]: "BOLETA ELECTRONICA",
  [TICKET]: "NOTA DE VENTA ELECTRONICA",
};

const text = (
  value: string,
  options: Omit<Extract<PrintCommand, { type: "text" }>, "type" | "value"> = {},
): PrintCommand => ({
  type: "text",
  value,
  ...options,
});

const separator = (char = "-") => text(char.repeat(COLUMNS));

const clean = (value: string | number | undefined | null): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const money = (value: number): string => formatPriceWithoutCurrency(value);

const currency = (value: number): string => clean(formatPrice(value));

const formatDate = (value: string): string =>
  shortLocalizeDate(new Date(value));

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
  options: { showEmpty?: boolean } = {},
) => {
  if (!value && !options.showEmpty) return;

  chunkText(`${label}: ${value ?? ""}`, COLUMNS).forEach((line) => {
    commands.push(text(line));
  });
};

const pushWrappedText = (
  commands: PrintCommand[],
  value: string | undefined,
  options: Omit<Extract<PrintCommand, { type: "text" }>, "type" | "value"> = {},
) => {
  if (!value) return;

  chunkText(value, COLUMNS).forEach((line) => {
    commands.push(text(line, options));
  });
};

const pushAmountLine = (
  commands: PrintCommand[],
  label: string,
  value: string,
  bold = false,
) => {
  const cleanLabel = clean(label);
  const cleanValue = clean(value);
  const spaces = Math.max(COLUMNS - cleanLabel.length - cleanValue.length, 1);

  commands.push(
    text(`${cleanLabel}${" ".repeat(spaces)}${cleanValue}`, { bold }),
  );
};

const shortOrderId = (orderId: string): string => orderId.slice(0, 8);

const isBillableDocumentType = (documentType: DocumentType): boolean =>
  documentType === RECEIPT || documentType === INVOICE;

const addHeader = (commands: PrintCommand[], data: ReceiptPrintData) => {
  const { company, document } = data;
  const isBillable = isBillableDocumentType(document.type);

  pushWrappedText(
    commands,
    clean(company.commercialName || company.legalName),
    {
      align: "center",
      bold: true,
    },
  );

  if (
    isBillable &&
    company.legalName &&
    company.legalName !== company.commercialName
  ) {
    pushWrappedText(commands, clean(company.legalName), { align: "center" });
  }

  if (isBillable) {
    pushWrappedLabel(commands, "RUC", company.ruc);
    pushWrappedLabel(commands, "Direccion", company.address);
    pushWrappedLabel(commands, "Ubicacion", company.location);
    pushWrappedLabel(commands, "Email", company.email);
    pushWrappedLabel(commands, "Telefono", company.phone);
  }

  commands.push(separator("="));
  commands.push(
    text(documentTypeToText[document.type], {
      align: "center",
      bold: true,
    }),
  );
  commands.push(text(document.correlative, { align: "center", bold: true }));
  commands.push(separator("="));
};

const addDocumentData = (commands: PrintCommand[], data: ReceiptPrintData) => {
  const { customer, document, order } = data;
  const customerDocumentLabel = document.type === INVOICE ? "RUC" : "DNI";

  pushWrappedLabel(commands, "F. Emision", formatDate(document.dateOfIssue));
  pushWrappedLabel(
    commands,
    "F. Envio",
    document.issuedAt ? formatDate(document.issuedAt) : undefined,
  );
  pushWrappedLabel(commands, "Pedido", shortOrderId(order.id));
  pushWrappedLabel(commands, "Cliente", customer?.name, { showEmpty: true });
  pushWrappedLabel(commands, customerDocumentLabel, customer?.documentNumber, {
    showEmpty: true,
  });
  pushWrappedLabel(commands, "Direccion", customer?.address, {
    showEmpty: true,
  });

  if (document.status === "cancelled") {
    commands.push(text("DOCUMENTO ANULADO", { align: "center", bold: true }));
    pushWrappedLabel(commands, "Motivo", document.cancellationReason);
  }
};

const addItems = (commands: PrintCommand[], data: ReceiptPrintData) => {
  commands.push(separator());
  commands.push(text("Detalle", { bold: true }));
  commands.push(separator());

  data.order.items.forEach((item) => {
    const quantity = `${item.quantity}`;
    const itemPrefix = `${quantity} x `;
    const itemNameWidth = COLUMNS - itemPrefix.length;
    const [firstLine = "", ...remainingLines] = chunkText(
      item.name,
      itemNameWidth,
    );

    commands.push(text(`${itemPrefix}${firstLine}`));

    remainingLines.forEach((line) => {
      commands.push(text(`${" ".repeat(ITEM_INDENT)}${line}`));
    });

    pushAmountLine(
      commands,
      `${" ".repeat(ITEM_INDENT)}P.Unit ${money(item.unitPrice)}`,
      `Total ${money(item.netTotal)}`,
    );

    if (item.discountAmount > 0) {
      pushAmountLine(
        commands,
        `${" ".repeat(ITEM_INDENT)}Descuento`,
        `- ${money(item.discountAmount)}`,
      );
    }
  });
};

const addTotals = (commands: PrintCommand[], data: ReceiptPrintData) => {
  const { document } = data;

  commands.push(separator());

  if (document.type === TICKET) {
    if (document.discountAmount > 0) {
      pushAmountLine(commands, "Subtotal:", currency(document.netTotal));
      pushAmountLine(commands, "Descuento:", currency(document.discountAmount));
    }

    pushAmountLine(commands, "Total:", currency(document.total), true);
  } else {
    pushAmountLine(commands, "OP. Exoneradas:", currency(document.netTotal));

    if (document.discountAmount > 0) {
      pushAmountLine(commands, "DESCUENTO:", currency(document.discountAmount));
    }

    pushAmountLine(commands, "IGV:", currency(0));
    pushAmountLine(commands, "TOTAL A PAGAR:", currency(document.total), true);
  }

  commands.push(separator());
  pushWrappedText(commands, `Son: ${billableNumberToWords(document.total)}`);
};

const addPayments = (commands: PrintCommand[], data: ReceiptPrintData) => {
  if (!data.order.payments.length) return;

  commands.push(separator());
  commands.push(text("Pagos", { bold: true }));

  data.order.payments.forEach((payment) => {
    pushAmountLine(
      commands,
      paymentMethodToText(payment.method),
      currency(payment.amount),
    );
  });
};

const addFooter = (commands: PrintCommand[], data: ReceiptPrintData) => {
  if (isBillableDocumentType(data.document.type) && data.document.qr) {
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
