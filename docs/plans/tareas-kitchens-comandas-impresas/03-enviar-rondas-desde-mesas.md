# KIT-03 — Enviar una ronda desde una mesa y consultar sus comandas

Estado: pendiente de implementación y pruebas.
Dependencias: [KIT-02](02-configurar-kitchens-y-productos.md).
Fuente: [diseño — ronda, envío y protección contra duplicados](../2026-09-13-kitchens-comandas-impresas-design.md#enviar-ronda).

## Flujo y resultado

El mozo prepara el borrador, envía una ronda y consulta lo solicitado. Cada Kitchen recibe una comanda persistida; si tiene impresora, queda un trabajo con bytes listos para ejecución. Un segundo envío contiene solo adicionales.

## Alcance

- `src/order/rounds/` y `sendRound`, consulta `getOrderRounds`, integración de `sendTableDraft` y `addRoundAction` con una transacción explícita compartida.
- Carritos de mesa, edición de posiciones DishProduct, detalle de rondas y eliminación de controles/rutas operativas de preparación y servido que este flujo sustituye.
- Modelos `OrderRound`, `OrderRoundItem`, `KitchenTicket`, `KitchetTicketPrintJob`, múltiples OrderItem por producto, migración e índices de identidad e historial.
- `createKitchenTickets` y generación ESC/POS en `src/printing/create-kitchen-ticket-content.ts` mediante el encoder aprobado.
- Borde de notificación posterior al commit y estado inicial de trabajos; ejecución y recuperación corresponden a KIT-04.

## Fuera de alcance

Ejecutar el spooler, reintentos, cancelaciones, cobro, confirmación para llevar/delivery, impresión manual y modal de fallos.

## Criterios de aceptación

1. El envío valida sesión, revisión del borrador, pedido, productos, cantidades, empresa y permisos antes de escribir. Ambos caminos de mesa usan `sendRound`; la transacción se pasa explícitamente a repositorios sin sustituir un cliente global.
2. El carrito permite dos posiciones del mismo DishProduct y edita cada una por índice. Enviar «2 lomos sin cebolla» y «1 lomo término medio» crea dos OrderItem y dos OrderRoundItem independientes, sin `lineId`. Otros tipos conservan su política de agrupación únicamente dentro de la ronda.
3. `sendRound` recibe productos de dominio por inyección y decide mediante `DishProductType`; no conoce `DISH` ni importa Prisma. Cada copia de ronda conserva nombre, cantidad enviada, notas y Kitchen; `orderItemId` es único y apunta a su línea comercial.
4. La transacción crea ronda, líneas, totales, una comanda por Kitchen y un trabajo por comanda con impresora activa configurada. Sin Kitchen el producto se cobra sin comanda; sin impresora la comanda se guarda sin trabajo. Un fallo al guardar un elemento requerido revierte todo el envío.
5. Las Kitchens y las impresoras configuradas se validan activas y de la empresa; ausencia de inventario o desconexión no bloquea el envío. No se crean trabajos con destino o contenido incompleto.
6. Bloquear Order permite calcular `MAX(number) + 1`, empezando en 1. Dos envíos diferentes reciben números correlativos distintos. `UNIQUE (orderId, number)`, `(orderRoundId, kitchenId)` y `OrderRoundItem.orderItemId` respaldan la persistencia; `(orderId, productId)` deja de ser único.
7. Repetir `roundId` devuelve el resultado y número originales sin duplicar productos, totales, comandas o trabajos, también ante concurrencia o respuesta perdida. Reutilizarlo con otro pedido/contenido se rechaza. Una revisión de borrador ya enviada no se envía otra vez con otro ID; recuperar una ronda anterior no vacía un borrador nuevo.
8. Un envío adicional crea nuevas líneas y comandas solo con lo añadido, sin fusionar líneas de rondas anteriores. Consultar rondas muestra responsable, fecha, cantidades, notas y Kitchen con autorización del pedido.
9. Los bytes contienen identificador de comanda, fecha/hora, Kitchen, tipo de pedido, mesa o número, responsable, productos, cantidades y observaciones; nunca precios. Respetan columnas, codificación, avance y corte de la impresora. Se guardan como `Bytes`/`bytea`, no Base64, JSON ni PDF.
10. Cada trabajo conserva contenido inmutable, `printerId`, `requestedById`, `isReprint = false`, `PENDING` y cero intentos; no duplica responsable ni líneas de la comanda. Solo se avisa después del commit; fallar ese aviso no revierte ni duplica un envío confirmado.
11. Preparar o entregar platos no exige marcar estados. Se retiran las acciones y dependencias de pantalla de cocina de la operación de mesas, con permisos y rutas coherentes; las observaciones enviadas no se editan.
12. Desactivar entidades o cambiar un producto no reescribe la copia del envío. Las relaciones históricas rechazan eliminaciones que borren rondas, líneas o comandas de pedidos conservados.

## Prueba autónoma

**Preparación:** una mesa abierta, dos Kitchens (una con impresora y otra sin ella), dos preparaciones del mismo plato y un producto sin Kitchen. Worker detenido; transporte de avisos controlado en pruebas.

**Recorrido:**

1. Enviar las líneas desde el borrador y abrir el detalle. Verificar dos comandas, un trabajo y todos los productos en la cuenta; comparar bytes y datos persistidos.
2. Agregar otra preparación del mismo plato y enviarla: ronda 2, líneas nuevas y solo sus adicionales.
3. Repetir la primera solicitud, competir con el mismo ID y luego con IDs distintos; verificar correlativos y protección de revisión. Repetir después de preparar un borrador nuevo.
4. Forzar fallo al guardar un trabajo y comprobar rollback completo; perder la respuesta o el aviso después de commit y recuperar el mismo envío.
5. Probar IDs ajenos, producto inválido, Kitchen inactiva, desconexión y cambios posteriores de nombre/notas del producto.
6. Verificar formato con perfiles 58/80 mm, notas largas y caracteres españoles. Comprobar que no quedan controles de preparación/servido bloqueando el recorrido.

**Evidencia de cierre:** capturas de borrador/detalle, pruebas de dominio y encoder, conteos e importes en PostgreSQL y concurrencia real. La tarea termina con el trabajo persistido; su ejecución no requiere estar implementada para validar este flujo.
