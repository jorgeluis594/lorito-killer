import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import type { PrintJobPrinter } from "@/printing/jobs/types";
import type { PrintAlignment, PrintCommand } from "@/printing/types";

const pad = (value: string, width: number, align: PrintAlignment = "left") => {
  const cell = value.slice(0, width);
  if (align === "right") return cell.padStart(width);
  if (align === "center")
    return cell.padStart(Math.floor((width + cell.length) / 2)).padEnd(width);
  return cell.padEnd(width);
};

/** Texto y QR nativos de ESC/POS; el ancho sale del perfil de la impresora. */
export function printCommandsToEscpos(
  commands: PrintCommand[],
  printer: PrintJobPrinter,
): Uint8Array {
  const encoder = new ReceiptPrinterEncoder({
    columns: printer.columns,
    codepageMapping: printer.codepageMapping,
    feedBeforeCut: printer.feedBeforeCut,
  }).initialize();

  for (const command of commands) {
    switch (command.type) {
      case "text": {
        const size = command.size ?? 1;
        encoder
          .align(command.align ?? "left")
          .bold(command.bold ?? false)
          .width(size)
          .height(size)
          .line(command.value)
          .width(1)
          .height(1);
        break;
      }
      case "columns": {
        // Los anchos son proporciones del ancho del papel.
        const total = command.widths.reduce((sum, width) => sum + width, 0);
        encoder
          .align("left")
          .bold(command.bold ?? false)
          .line(
            command.values
              .map((value, index) =>
                pad(
                  value,
                  Math.floor((command.widths[index] / total) * printer.columns),
                  command.aligns[index],
                ),
              )
              .join(""),
          );
        break;
      }
      case "qr":
        encoder.align("center").qrcode(command.value).newline();
        break;
      case "feed":
        encoder.newline(command.lines);
        break;
      case "cut":
        if (printer.cutEnabled) encoder.cut("partial");
        // Sin cortador, igual se avanza el papel para poder rasgarlo bajo la barra.
        else if (printer.feedBeforeCut) encoder.newline(printer.feedBeforeCut);
        break;
    }
  }

  return encoder.encode();
}
