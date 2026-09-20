# KIT-05 — Cancelar platos, cobrar las cantidades vigentes y liberar la mesa

Estado: pendiente de implementación y pruebas.
Dependencias: [KIT-03](03-enviar-rondas-desde-mesas.md).
Fuente: [diseño — cancelaciones y estado de pago](../2026-09-13-kitchens-comandas-impresas-design.md#cantidad-vigente-y-cancelaciones).

## Flujo y resultado

El mozo cancela parte de una preparación enviada, consulta la cuenta corregida, cobra lo vigente y libera la mesa. Las cantidades originales y cancelaciones quedan disponibles para auditoría y reimpresión.

## Alcance

- `cancelRoundItem`, `OrderItemCancellation`, integración con acciones y detalle de mesas; consulta de cantidades enviadas, canceladas y vigentes.
- Recálculo con helpers existentes y consumidores afectados de cuenta, caja, cobro, documentos y comprobantes, incluidas líneas repetidas y cantidades cero.
- `OrderPaymentStatus`/`Order.paymentStatus`, escrituras de pago atómicas y separación entre pagar y completar el pedido; adaptación del flujo RETAIL para conservar su comportamiento.
- Cierre de sesión/liberación de mesa atómico y eliminación de dependencias financieras de `kitchenStatus`.
- Índice de cancelaciones por ítem/fecha, relaciones históricas restrictivas y protección compartida entre envío, cancelación y cobro.

## Fuera de alcance

Devoluciones, autorización adicional del administrador, impresión de cancelaciones, reimpresiones, nuevo motor de precios o descuentos, seguimiento de preparación y UI de entrega de para llevar/delivery.

## Criterios de aceptación

1. El mozo autorizado puede cancelar una cantidad positiva parcial o total de un `orderRoundItemId` de su empresa con motivo vacío, sin aprobación adicional ni estado de preparación. La coordinación previa con cocina es responsabilidad del mozo.
2. La operación recibe `cancellationId`, ítem, cantidad y motivo opcional; empresa/usuario provienen de sesión. Bajo protección del pedido valida permisos, `paymentStatus = PENDING` y que la cantidad no exceda lo disponible tanto en la copia de ronda como en su OrderItem.
3. Crear la cancelación, reducir `OrderItem.quantity` y recalcular línea/pedido es atómico. Cancelar uno de tres lomos deja dos vigentes y una cancelación de uno; otra preparación del mismo producto permanece intacta.
4. Cancelar el resto conserva OrderItem con cantidad e importes cero, y OrderRoundItem con cantidad original. No se agrega `cancelledQuantity` ni se resta otra vez el historial al leer OrderItem. Las consultas de líneas vigentes usan `quantity > 0`.
5. Repetir el mismo ID devuelve la operación sin nuevo descuento; reutilizarlo para otra solicitud se rechaza. Dos cancelaciones simultáneas no superan lo disponible y una carrera con cobro no modifica un pedido ya pagado. Todas las operaciones usan un orden consistente de bloqueo y validan después de bloquear.
6. Los cálculos reutilizan las reglas existentes de importes y descuentos y cubren explícitamente cantidad cero. Cuenta, caja, reportes y comprobantes afectados admiten varias líneas del mismo producto y no cuentan cantidades canceladas ni dividen por cero. Agrupar al presentar no altera las líneas persistidas ni sus importes.
7. Registrar el cobro y cambiar a `PAID` es atómico y mantiene los controles financieros existentes. Cobrar no agrega productos, rondas ni trabajos y no completa por sí solo el pedido de restaurante. Los consumidores que inferían pago desde `status = COMPLETED` consultan `paymentStatus`.
8. Una mesa pagada mantiene `status = PENDING` hasta liberarla. Liberar exige `PAID` y cambia a `COMPLETED` en la misma transacción que cierra la sesión; un fallo revierte ambos. No requiere impresión exitosa ni estados de platos.
9. Cancelar platos o cancelar el pedido se rechaza si está pagado. Cancelar un pedido no pagado cambia a `CANCELLED` y mantiene `paymentStatus = PENDING`; no existe reversión de PAID a PENDING.
10. RETAIL sigue creando venta, pago y pedido `COMPLETED`/`PAID` en su misma operación. La introducción del campo no deja ventas retail ya pagadas interpretadas como pendientes; resolver su inicialización a partir de la fuente de pago existente sin convertir rondas históricas de restaurante.
11. Cancelar no crea avisos impresos ni modifica bytes de trabajos previos. Historial de cancelaciones, usuarios y rondas no se elimina por cascadas.

## Prueba autónoma

**Preparación:** mesa con dos preparaciones del mismo plato, otra ronda y descuentos representativos; cuenta/caja habilitadas según las reglas existentes. Fixture de venta RETAIL pagada previo a la migración y otra venta nueva. No requiere worker ni reimpresión.

**Recorrido:**

1. Cancelar uno de tres platos con motivo vacío; consultar ronda, cuenta e importes persistidos. Confirmar que no cambia otra preparación ni el número de trabajos.
2. Cancelar los restantes y verificar ceros, historial intacto y documentos sin cantidades canceladas. Probar cantidad cero, negativa y excesiva como entradas rechazadas.
3. Repetir cancellationId, perder respuesta tras commit y forzar rollback durante el recálculo.
4. Competir con dos cancelaciones y con un cobro; comprobar que el resultado corresponde a un orden válido sin sobrecancelación ni pago inconsistente.
5. Cobrar la cuenta vigente, comprobar PAID/PENDING, intentar cancelar y luego liberar la mesa. Forzar fallo durante el cierre para comprobar atomicidad de sesión/pedido.
6. Probar empresa ajena, cancelación del pedido no pagado y regresión de RETAIL anterior/nuevo. Verificar que cobrar no duplica líneas ni comandas.

**Evidencia de cierre:** cuenta y cierre visibles, comprobantes e importes antes/después, pruebas de cálculo y transacciones/concurrencia contra PostgreSQL. KIT-06 y KIT-07 no son necesarios para probar este flujo.
