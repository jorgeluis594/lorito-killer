# Consultas de ventas: cobrado vs. entregado (DEL-05)

`Order.status = COMPLETED` significa "entregado" para Delivery y Para llevar,
no "cobrado". Un Delivery cobrado y despachado sigue `PENDING` pero el dinero
ya entró a caja. Las consultas de ventas deben usar
`status <> CANCELLED AND (paymentStatus = PAID OR status = COMPLETED)`.
La venta se ubica en el día del **cobro** (fecha del primer `Payment`; sin pagos,
la fecha de creación).

| Consulta | Archivo | Criterio previo | Resultado |
| --- | --- | --- | --- |
| KPIs, tendencia, desglose de pagos, top productos, resumen de caja del dashboard | `src/dashboard/db_repository.ts` (`buildCompletedOrderWhere`, `buildOrderSqlFilters`) | `PAID` y no `CANCELLED`, por fecha de creación | Corregido: filtro compartido, por fecha del cobro |
| Ventas recientes del dashboard | `src/dashboard/db_repository.ts` (`findRecentSales`) | Todos los estados, la etiqueta sale de `Order.status` | Un Delivery/Para llevar cobrado y no entregado se rotula “Cobrado · por entregar” (no “Pendiente”) |
| Reporte de ventas y de vendedores | `src/sale_report/db_repository.ts` (`buildOrderWhere`) | `status = COMPLETED` | Corregido: `salesOrderStatusFilter` |
| Listado y exportación de documentos (reporte de ventas, API `sale_reports`, XLSX SIRE) | `src/document/db_repository.ts` (`buildDocumentQuery`) | `status = COMPLETED` | Corregido: `salesOrderStatusFilter` |
| Totales de la caja (`prismaCashShiftToCashShift`) | `src/cash-shift/db_repository.ts` | `PAID` y no `CANCELLED` | Sin cambio |

El filtro compartido está en `src/order/use-cases/sales-order-status-filter.ts`.
Un pedido se cuenta una vez: al entregarlo cambia `status` a `COMPLETED`, pero
el filtro no depende de ese estado, así que los totales no varían.

## Riesgo: órdenes históricas COMPLETED sin cobro registrado

La migración `20260915230000_add_item_cancellations_and_payment_status` creó
`paymentStatus` con valor `PENDING` y solo marcó `PAID` a las órdenes con filas
`Payment`. Una orden `COMPLETED` anterior sin `Payment` quedó `PENDING`. Para no
sacarlas del reporte ni de la exportación fiscal, “cobrada” incluye
`status = COMPLETED`; sin pagos se fechan por creación. No hay migración de datos.
Para cuantificar el caso (solo lectura):
`SELECT count(*) FROM "Order" WHERE status='COMPLETED' AND "paymentStatus"='PENDING';`
