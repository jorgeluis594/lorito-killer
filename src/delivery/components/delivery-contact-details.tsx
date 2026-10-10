import { formatPrice } from "@/lib/utils";

type Props = {
  name: string;
  phone: string;
  address: string;
  reference: string | null;
  fee: number;
  expectedPaymentMethod: "CASH" | "WALLET" | null;
  cashPaysWith: number | null;
  total: number;
};

const expectedPaymentLabels = { CASH: "Efectivo", WALLET: "Billetera" };

export default function DeliveryContactDetails({
  name,
  phone,
  address,
  reference,
  fee,
  expectedPaymentMethod,
  cashPaysWith,
  total,
}: Props) {
  const rows: Array<[string, string]> = [
    ["Cliente", name],
    ["Teléfono", phone],
    ["Dirección", address],
    ["Referencia", reference ?? "-"],
    ["Envío", fee > 0 ? formatPrice(fee) : "Gratis"],
    [
      "Medio de pago esperado",
      expectedPaymentMethod
        ? expectedPaymentLabels[expectedPaymentMethod]
        : "-",
    ],
  ];
  if (cashPaysWith !== null)
    rows.push([
      "Paga con",
      `${formatPrice(cashPaysWith)} (vuelto ${formatPrice(Math.max(cashPaysWith - total, 0))})`,
    ]);
  return (
    <dl
      aria-label="Datos de entrega"
      className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border p-3 text-sm"
    >
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-light text-muted-foreground">{label}</dt>
          <dd className="break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
