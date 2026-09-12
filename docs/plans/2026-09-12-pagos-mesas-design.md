# Pagos de mesas — decisiones aprobadas

## Objetivo y alcance

El mozo atiende desde celular o tablet y confirma pagos habituales con toques. Puede usar el teclado para ingresar datos del cliente y del comprobante cuando se solicitan, un caso poco frecuente. Se conserva el sistema Jade y la atención sin sidebar. Este documento define el diseño; no acredita implementación.

Estas decisiones actualizan el alcance de cobro descrito en `2026-09-11-atencion-mesas-design.md`: el mozo no recibe efectivo ni registra pagos combinados.

## Responsabilidades

- Mozo: confirma el total de la cuenta mediante tarjeta o billetera, después de verificar que recibió el pago. No ingresa montos, nombre de billetera ni código de operación.
- Mozo: también puede ingresar los datos necesarios para boleta o factura desde su dispositivo; este caso permite usar el teclado y no requiere derivación a caja por ese motivo.
- Caja: cobra efectivo y pagos combinados. Se mantiene una cuenta completa, sin división por comensales o productos.
- Los cobros del mozo se contabilizan en la caja compartida abierta del restaurante. El pago se asocia al mozo que lo confirma, no al usuario que abrió la caja; el mozo no necesita una caja propia. La caja receptora y la identidad del mozo son asociaciones distintas.
- Seleccionar un medio no verifica una transferencia ni ejecuta un cargo bancario; la confirmación registra el pago verificado por el operador.

## Flujo

1. Abrir la mesa y revisar la cuenta, con cantidades, importes y total; los productos cancelados no suman.
2. Resolver productos sin enviar antes de continuar, sin descartarlos automáticamente.
3. Elegir el comprobante y completar los datos de cliente que correspondan; después elegir tarjeta, billetera o enviar el cobro a caja.
4. Para tarjeta o billetera, mostrar mesa, medio e importe precargado y el botón «Confirmar pago · S/ …».
5. Registrar el pago completo y liberar la mesa únicamente después del éxito confirmado.
6. Para efectivo o combinado, dejar la mesa pendiente de cobro en caja. La solicitud no registra un pago ni libera la mesa; el cajero completa el cobro.
7. Mostrar el resultado y acceso al comprobante, con «Volver a mesas» como acción principal.

## Diseño responsive

- Celular: una columna, revisión y pago en pasos separados, controles táctiles amplios y confirmación al pie.
- Tablet con espacio suficiente: cuenta y pago visibles juntos; en anchos reducidos conservar una columna.
- Identidad de mesa, total y medio elegido visibles antes de confirmar; estados expresados con texto, no solamente color.
- El flujo del mozo no presenta formularios para montos ni referencias de billetera.
- Mostrar campos del cliente según el comprobante elegido, con etiquetas visibles y errores junto al campo. En celular, el teclado no debe ocultar el campo activo ni impedir continuar.

## Integridad y recuperación

- Conservar la mesa ocupada y los datos ante un fallo; ante resultado incierto consultar el estado antes de repetir la operación.
- Impedir pagos duplicados y revisar el total vigente si el pedido cambió desde otro dispositivo.
- Un fallo de impresión posterior al cobro permite reimprimir sin volver a cobrar.
- La excepción de billetera sin nombre ni código debe aplicarse también en servidor al flujo autorizado del mozo. No elimina los requisitos del cobro general en caja.
- Registrar quién confirmó el pago y contra qué caja se contabilizó.

## Productos en preparación

- Se permite cobrar aunque haya productos todavía en preparación, mostrando una advertencia antes de confirmar el pago. La advertencia no bloquea el cobro.

## Validación prevista

Recorrer tarjeta y billetera sin teclado en celular y tablet; verificar que efectivo y combinado se deriven a caja. Verificar que un pago confirmado por un mozo ingrese a la caja compartida abierta por otra persona y conserve al mozo como autor del pago. Comprobar fallos, reintentos, concurrencia entre dispositivos, total actualizado y liberación de mesa solo tras el cobro exitoso.

Recorrer también la captura de datos de boleta y factura por el mozo con teclado abierto en celular y tablet, incluyendo validaciones y conservación de datos al volver entre pasos.

## Composición e implementación aprobadas

La pantalla dedicada conserva Jade y la cabecera de mesa. En celular se alternan «Revisar cuenta» y «Comprobante y pago»; desde 768 px se muestran cuenta y formulario juntos. El pie mantiene mesa, medio, total, advertencia de preparación y confirmación. Al editar campos en un dispositivo táctil, el pie vuelve al flujo de la página para dejar espacio al teclado. Volver entre pasos conserva los datos del cliente.

Implementada en `tables/[tableId]/payment?session=<id>`, accesible desde «Cobrar cuenta» en el pedido. Nota de venta es el comprobante inicial; boleta y factura aparecen cuando el restaurante tiene sus series configuradas. Tarjeta permite distinguir débito y crédito. Caja dispone además de efectivo y combinado, con validación de importes, vuelto y referencias de billetera.

El cobro usa una transacción serializable con cliente Prisma explícito: comprueba sesión, borrador, versión de pedido, total, caja y rol; registra stock, pago, comprobante y cierre juntos. Repetir una operación ya confirmada devuelve su comprobante. El mozo se guarda como autor en `Payment.data.confirmedById` y en `Order.sellerId`; la caja se guarda por separado. Se usa la caja abierta más reciente de un administrador o cajero activo del restaurante y se muestra su nombre antes de confirmar. Un cambio de caja exige revisar los datos.

La derivación conserva cliente y tipo de comprobante en el pedido, mantiene la mesa ocupada y no genera movimiento financiero. Los productos pagados continúan disponibles en cocina hasta su entrega; se distinguen con «Cuenta pagada». Las acciones antiguas de cambio de estado no pueden reabrir una sesión pagada ni cerrarla sin pago y comprobante. La cancelación de productos se serializa con el cobro.

## Evidencia de validación

- Pruebas de pagos, validación de billetera, importes combinados, aislamiento, datos de comprobante, borradores, reintentos y stock en `src/table/__TEST__/table-payment.test.ts`.
- Prueba real de PostgreSQL: `docker exec lorito-killer-web-1 npx tsx scripts/qa/table-payment-check.ts`. Crea una empresa temporal y la elimina al terminar correctamente; `--keep` conserva datos para navegador y `--cleanup` elimina únicamente esa empresa de prueba. Valida cobros concurrentes, caja de otro usuario, autoría, stock una sola vez, rollback, cancelación concurrente, cocina posterior al pago y derivación con cobro combinado.
- Navegador: cobro del mozo con billetera y tarjeta, recuperación tras desconexión, validación de RUC, conservación de datos de factura, derivación a caja y cobro combinado por el cajero. PDF de nota de venta recibido con HTTP 200. Capturas en `.impeccable/review/pagos/`.
- Verificación de teclado mediante foco y viewport reducido; no equivale a probar un teclado virtual en hardware físico. La impresión física y el envío a SUNAT requieren validación con dispositivos y credenciales reales.

Verificación final: 53 pruebas focalizadas aprobadas, ESLint de los archivos nuevos sin errores y revisión visual independiente con los ajustes de foco y controles táctiles resueltos. La suite completa registra 198 pruebas aprobadas y seis fallos previos (realtime y fixture de reporte), además de una suite de cancelación que importa un módulo inexistente. El chequeo TypeScript aislado de `.next` solo reporta problemas previos en esos módulos y un componente de aviso pendiente.
