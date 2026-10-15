import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type KitchenTicketContentInput = {
  ticketId: string;
  createdAt: Date;
  kitchenName: string;
  orderType: "DINE_IN" | "TAKE_AWAY" | "DELIVERY" | "RETAIL";
  orderLabel: string;
  responsibleName: string;
  /** Solo Delivery: identifica la bolsa; nunca teléfono, dirección ni precios. */
  customerName?: string | null;
  isReprint?: boolean;
  items: Array<{
    productName: string;
    quantity: number;
    cancelledQuantity?: number;
    notes?: string | null;
  }>;
};

export type KitchenTicketPrinterProfile = {
  columns: number;
  codepageMapping: string;
  cutEnabled: boolean;
  feedBeforeCut: number;
};

export type KitchenTicketLine =
  | { text: string; bold?: boolean; center?: boolean }
  | "rule";

const orderTypeLabels: Record<KitchenTicketContentInput["orderType"], string> =
  {
    DINE_IN: "Mesa",
    TAKE_AWAY: "Para llevar",
    DELIVERY: "Delivery",
    RETAIL: "Venta",
  };

// La fuente A de la impresora mide 24 puntos de alto (~8.5pt a 203 dpi); 27 la agranda ~1pt.
const FONT_SIZE = 27;
const LINE_HEIGHT = Math.round(FONT_SIZE * 1.25);
// Ancho en puntos de un carácter de la fuente A, para convertir columnas al ancho imprimible.
const DOTS_PER_COLUMN = 12;

export function kitchenTicketLines(
  input: KitchenTicketContentInput,
): KitchenTicketLine[] {
  const lines: KitchenTicketLine[] = [
    { text: input.kitchenName, bold: true, center: true },
  ];
  if (input.isReprint)
    lines.push({ text: "REIMPRESIÓN", bold: true, center: true });
  lines.push(
    { text: `COMANDA ${input.ticketId}`, center: true },
    {
      text: new Intl.DateTimeFormat("es-PE", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Lima",
      }).format(input.createdAt),
      center: true,
    },
    "rule",
    { text: `${orderTypeLabels[input.orderType]}: ${input.orderLabel}` },
    { text: `Responsable: ${input.responsibleName}` },
  );
  if (input.customerName)
    lines.push({ text: `Cliente: ${input.customerName}` });
  lines.push("rule");

  for (const item of input.items) {
    lines.push({ text: `${item.quantity} x ${item.productName}`, bold: true });
    if (item.cancelledQuantity)
      lines.push({ text: `${item.cancelledQuantity} cancelado(s)` });
    if (item.notes) lines.push({ text: `  Obs: ${item.notes}` });
  }

  lines.push("rule");
  return lines;
}

let fonts: Promise<[Buffer, Buffer]> | undefined;
function loadFonts() {
  const dir = path.join(process.cwd(), "public/vendor/manrope");
  fonts ??= Promise.all([
    readFile(path.join(dir, "manrope-regular.ttf")),
    readFile(path.join(dir, "manrope-bold.ttf")),
  ]);
  return fonts;
}

// Los tamaños de letra de ESC/POS solo crecen en múltiplos enteros, así que la comanda se imprime como imagen.
async function renderLines(lines: KitchenTicketLine[], width: number) {
  const [regular, bold] = await loadFonts();
  // Cota superior generosa: cada línea puede partirse en varias; luego se recorta lo blanco.
  const estimatedHeight =
    lines.reduce(
      (sum, line) =>
        sum +
        (line === "rule"
          ? LINE_HEIGHT
          : Math.ceil(((line.text.length + 1) * FONT_SIZE * 0.75) / width) *
            LINE_HEIGHT),
      0,
    ) + 4 * LINE_HEIGHT;

  const png = await new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "white",
          color: "black",
          fontFamily: "Manrope",
          fontSize: FONT_SIZE,
          lineHeight: `${LINE_HEIGHT}px`,
        }}
      >
        {lines.map((line, index) =>
          line === "rule" ? (
            <div
              key={index}
              style={{
                display: "flex",
                height: LINE_HEIGHT,
                alignItems: "center",
              }}
            >
              <div style={{ width: "100%", borderTop: "2px solid black" }} />
            </div>
          ) : (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: line.center ? "center" : "flex-start",
                textAlign: line.center ? "center" : "left",
                fontWeight: line.bold ? 700 : 400,
                whiteSpace: "pre-wrap",
              }}
            >
              {line.text}
            </div>
          ),
        )}
      </div>
    ),
    {
      width,
      height: estimatedHeight,
      fonts: [
        { name: "Manrope", data: regular, weight: 400 },
        { name: "Manrope", data: bold, weight: 700 },
      ],
    },
  ).arrayBuffer();

  const { data, info } = await sharp(Buffer.from(png))
    .flatten({ background: "#ffffff" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let lastInkRow = 0;
  for (let row = 0; row < info.height; row++)
    for (let col = 0; col < info.width; col++)
      if (data[(row * info.width + col) * 4] < 128) {
        lastInkRow = row;
        break;
      }
  if (lastInkRow >= info.height - LINE_HEIGHT)
    throw new Error("La comanda no entró en la imagen generada.");

  const height = Math.ceil((lastInkRow + 1 + 8) / 8) * 8;
  return {
    data: new Uint8ClampedArray(data.subarray(0, width * height * 4)),
    width,
    height,
  };
}

export async function createKitchenTicketContent(
  input: KitchenTicketContentInput,
  profile: KitchenTicketPrinterProfile,
): Promise<Uint8Array> {
  const width = Math.floor((profile.columns * DOTS_PER_COLUMN) / 8) * 8;
  const image = await renderLines(kitchenTicketLines(input), width);
  let encoder = (
    new ReceiptPrinterEncoder({
      columns: profile.columns,
      codepageMapping: profile.codepageMapping,
      feedBeforeCut: profile.feedBeforeCut,
    }).initialize() as ReceiptPrinterEncoder & {
      image: (
        input: typeof image,
        width: number,
        height: number,
        algorithm: "threshold",
      ) => ReceiptPrinterEncoder;
    }
  ).image(image, image.width, image.height, "threshold");
  if (profile.cutEnabled) encoder = encoder.cut("partial");
  return encoder.encode();
}
