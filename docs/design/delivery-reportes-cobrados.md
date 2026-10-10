# Consultas de ventas: cobrado vs. entregado (DEL-05)

`Order.status = COMPLETED` significa "entregado" para Delivery y Para llevar,
no "cobrado". Un Delivery cobrado y despachado sigue `PENDING` pero el dinero
ya entró a caja. Las consultas de ventas deben usar
`paymentStatus = PAID AND status <> CANCELLED`.

| Consulta | Archivo | Criterio previo | Resultado |
| --- | --- | --- | --- |
| KPIs, tendencia, desglose de pagos, top productos, resumen de caja del dashboard | `src/dashboard/db_repository.ts` (`buildCompletedOrderWhere`, `buildOrderSqlFilters`) | `PAID` y no `CANCELLED` | Sin cambio |
| Ventas recientes del dashboard | `src/dashboard/db_repository.ts` (`findRecentSales`) | Todos los estados, la etiqueta sale de `Order.status` | Sin cambio (lista, no totaliza) |
| Reporte de ventas y de vendedores | `src/sale_report/db_repository.ts` (`buildOrderWhere`) | `status = COMPLETED` | Corregido: `salesOrderStatusFilter` |
| Listado y exportación de documentos (reporte de ventas, API `sale_reports`, XLSX SIRE) | `src/document/db_repository.ts` (`buildDocumentQuery`) | `status = COMPLETED` | Corregido: `salesOrderStatusFilter` |
| Totales de la caja (`prismaCashShiftToCashShift`) | `src/cash-shift/db_repository.ts` | `PAID` y no `CANCELLED` | Sin cambio |

El filtro compartido está en `src/order/use-cases/sales-order-status-filter.ts`.
Un pedido se cuenta una vez: al entregarlo cambia `status` a `COMPLETED`, pero
el filtro no depende de ese estado, así que los totales no varían.
