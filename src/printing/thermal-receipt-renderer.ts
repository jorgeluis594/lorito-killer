import { INVOICE, RECEIPT, TICKET, type DocumentType } from "@/document/types";
import {
  billableNumberToWords,
  formatPrice,
  formatPriceWithoutCurrency,
  paymentMethodToText,
  shortLocalizeDate,
} from "@/lib/utils";
import type { PrintCommand, ReceiptPrintData } from "@/printing/types";

const ITEM_INDENT = 3;

const documentTypeToText: Record<DocumentType, string> = {
  [INVOICE]: "FACTURA ELECTRONICA",
  [RECEIPT]: "BOLETA ELECTRONICA",
  [TICKET]: "NOTA DE VENTA ELECTRONICA",
};

export const text = (
  value: string,
  options: Omit<Extract<PrintCommand, { type: "text" }>, "type" | "value"> = {},
): PrintCommand => ({
  type: "text",
  value,
  ...options,
});

export const separator = (columns: number, char = "-") =>
  text(char.repeat(columns));

const clean = (value: string | number | undefined | null): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const money = (value: number): string => formatPriceWithoutCurrency(value);

export const currency = (value: number): string => clean(formatPrice(value));

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

export const pushWrappedLabel = (
  commands: PrintCommand[],
  columns: number,
  label: string,
  value: string | undefined,
  options: { showEmpty?: boolean } = {},
) => {
  if (!value && !options.showEmpty) return;

  chunkText(`${label}: ${value ?? ""}`, columns).forEach((line) => {
    commands.push(text(line));
  });
};

export const pushWrappedText = (
  commands: PrintCommand[],
  columns: number,
  value: string | undefined,
  options: Omit<Extract<PrintCommand, { type: "text" }>, "type" | "value"> = {},
) => {
  if (!value) return;

  chunkText(value, columns).forEach((line) => {
    commands.push(text(line, options));
  });
};

export const pushAmountLine = (
  commands: PrintCommand[],
  columns: number,
  label: string,
  value: string,
  bold = false,
) => {
  const cleanLabel = clean(label);
  const cleanValue = clean(value);
  const spaces = Math.max(columns - cleanLabel.length - cleanValue.length, 1);

  commands.push(
    text(`${cleanLabel}${" ".repeat(spaces)}${cleanValue}`, { bold }),
  );
};

const shortOrderId = (orderId: string): string => orderId.slice(0, 8);

const isBillableDocumentType = (documentType: DocumentType): boolean =>
  documentType === RECEIPT || documentType === INVOICE;

const addHeader = (
  commands: PrintCommand[],
  columns: number,
  data: ReceiptPrintData,
) => {
  const { company, document } = data;
  const isBillable = isBillableDocumentType(document.type);

  pushWrappedText(
    commands,
    columns,
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
    pushWrappedText(commands, columns, clean(company.legalName), {
      align: "center",
    });
  }

  if (isBillable) {
    pushWrappedLabel(commands, columns, "RUC", company.ruc);
    pushWrappedLabel(commands, columns, "Direccion", company.address);
    pushWrappedLabel(commands, columns, "Ubicacion", company.location);
    pushWrappedLabel(commands, columns, "Email", company.email);
    pushWrappedLabel(commands, columns, "Telefono", company.phone);
  }

  commands.push(separator(columns, "="));
  commands.push(
    text(documentTypeToText[document.type], {
      align: "center",
      bold: true,
    }),
  );
  commands.push(text(document.correlative, { align: "center", bold: true }));
  commands.push(separator(columns, "="));
};

const addDocumentData = (
  commands: PrintCommand[],
  columns: number,
  data: ReceiptPrintData,
) => {
  const { customer, document, order } = data;
  const customerDocumentLabel = document.type === INVOICE ? "RUC" : "DNI";

  pushWrappedLabel(
    commands,
    columns,
    "F. Emision",
    formatDate(document.dateOfIssue),
  );
  pushWrappedLabel(
    commands,
    columns,
    "F. Envio",
    document.issuedAt ? formatDate(document.issuedAt) : undefined,
  );
  pushWrappedLabel(commands, columns, "Pedido", shortOrderId(order.id));
  pushWrappedLabel(commands, columns, "Cliente", customer?.name, {
    showEmpty: true,
  });
  pushWrappedLabel(
    commands,
    columns,
    customerDocumentLabel,
    customer?.documentNumber,
    {
      showEmpty: true,
    },
  );
  pushWrappedLabel(commands, columns, "Direccion", customer?.address, {
    showEmpty: true,
  });

  if (document.status === "cancelled") {
    commands.push(text("DOCUMENTO ANULADO", { align: "center", bold: true }));
    pushWrappedLabel(commands, columns, "Motivo", document.cancellationReason);
  }
};

export const addItems = (
  commands: PrintCommand[],
  columns: number,
  data: {
    order: {
      items: Pick<
        ReceiptPrintData["order"]["items"][number],
        "name" | "quantity" | "unitPrice" | "netTotal" | "discountAmount"
      >[];
    };
  },
) => {
  commands.push(separator(columns));
  commands.push(text("Detalle", { bold: true }));
  commands.push(separator(columns));

  data.order.items.forEach((item) => {
    const quantity = `${item.quantity}`;
    const itemPrefix = `${quantity} x `;
    const itemNameWidth = columns - itemPrefix.length;
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
      columns,
      `${" ".repeat(ITEM_INDENT)}P.Unit ${money(item.unitPrice)}`,
      `Total ${money(item.netTotal)}`,
    );

    if (item.discountAmount > 0) {
      pushAmountLine(
        commands,
        columns,
        `${" ".repeat(ITEM_INDENT)}Descuento`,
        `- ${money(item.discountAmount)}`,
      );
    }
  });
};

const addTotals = (
  commands: PrintCommand[],
  columns: number,
  data: ReceiptPrintData,
) => {
  const { document } = data;

  commands.push(separator(columns));

  if (document.type === TICKET) {
    if (document.discountAmount > 0) {
      pushAmountLine(
        commands,
        columns,
        "Subtotal:",
        currency(document.netTotal),
      );
      pushAmountLine(
        commands,
        columns,
        "Descuento:",
        currency(document.discountAmount),
      );
    }

    pushAmountLine(commands, columns, "Total:", currency(document.total), true);
  } else {
    pushAmountLine(
      commands,
      columns,
      "OP. Exoneradas:",
      currency(document.netTotal),
    );

    if (document.discountAmount > 0) {
      pushAmountLine(
        commands,
        columns,
        "DESCUENTO:",
        currency(document.discountAmount),
      );
    }

    pushAmountLine(commands, columns, "IGV:", currency(0));
    pushAmountLine(
      commands,
      columns,
      "TOTAL A PAGAR:",
      currency(document.total),
      true,
    );
  }

  commands.push(separator(columns));
  pushWrappedText(
    commands,
    columns,
    `Son: ${billableNumberToWords(document.total)}`,
  );
};

const addPayments = (
  commands: PrintCommand[],
  columns: number,
  data: ReceiptPrintData,
) => {
  if (!data.order.payments.length) return;

  commands.push(separator(columns));
  commands.push(text("Pagos", { bold: true }));

  data.order.payments.forEach((payment) => {
    pushAmountLine(
      commands,
      columns,
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
  columns: number,
): PrintCommand[] => {
  const commands: PrintCommand[] = [];

  addHeader(commands, columns, data);
  addDocumentData(commands, columns, data);
  addItems(commands, columns, data);
  addTotals(commands, columns, data);
  addPayments(commands, columns, data);
  addFooter(commands, data);

  return commands;
};
