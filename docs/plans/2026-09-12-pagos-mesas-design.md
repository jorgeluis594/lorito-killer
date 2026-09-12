# Pagos de mesas — decisiones aprobadas

## Objetivo y alcance

El mozo atiende desde celular o tablet y confirma pagos con toques, sin usar el teclado. Se conserva el sistema Jade y la atención sin sidebar. Este documento define el diseño; no acredita implementación.

Estas decisiones actualizan el alcance de cobro descrito en `2026-09-11-atencion-mesas-design.md`: el mozo no recibe efectivo ni registra pagos combinados.

## Responsabilidades

- Mozo: confirma el total de la cuenta mediante tarjeta o billetera, después de verificar que recibió el pago. No ingresa montos, nombre de billetera ni código de operación.
- Caja: cobra efectivo y pagos combinados. Se mantiene una cuenta completa, sin división por comensales o productos.
- Seleccionar un medio no verifica una transferencia ni ejecuta un cargo bancario; la confirmación registra el pago verificado por el operador.

## Flujo

1. Abrir la mesa y revisar la cuenta, con cantidades, importes y total; los productos cancelados no suman.
2. Resolver productos sin enviar antes de continuar, sin descartarlos automáticamente.
3. Elegir tarjeta, billetera o enviar el cobro a caja.
4. Para tarjeta o billetera, mostrar mesa, medio e importe precargado y el botón «Confirmar pago · S/ …».
5. Registrar el pago completo y liberar la mesa únicamente después del éxito confirmado.
6. Para efectivo o combinado, dejar la mesa pendiente de cobro en caja. La solicitud no registra un pago ni libera la mesa; el cajero completa el cobro.
7. Mostrar el resultado y acceso al comprobante, con «Volver a mesas» como acción principal.

## Diseño responsive

- Celular: una columna, revisión y pago en pasos separados, controles táctiles amplios y confirmación al pie.
- Tablet con espacio suficiente: cuenta y pago visibles juntos; en anchos reducidos conservar una columna.
- Identidad de mesa, total y medio elegido visibles antes de confirmar; estados expresados con texto, no solamente color.
- El flujo del mozo no presenta formularios para montos ni referencias de billetera.

## Integridad y recuperación

- Conservar la mesa ocupada y los datos ante un fallo; ante resultado incierto consultar el estado antes de repetir la operación.
- Impedir pagos duplicados y revisar el total vigente si el pedido cambió desde otro dispositivo.
- Un fallo de impresión posterior al cobro permite reimprimir sin volver a cobrar.
- La excepción de billetera sin nombre ni código debe aplicarse también en servidor al flujo autorizado del mozo. No elimina los requisitos del cobro general en caja.
- Registrar quién confirmó el pago y contra qué caja se contabilizó.

## Decisiones pendientes

- Caja compartida o caja propia para contabilizar pagos registrados por el mozo. La implementación actual exige caja del usuario que cobra.
- Cómo solicitar comprobante y datos del cliente manteniendo al mozo sin teclado; no se ha aprobado aún la derivación de estos casos.
- Tratamiento de productos todavía en preparación al iniciar el cobro.

## Validación prevista

Recorrer tarjeta y billetera sin teclado en celular y tablet; verificar que efectivo y combinado se deriven a caja. Comprobar fallos, reintentos, concurrencia entre dispositivos, total actualizado y liberación de mesa solo tras el cobro exitoso.
