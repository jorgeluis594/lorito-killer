# Delivery dentro de Mesas

Propuesta para que delivery deje de ser un flujo aparte y se gestione completo
desde la vista de Mesas, pidiendo solo los datos que la entrega necesita.

## Idea central

**Un delivery es una sesión de mesa sin mesa.** Usa el mismo borrador, las
mismas rondas, la comanda, el cobro con comprobante y el cierre que una mesa.
Lo único propio de delivery es:

- los datos de entrega (teléfono, dirección, referencia, nombre y envío);
- el estado "En camino" (despachar y entregar);
- su sección dentro de la vista de Mesas.

## Situación actual

Hoy delivery y mesas no comparten pantallas ni lógica.

| | Mesas | Delivery |
| --- | --- | --- |
| Entrada | `/dashboard/tables` | Botón "Para llevar / Delivery" del dashboard (`dashboard-header.tsx:35`) → `/dashboard/orders/fulfillment?type=DELIVERY` |
| Toma de pedido | `table-order-view.tsx` con borrador automático y rondas | `fulfillment-order.tsx`, otro buscador de productos (`ProductsSearcher`) |
| Cobro | `table-payment-view.tsx`: boleta/factura, efectivo, tarjeta, billetera y pago combinado | `fulfillment-payment-button.tsx`: solo efectivo, débito o crédito, siempre ticket |
| Seguimiento | Grilla de mesas | Página aparte `/dashboard/delivery`, con su propia entrada en el menú (`constants/data.ts:48`) |
| Edición | Misma toma de pedido | `/dashboard/orders/[id]`, que suma `delivery-edit-form.tsx` (235 líneas) y `delivery-actions.tsx` |
| Backend | `src/table/*` | `src/order/rounds/fulfillment-*`, `src/order/fulfillment-payment-repository.ts` (~830 líneas) |

### Fricción

- **Demasiadas pantallas.** Seguir un servicio exige pasar por 3 pantallas y 2
  menús. El cajero no ve mesas y deliveries juntos.
- **Todo está duplicado.** Hay 2 tomas de pedido, 2 cobros y 2 formularios de
  delivery: uno para crear y otro para editar.
- **El cobro de delivery es más pobre que el de mesas.** No tiene billetera, ni
  pago combinado, ni boleta o factura. Sin embargo, "pago esperado:
  billetera" sí existe como opción.
- **Se piden 7 campos al crear.** "Pago esperado" y "paga con" se piden antes
  de tiempo, porque el cobro ya resuelve ese dato.
- **No se puede entregar sin cobrar** (`delivery-transition.ts:17`). Eso
  obliga a cobrar antes en un pedido que se paga contra entrega.

## Diseño propuesto

### Vista de Mesas con la sección Delivery

```
┌ Mesas ─────────────────────────────────────── [+ Delivery] ┐
│ [Panel de atención de cocina]                              │
│ Delivery  3                                                │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│ │ Ana · 987654321  │ │ Luis · 912345678 │ │ 955111222    │ │
│ │ Av. Sol 123      │ │ Jr. Lima 45      │ │ Calle 8 #12  │ │
│ │ ● Preparando     │ │ ● En camino 25'  │ │ ● Entregado  │ │
│ │ S/ 48 · Sin cobrar│ │ S/ 30 · Cobrado  │ │ S/ 22 · Sin cobrar │
│ │ [Despachar]      │ │ [Entregado]      │ │ [Cobrar]     │ │
│ └──────────────────┘ └──────────────────┘ └──────────────┘ │
│ Ver entregados de hoy →                                    │
│                                                            │
│ En atención  2     (igual que hoy)                         │
│ Libres  6          (igual que hoy)                         │
└────────────────────────────────────────────────────────────┘
```

- **Ubicación.** La sección va arriba de las mesas y solo aparece si hay
  deliveries activos. El botón "+ Delivery" siempre está en el encabezado.
- **Varios a la vez.** "+ Delivery" crea siempre un pedido nuevo, aunque ya
  haya otros abiertos. Cada pedido es una tarjeta, y el contador ("Delivery 3")
  muestra cuántos hay. Las tarjetas se ordenan por estado (primero las que
  piden acción: por despachar, luego en camino y luego sin cobrar) y dentro de
  cada estado por antigüedad. En escritorio y tablet, la grilla baja a varias
  filas; en celular, es un carrusel horizontal.
- **Estados del pedido:** Preparando → En camino → Entregado. "En camino"
  muestra los minutos transcurridos y se pinta en ámbar si va atrasado (se
  reusa `is-delivery-overdue`).
- **Cobro como chip aparte.** Muestra "Cobrado" o "Sin cobrar", así no se
  multiplican los estados.
- **Tarjeta.** Cada tarjeta tiene una sola acción principal: Despachar,
  Entregado o Cobrar. Tocar la tarjeta abre el pedido.
- **Cierre.** Cuando el pedido está entregado y cobrado, la sesión se cierra
  (equivale a liberar la mesa) y la tarjeta desaparece.
- **Historial.** El enlace "Ver entregados de hoy" reemplaza a la página
  `/dashboard/delivery` y a su entrada en el menú.

### Crear un delivery: 2 pasos

```
Paso 1: hoja "+ Delivery"          Paso 2: la misma toma de pedido de mesas
┌ Nuevo delivery ──────────┐       ┌ ← Delivery · Ana · Av. Sol 123  ✎ ┐
│ Teléfono*  [987 654 321] │       │ Productos           │ Pedido       │
│ Dirección* [___________] │       │                     │ ...          │
│ Referencia [___________] │       │                     │ Envío   5.00 │
│ Nombre     [___________] │       │                     │ Total  53.00 │
│ Envío S/   [5.00]        │       │ [Enviar a cocina]   [Cobrar]       │
│          [Continuar →]   │       └────────────────────────────────────┘
└──────────────────────────┘
```

### Datos de delivery: solo lo necesario

| Campo | Hoy | Propuesta |
| --- | --- | --- |
| Teléfono | Obligatorio | Obligatorio |
| Dirección | Obligatoria | Obligatoria |
| Referencia | Opcional | Opcional; también sirve para notas como "paga con 100" |
| Nombre | Obligatorio | Opcional; si falta, se muestra el teléfono |
| Envío | Se escribe en cada pedido | Precargado con el último valor usado; editable |
| Pago esperado | Opcional | **Se elimina**: lo decide el cobro |
| Paga con | Opcional | **Se elimina**: lo decide el cobro, o se anota en la referencia |

Sin "pago esperado" y "paga con", también desaparecen las validaciones
cruzadas contra el total que hoy hace `validate-delivery-details.ts` (212
líneas).

### Qué se reusa y qué es propio

**Se reusa tal cual de Mesas:**

- borrador y rondas;
- adicionales, desde la misma pantalla mientras el pedido no se haya despachado;
- anulación de ítems (`cancel-order-item-dialog`);
- comanda de cocina;
- cobro completo con comprobante (`TablePaymentView`);
- tiempo real (`TableRealtimeListener`);
- anulación de la sesión (`TableSession.cancellationReason`).

**Es propio de delivery:**

- el encabezado con contacto, dirección y ✎ en lugar de "Mesa N";
- la línea "Envío" en los totales del pedido y del cobro;
- las acciones Despachar y Entregado;
- la tarjeta de la sección Delivery.

### Edición

✎ abre la misma hoja del paso 1, ya rellenada. Reemplaza a
`delivery-edit-form.tsx`. Se mantienen las reglas actuales:

- el contacto se puede editar siempre;
- el envío queda bloqueado si ya hay comprobante (`plan-delivery-edit.ts`);
- los productos quedan bloqueados después del despacho
  (`can-edit-fulfillment-products.ts`).

### Cierre de caja

Se mantiene el aviso de pedidos sin cobrar, que no bloquea el cierre. Cada
pedido del aviso enlaza a su toma de pedido dentro de Mesas.

### Celular

```
┌ Mesas          [+ Delivery] ┐
│ Delivery 3    ‹ desliza ›   │
│ [tarjeta][tarjeta][tarj…    │  ← carrusel, una acción grande por tarjeta
│ En atención ...             │
│ Libres [1][2][3][4]         │
└─────────────────────────────┘
```

- La hoja "+ Delivery" se abre como panel inferior, y el teléfono usa
  `inputMode="tel"`.
- La toma de pedido mantiene el cambio entre Productos y Pedido que ya existe
  (`mobileView` en `table-order-view.tsx`).
- Los botones miden al menos 44 px de alto.

## Cambios técnicos

### Modelo de datos

La migración es segura porque el restaurante todavía no está en producción.

- **`TableSession.tableId` pasa a ser opcional.** Una sesión sin mesa es un
  delivery. `@@unique([tableId, current])` sigue funcionando porque Postgres
  permite varios `NULL`.
- **Varios deliveries a la vez.** Como el índice único ignora las sesiones sin
  mesa, se pueden abrir todos los deliveries que haga falta al mismo tiempo,
  sin límite. Las rutas identifican cada delivery por `sessionId`, no por
  mesa, y la sección muestra una tarjeta por cada sesión abierta.
- **El pedido se guarda como delivery.** `Order.orderType = DELIVERY` para
  estas sesiones. Hoy se fija `DINE_IN` en `src/table/draft-repository.ts` y en
  `src/table/db_repository.ts`.
- **`Delivery` se simplifica.** Sigue colgando de `orderId`. Se eliminan
  `expectedPaymentMethod`, `cashPaysWith` y el enum `DeliveryExpectedPayment`,
  y `name` pasa a ser opcional.

### Rutas

- **Se crean** `tables/delivery/[sessionId]/order` y
  `tables/delivery/[sessionId]/payment`. Usan `TableOrderView` y
  `TablePaymentView` con otro encabezado, pasado como prop.
- **Cambia `getTablePaymentData`** (`src/table/payment-repository.ts`): hoy
  busca por `tableId` y pasa a buscar por `sessionId`.

### Archivos

| Acción | Archivos |
| --- | --- |
| Crear | `src/delivery/components/delivery-section.tsx` (tarjetas), `src/delivery/components/delivery-sheet.tsx` (crear y editar), acción `openDelivery` (crea la sesión y el `Delivery`) |
| Modificar | `table-grid.tsx` y `tables/page.tsx` (sección Delivery), `delivery/db_repository.ts` (al entregar, cierra la sesión si ya está cobrada), `delivery-transition.ts` (permite entregar sin cobrar), `validate-delivery-details.ts` (menos campos), `close-cash-shift-form.tsx` (enlaces), `create-kitchen-ticket-content.ts` (mantiene el contacto en la comanda) |
| Eliminar | `orders/fulfillment/page.tsx`, `fulfillment-order.tsx`, `fulfillment-payment-button.tsx`, `src/order/fulfillment-payment-repository.ts`, `src/order/rounds/fulfillment-*`, `dashboard/delivery/page.tsx`, `delivery-list-filters.tsx`, `delivery-edit-form.tsx`, `delivery-actions.tsx`, `parse-delivery-search.ts`, `initial-cash-received.ts`, el bloque de delivery en `order-data.tsx`, la entrada del menú en `constants/data.ts`, el botón del dashboard en `dashboard-header.tsx`, y los tests de todo lo anterior |

En total, se borra más código del que se agrega.

### Riesgos

- **`tableId` opcional.** Al volverlo opcional, se rompen los usos de
  `session.table` que hoy no verifican si existe (por ejemplo, `tableLabel` en
  `payment-repository.ts`). Hay que revisar cada uso de `.table`, y también
  realtime y cocina.
- **Reportes.** Ventas, documentos y dashboard ya cuentan por fecha de cobro
  (`docs/design/delivery-reportes-cobrados.md`). Hay que comprobar que siguen
  funcionando con pedidos `DELIVERY` que nacen de una sesión.
- **Pedidos históricos.** Los deliveries creados por el flujo `fulfillment`
  quedan como `Order` sin sesión. Hoy no hay clientes que los usen, así que no
  hace falta migrar datos.

## Plan sugerido por PRs

1. **Modelo.** `tableId` opcional, se simplifica `Delivery`, y las sesiones de
   delivery se guardan con `orderType = DELIVERY`.
2. **Toma de pedido y cobro.** Hoja "+ Delivery", sección Delivery en Mesas, y
   toma de pedido y cobro reusados con el encabezado de delivery.
3. **Seguimiento.** Despachar y Entregado en la tarjeta, entregar sin cobrar,
   y cierre de sesión al terminar.
4. **Limpieza.** Se elimina el flujo `fulfillment` y la página
   `/dashboard/delivery`, y se actualiza el aviso de cierre de caja.

## Decisiones tomadas (15 de octubre de 2026)

1. **Para llevar** entra en Mesas como sesión sin mesa y sin `Delivery`
   (`orderType = TAKE_AWAY`). No se despacha: se cobra y, al recogerlo,
   "Entregado" cierra la sesión. El flujo `fulfillment` se eliminó completo.
2. Se permite entregar sin cobrar; la tarjeta muestra "Sin cobrar" y pide
   "Cobrar". Al cobrar un delivery ya entregado, la sesión se cierra.
3. "Paga con" se anota en la referencia.
4. El envío se precarga con el último valor usado en la empresa y es editable.
5. No se asigna repartidor; se registra quién despachó y quién entregó.
6. El aviso de cierre de caja no incluye mesas abiertas.
7. Basta "Entregados hoy" (`/dashboard/tables/delivery`) más los reportes.
8. Crear, despachar y entregar usan el mismo permiso que atender una mesa
   (`tables:update`). Hoy caja (CASHIER) solo tiene `tables:read`: cobra, pero
   no crea ni despacha deliveries.
