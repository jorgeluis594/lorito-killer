# Cobro de mesas

Reglas de la pantalla de cobro de una mesa (`src/table/components/table-payment-view.tsx`), que también usan los pedidos de delivery en mesas (ver [delivery en mesas](design/delivery-en-mesas.md)). El servidor vuelve a validar cada regla en `src/table/payment-repository.ts`; la interfaz solo las anticipa.

## Medios de pago en caja

Caja cobra con efectivo, tarjeta (débito o crédito), billetera o combinado. Se cobra siempre la cuenta completa.

### Efectivo

- «Efectivo recibido» es obligatorio y debe cubrir el total; el «Vuelto» se calcula a partir de ese monto. Razón: en un cobro solo en efectivo el cajero siempre entrega vuelto o confirma el importe exacto, y el registro del pago lo conserva.

### Combinado

- Requiere al menos dos medios con monto mayor que cero.
- El único bloqueo propio del combinado es que la suma de los montos asignados cubra exactamente el total: «Por asignar» debe quedar en S/ 0.00. También aplican las validaciones de cada medio, como el formato de la referencia de billetera.
- El efectivo nunca es obligatorio: «Efectivo recibido · S/ (opcional)» puede quedar vacío. Razón: en el combinado lo que importa es que el total asignado cubra la cuenta; exigir el monto recibido frenaba al cajero sin aportar control, porque el aporte en efectivo ya está fijado. Se descartó mantenerlo obligatorio.
- Sin monto recibido, el pago en efectivo se registra como recibido igual al aporte en efectivo y vuelto cero.
- Si el cajero escribe un monto recibido, debe cubrir el aporte en efectivo; solo entonces se muestra el «Vuelto».

## Pago confirmado

- Tras el cobro, la pantalla «Pago confirmado» ofrece «Imprimir Comprobante» como acción secundaria, que reimprime el comprobante en la impresora de caja sin volver a cobrar (ver [impresoras](impresoras.md)). No hay un acceso separado para ver el comprobante en pantalla. Razón: en caja lo que se necesita después del cobro es el papel; el comprobante sigue disponible desde el detalle del pedido y el reporte de ventas.
- Si la impresión falla, el pago sigue confirmado y el mensaje indica que se puede reintentar con «Imprimir Comprobante».
- La acción principal sigue siendo cerrar el flujo: «Liberar mesa» en una mesa (o «Entregado · cerrar pedido» en el delivery que lo permite) y «Volver a mesas» cuando ya no queda nada por cerrar.
