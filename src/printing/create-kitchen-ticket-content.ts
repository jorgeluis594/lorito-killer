import ReceiptPrinterEncoder from "@point-of-sale/receipt-printer-encoder";

export type KitchenTicketContentInput = {
  ticketId: string;
  createdAt: Date;
  kitchenName: string;
  orderType: "DINE_IN" | "TAKE_AWAY" | "DELIVERY" | "RETAIL";
  orderLabel: string;
  responsibleName: string;
  items: Array<{
    productName: string;
    quantity: number;
    notes?: string | null;
  }>;
};

export type KitchenTicketPrinterProfile = {
  columns: number;
  codepageMapping: string;
  cutEnabled: boolean;
  feedBeforeCut: number;
};

const orderTypeLabels: Record<KitchenTicketContentInput["orderType"], string> =
  {
    DINE_IN: "Mesa",
    TAKE_AWAY: "Para llevar",
    DELIVERY: "Delivery",
    RETAIL: "Venta",
  };

export function createKitchenTicketContent(
  input: KitchenTicketContentInput,
  profile: KitchenTicketPrinterProfile,
): Uint8Array {
  let encoder = new ReceiptPrinterEncoder({
    columns: profile.columns,
    codepageMapping: profile.codepageMapping,
    feedBeforeCut: profile.feedBeforeCut,
  })
    .initialize()
    .align("center")
    .bold(true)
    .line(input.kitchenName)
    .bold(false)
    .line(`COMANDA ${input.ticketId}`)
    .line(
      new Intl.DateTimeFormat("es-PE", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Lima",
      }).format(input.createdAt),
    )
    .align("left")
    .rule()
    .line(`${orderTypeLabels[input.orderType]}: ${input.orderLabel}`)
    .line(`Responsable: ${input.responsibleName}`)
    .rule();

  for (const item of input.items) {
    encoder = encoder
      .bold(true)
      .line(`${item.quantity} x ${item.productName}`)
      .bold(false);
    if (item.notes) encoder = encoder.line(`  Obs: ${item.notes}`);
  }

  encoder = encoder.rule();
  if (profile.cutEnabled) encoder = encoder.cut("partial");
  return encoder.encode();
}
