import { INVOICE, RECEIPT, TICKET, type DocumentType } from "@/document/types";
import {
  billableNumberToWords,
  formatPrice,
  formatPriceWithoutCurrency,
  localizeOnlyDate,
  paymentMethodToText,
  shortLocalizeDate,
} from "@/lib/utils";
import type {
  PrintAlignment,
  PrintCommand,
  ReceiptPrintData,
} from "@/printing/types";

const COLUMNS = 48;
const ITEM_NAME_WIDTH = 21;

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

const currency = (value: number): string => clean(formatPrice(value));

const formatDate = (value: string): string => shortLocalizeDate(new Date(value));

const formatOnlyDate = (value: string): string =>
  localizeOnlyDate(new Date(value));

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

const isBillableDocumentType = (documentType: DocumentType): boolean =>
  documentType === RECEIPT || documentType === INVOICE;

const addHeader = (commands: PrintCommand[], data: ReceiptPrintData) => {
  const { company, document } = data;
  const isBillable = isBillableDocumentType(document.type);

  commands.push(text(clean(company.commercialName || company.legalName), {
    align: "center",
    bold: true,
    size: 2,
  }));

  if (
    isBillable &&
    company.legalName &&
    company.legalName !== company.commercialName
  ) {
    commands.push(text(clean(company.legalName), { align: "center" }));
  }

  if (isBillable) {
    if (company.ruc) {
      commands.push(text(`RUC ${clean(company.ruc)}`, { align: "center" }));
    }
    if (company.location) {
      commands.push(text(clean(company.location), { align: "center" }));
    }
    if (company.address) {
      commands.push(text(clean(company.address), { align: "center" }));
    }
    if (company.email) {
      commands.push(text(clean(company.email), { align: "center" }));
    }
    if (company.phone) {
      commands.push(text(clean(company.phone), { align: "center" }));
    }
  }

  commands.push(separator("="));
  commands.push(text(documentTypeToText[document.type], {
    align: "center",
    bold: true,
  }));
  commands.push(text(document.correlative, { align: "center", bold: true }));
  commands.push(separator("="));
};

const addDocumentData = (commands: PrintCommand[], data: ReceiptPrintData) => {
  const { customer, document } = data;
  const customerDocumentLabel = document.type === INVOICE ? "RUC" : "DNI";

  pushWrappedLabel(commands, "F. Emision", formatDate(document.dateOfIssue));
  pushWrappedLabel(
    commands,
    "F. Vencimiento",
    formatOnlyDate(document.dateOfIssue),
  );
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
  commands.push(
    columns(
      ["Cant.", "Producto", "Precio", "Total"],
      [7, 21, 10, 10],
      ["left", "left", "right", "right"],
      true,
    ),
  );
  commands.push(separator());

  data.order.items.forEach((item) => {
    const quantity = `${item.quantity}`;
    const productLines = chunkText(item.name, ITEM_NAME_WIDTH);
    const [firstLine = ""] = productLines;

    commands.push(
      columns(
        [quantity, firstLine, money(item.unitPrice), money(item.netTotal)],
        [7, 21, 10, 10],
        ["left", "left", "right", "right"],
      ),
    );

    productLines.slice(1).forEach((line) => {
      commands.push(
        columns(
          ["", line, "", ""],
          [7, 21, 10, 10],
          ["left", "left", "right", "right"],
        ),
      );
    });

    if (item.discountAmount > 0) {
      commands.push(
        columns(
          ["", "Descuento", "", `- ${money(item.discountAmount)}`],
          [7, 21, 10, 10],
          ["left", "left", "right", "right"],
        ),
      );
    }
  });
};

const addTotals = (commands: PrintCommand[], data: ReceiptPrintData) => {
  const { document } = data;

  commands.push(separator());

  if (document.type === TICKET) {
    if (document.discountAmount > 0) {
      commands.push(
        columns(
          ["Subtotal:", currency(document.netTotal)],
          [30, 18],
          ["right", "right"],
        ),
      );
      commands.push(
        columns(
          ["Descuento:", currency(document.discountAmount)],
          [30, 18],
          ["right", "right"],
        ),
      );
    }

    commands.push(
      columns(
        ["Total:", currency(document.total)],
        [30, 18],
        ["right", "right"],
        true,
      ),
    );
  } else {
    commands.push(
      columns(
        ["OP. Exoneradas:", currency(document.netTotal)],
        [30, 18],
        ["right", "right"],
      ),
    );

    if (document.discountAmount > 0) {
      commands.push(
        columns(
          ["DESCUENTO:", currency(document.discountAmount)],
          [30, 18],
          ["right", "right"],
        ),
      );
    }

    commands.push(
      columns(["IGV:", currency(0)], [30, 18], ["right", "right"]),
    );
    commands.push(
      columns(
        ["TOTAL A PAGAR:", currency(document.total)],
        [30, 18],
        ["right", "right"],
        true,
      ),
    );
  }

  chunkText(`Son: ${billableNumberToWords(document.total)}`, COLUMNS).forEach(
    (line) => commands.push(text(line)),
  );
};

const addPayments = (commands: PrintCommand[], data: ReceiptPrintData) => {
  if (!data.order.payments.length) return;

  commands.push(separator());
  commands.push(
    text(
      `Condicion de pago: ${
        data.order.payments.length > 1
          ? "Combinado"
          : paymentMethodToText(data.order.payments[0].method)
      }`,
    ),
  );
  commands.push(text("Pagos:", { bold: true }));

  data.order.payments.forEach((payment) => {
    commands.push(
      text(
        `• ${paymentMethodToText(payment.method)} - ${currency(payment.amount)}`,
      ),
    );
  });
};

const addFooter = (commands: PrintCommand[], data: ReceiptPrintData) => {
  if (isBillableDocumentType(data.document.type) && data.document.hash) {
    commands.push(separator());
    commands.push(text("Codigo hash:", { bold: true }));
    chunkText(data.document.hash, COLUMNS).forEach((line) => {
      commands.push(text(line));
    });
  }

  if (isBillableDocumentType(data.document.type) && data.document.qr) {
    commands.push({ type: "qr", value: data.document.qr });
  }

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
