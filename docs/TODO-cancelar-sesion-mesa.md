# TODO: mantener accesible la cancelación de sesiones de mesa

Prioridad: P1

## Problema

Al seleccionar una mesa ocupada, la interfaz redirige directamente al pedido o
al pago. Ninguna de esas pantallas permite cancelar la sesión.

Esto deja la mesa bloqueada cuando todos los artículos enviados fueron
cancelados:

- El pago no acepta una cuenta sin productos activos o con total cero.
- Volver desde el pedido usa `leaveEmptyTable`, que solo libera una apertura
  propia, vacía y sin artículos enviados previamente.
- Los artículos cancelados permanecen en el historial, por lo que la sesión ya
  no se considera una apertura vacía.

La sesión continúa vigente y la mesa permanece ocupada sin una salida desde la
interfaz.

## Tarea

- [ ] Mantener una acción **Cancelar sesión** accesible desde el flujo de una
  mesa ocupada.
- [ ] Solicitar y validar un motivo de cancelación.
- [ ] Reutilizar la acción existente `closeTable(tableId, true, reason)`.
- [ ] Permitir la cancelación de sesiones `OPEN` y `BILL_REQUESTED`.
- [ ] Al completar la acción, volver al listado y mostrar la mesa como libre.
- [ ] Conservar la orden, los artículos y el motivo como historial de auditoría.
- [ ] Añadir una prueba que cubra una sesión cuyos artículos enviados fueron
  cancelados y cuyo total es cero.

## Criterios de aceptación

1. Una sesión ocupada puede cancelarse desde la interfaz aunque tenga artículos
   históricos.
2. La cancelación exige un motivo no vacío.
3. La sesión termina con estado `CANCELLED` y deja de ser la sesión vigente.
4. La orden asociada queda cancelada y la mesa puede abrirse nuevamente.
5. El flujo no depende de completar un pago ni modifica las restricciones de
   `leaveEmptyTable`.

## Archivos relacionados

- `src/table/components/table-grid.tsx`
- `src/table/components/table-order-view.tsx`
- `src/table/components/table-payment-view.tsx`
- `src/table/components/table-session-panel.tsx`
- `src/table/components/table-actions-menu.tsx`
- `src/table/actions.ts`
- `src/table/use-cases/close-table-session.ts`
