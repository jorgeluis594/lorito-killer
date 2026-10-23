/** Pedido sin mesa tal como se nombra. Delivery lleva teléfono porque es su respaldo visible. */
export type ServiceOrderIdentity =
  | { channel: "TAKE_AWAY"; customerName: string | null; openedAt: Date }
  | {
      channel: "DELIVERY";
      customerName: string | null;
      phone: string;
      openedAt: Date;
    };

export type ServiceOrderLabels = Readonly<{
  cardTitle: string;
  cardSubtitle: string | null;
  heading: string;
  sentTitle: string;
  ticketLabel: string;
  printLabel: string;
  summaryLabel: string;
}>;

// Constante de módulo: se llama por tarjeta en cada render y en el worker.
const limaTime = new Intl.DateTimeFormat("es-PE", {
  timeStyle: "short",
  timeZone: "America/Lima",
});

/** Hora de Lima en 12 horas, igual que el encabezado de la comanda: «9:40 p. m.». */
export function formatLimaTime(date: Date): string {
  return limaTime.format(date);
}

export function describeServiceOrder(
  identity: ServiceOrderIdentity,
): ServiceOrderLabels {
  const name = identity.customerName?.trim() || null;
  const time = formatLimaTime(identity.openedAt);
  const byTime = `pedido de las ${time}`;

  if (identity.channel === "TAKE_AWAY") {
    return {
      cardTitle: name ?? "Para llevar",
      cardSubtitle: name
        ? `Para llevar · desde las ${time}`
        : `Desde las ${time}`,
      heading: name ? `Para llevar · ${name}` : "Para llevar",
      sentTitle: name
        ? `Pedido de ${name} enviado`
        : "Pedido para llevar enviado",
      ticketLabel: name ?? byTime,
      printLabel: `Para llevar · ${name ?? byTime}`,
      summaryLabel: `Para llevar · ${name ?? byTime}`,
    };
  }

  return {
    cardTitle: name ?? identity.phone,
    cardSubtitle: name ? identity.phone : null,
    heading: `Delivery · ${name ?? identity.phone}`,
    sentTitle: name
      ? `Pedido de ${name} enviado`
      : "Pedido de delivery enviado",
    ticketLabel: name ?? byTime,
    printLabel: `Delivery · ${name ?? byTime}`,
    summaryLabel: `Delivery · ${name ?? identity.phone}`,
  };
}

/**
 * Arma la identidad desde lo que cargan los repositorios; `null` para mesas y
 * ventas, que no son pedidos sin mesa.
 */
export function toServiceOrderIdentity(input: {
  orderType: string;
  sessionCustomerName: string | null | undefined;
  delivery: { name: string | null; phone: string } | null | undefined;
  openedAt: Date;
}): ServiceOrderIdentity | null {
  if (input.orderType === "TAKE_AWAY")
    return {
      channel: "TAKE_AWAY",
      customerName: input.sessionCustomerName ?? null,
      openedAt: input.openedAt,
    };
  if (input.orderType === "DELIVERY" && input.delivery)
    return {
      channel: "DELIVERY",
      customerName: input.delivery.name,
      phone: input.delivery.phone,
      openedAt: input.openedAt,
    };
  return null;
}
