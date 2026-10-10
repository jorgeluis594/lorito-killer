# DEL-04 — Implementación

Rama: del-04-editar-y-listar (2 commits sobre c3305c6). BD propia: contenedor `del-04-db` (puerto 55404, base lorito_killer_del_04), migraciones existentes aplicadas; DEL-04 no agrega migración.

## Qué se hizo
- `updateDeliveryDetails` (src/delivery/db_repository.ts, acción `editDeliveryDetails`): transacción Serializable; bloquea Order, relee documento/pago/versión bajo el bloqueo; `updatedAt` distinto → rechazo "recarga"; contacto editable siempre; envío/medio/“paga con” solo sin documento ni pago (con documento se rechaza toda la solicitud); cambio de envío recalcula `Order.total/netTotal` con `recalculateOrderTotals` y revalida “paga con” (rollback si no cubre); toda edición actualiza `Order.updatedAt`. Reintento acotado ante conflicto de serialización (relee y decide de nuevo). Empresa/actor de la sesión; el esquema descarta total/estado/actor del cliente. Sin realtime nuevo.
- `listDeliveryOrders` (acción `searchDeliveryOrders`): día de Lima (por defecto hoy), estado (por defecto Pendiente+Despachado), búsqueda por nombre (insensible) o parte del teléfono, cursor por orderId con orden createdAt desc, orderId desc; solo DELIVERY de la empresa, sin cancelados.
- Reglas puras: `use-cases/is-delivery-overdue.ts` (DISPATCHED y ≥ 2 h), `use-cases/plan-delivery-edit.ts` (qué cambia / bloqueo por documento).
- UI: `delivery-edit-form.tsx` en el detalle (order-data.tsx; campos de envío deshabilitados con explicación si hay comprobante), página `src/app/[subdomain]/dashboard/delivery/page.tsx` con filtros en URL (búsqueda con debounce), lista con resaltado "Atrasado", entrada "Delivery" en el menú (feature restaurants + permiso delivery read), ruta protegida en proxy.ts, icono Bike.

## Casos §11 (todos pasan)
| Caso | Dónde |
| --- | --- |
| L1 (+ validaciones DEL-02, Pendiente/Despachado) | tests/integration/delivery-edit-list.test.ts |
| L2 (PENDING y DISPATCHED, “paga con” revalidado, cobro posterior con total editado) | idem |
| L3 (pago real y documento sembrado; rechazo completo) | idem |
| L4 versión vencida | idem |
| L5, L6, L7, L8 (cursor con empates de hora, filtros antes de paginar) | idem; L7 también en src/delivery/__TEST__/is-delivery-overdue.test.ts |
| X2 (Promise.all ×8 + dos órdenes deterministas) | idem |
| S1, S2, S3 de edición y lista (+ S4 autoridad del cliente en edición) | idem |
Reglas puras: src/delivery/__TEST__/{is-delivery-overdue,plan-delivery-edit}.test.ts.

## Comandos
- `npx prisma migrate deploy` (solo BD propia) — OK
- `npm test` — 61 archivos, 401 tests, todos pasan
- `npm run lint` — 0 errores (2 warnings preexistentes react-hooks)
- `npx tsc --noEmit` — 5 errores PREEXISTENTES (src/cash-shift/__TEST__/db_repository.test.ts 118,119; tests/integration/kitchen-print-job-coordination.test.ts 205,236,239), ninguno en archivos de DEL-04.

## Pendientes / notas
- Prueba exploratoria en navegador no ejecutada (no se levantó la app).
- Si en X2 pierde el cobro por conflicto de serialización, `payFulfillmentOrder` devuelve el texto crudo de Postgres (solo mapea P2034, no P2010/40001). Sigue siendo rechazo coherente; no se tocó ese archivo para no chocar con DEL-03.
- Sin Redis local: ruido ECONNREFUSED de ioredis en tests, sin efecto.
- La lista filtra por `Order.createdAt` del día de Lima: un despachado de ayer aún en la calle no aparece salvo que se filtre por esa fecha.
