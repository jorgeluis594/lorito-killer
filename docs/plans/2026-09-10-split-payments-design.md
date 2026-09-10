# GAP-12: división de cuenta en pagos

## Alcance

La división se representa como varios aportes de pago de una sola orden. La venta,
el cliente y el comprobante siguen siendo únicos. No se asignan productos a
comensales ni se crean cuentas intermedias.

## Flujo

El modo combinado mostrará una lista dinámica de aportes. Cada fila tendrá monto y
medio de pago; billetera conservará además nombre y código de operación. El cajero
podrá ingresar montos personalizados o generar partes iguales, donde el último
aporte absorbe cualquier centavo de redondeo.

La pantalla mostrará el total cubierto y el saldo. El botón de cobro permanecerá
deshabilitado hasta que la suma coincida con el total y todos los aportes sean
válidos. Se permitirán varios aportes con el mismo medio, incluidas varias tarjetas.

## Persistencia y seguridad

Se reutiliza `Order.payments` y la relación existente de pagos; no se requiere una
migración. La acción del servidor volverá a validar que haya pagos, que cada monto
sea positivo y finito, y que la suma sea exactamente el total de la orden antes de
abrir la transacción. La transacción existente conserva la atomicidad entre venta,
pagos, stock y comprobante, por lo que un fallo no escribe pagos parciales.

## Pruebas

- Unitarias: validación de aportes y reparto exacto con redondeo.
- Integración existente: múltiples pagos se persisten bajo una sola orden y un solo
  comprobante.
- Navegador: partes iguales, montos personalizados, efectivo con varias tarjetas,
  saldo incompleto, exceso, datos de billetera y confirmación única.

No se habilitan descuentos en restaurante, de acuerdo con la decisión vigente del
proyecto.
