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

## Nombre del cliente y etiqueta de los pedidos sin mesa

Cada pedido Para llevar y Delivery se reconoce por el nombre del cliente en
la tarjeta, la toma de pedido, el cobro y la comanda, y ningún texto de un
pedido sin mesa habla de «mesa».

### Nombre del cliente

- **Qué es.** A nombre de quién va el pedido (texto visible «Nombre del
  cliente»). Es un rótulo para encontrar el pedido, no un cliente del
  catálogo ni del comprobante: no se copia a la boleta o factura ni crea un
  cliente. Razón: se dice de palabra en el mostrador; el comprobante tiene sus
  propios datos.
- **Opcional** en Para llevar y en Delivery; ninguna acción lo exige. Razón:
  obligarlo hace inventar nombres como «cliente» en hora punta.
- **Limpieza.** Se quitan los espacios al inicio y al final; un nombre de solo
  espacios cuenta como sin nombre. Máximo 120 caracteres; el servidor rechaza
  más con «El nombre puede tener hasta 120 caracteres.» (reglas en
  `src/delivery/use-cases/normalize-customer-name.ts`).
- **Dónde se guarda.** Para llevar en `TableSession.customerName`; Delivery
  sigue en `Delivery.name`. Solo tiene valor en sesiones sin mesa con orden
  `TAKE_AWAY`, y sus únicos escritores son la apertura y el renombre de Para
  llevar. Razón: renombrar no cambia `Order.updatedAt` (versión del cobro y de
  la edición de Delivery) ni `draftRevision`, así que no rechaza un cobro en
  curso. Descartado: `Order.customerName`, porque cada renombre rechazaría un
  cobro abierto en otro dispositivo.
- Solo se guarda el último nombre, sin historial. Los Para llevar abiertos
  antes de existir el campo quedan sin nombre y lo aceptan desde el lápiz.
- Dos pedidos pueden llamarse igual; la tarjeta los distingue por la hora de
  apertura y no se avisa ni se bloquea.

### Abrir un Para llevar

**Para llevar** en Mesas abre la hoja «Nuevo pedido para llevar» (panel
inferior en celular y tablet, centrada en escritorio, como la de Delivery) con
un único campo, «Nombre del cliente», con el cursor puesto y sin
autocompletado del navegador (el dispositivo es compartido y la lista taparía
el botón). **Continuar al pedido** (o la tecla «Ir» del teclado) crea el
pedido y abre su toma de pedido, también con el campo vacío. Razón: la comanda
se imprime al enviar; si el nombre se pide después, sale sin él.

- El campo no acepta más de 120 caracteres; al pegar un texto más largo se
  conservan los primeros 120 y aparece «Se recortó a 120 caracteres.» como
  ayuda, no como error.
- Mientras se crea, el campo y la hoja quedan bloqueados. Cerrar la hoja sin
  confirmar no crea nada.
- **Apertura sin duplicar.** Cada apertura de la hoja es un intento con su
  propia clave, que se usa como `id` de la `TableSession`. Repetir **Continuar
  al pedido** en la misma hoja tras un error o una respuesta perdida abre el
  pedido que ese intento ya creó, nunca otro; si otro dispositivo ya lo cerró,
  se abre su página con «Este pedido ya se cerró.». Cerrar la hoja y volver a
  tocar **Para llevar** es un pedido nuevo. Razón: evita pedidos duplicados sin
  agregar tablas ni columnas.
- Si el reintento trae otro nombre, se abre el pedido con el nombre del primer
  intento; se corrige con el lápiz.
- Sin respuesta, la hoja muestra «No se recibió la respuesta. Vuelve a tocar
  Continuar al pedido: si el pedido ya se creó, se abre ese mismo.» con el
  nombre intacto. Si la cierra, Mesas se actualiza y un pedido vacío que haya
  quedado se quita con **Liberar pedido** (no tiene productos, dinero ni
  comanda).
- `openDelivery` solo abre deliveries; Para llevar se abre con
  `openTakeAway`. La apertura de Delivery no es idempotente: un delivery vacío
  se quita con **Liberar delivery**.

### Corregir el nombre

En la toma de pedido de un Para llevar, el lápiz del encabezado («Editar
nombre del cliente», mismo lugar y tamaño que el de Delivery) abre la hoja
«Nombre del cliente» con el nombre actual y **Guardar nombre**. Vaciar el campo
deja el pedido sin nombre.

- Se edita mientras el pedido esté abierto, también después de enviar a
  cocina o de cobrar.
- **Conflicto solo por nombre.** La hoja envía el nombre que vio; bajo un
  bloqueo de la fila de la sesión, guardar el mismo nombre ya guardado es
  éxito, y si otro dispositivo cambió o quitó el nombre se rechaza con «Otro
  dispositivo cambió el nombre a {actual}. Revisa y vuelve a guardar.» u «Otro
  dispositivo quitó el nombre. Revisa y vuelve a guardar.», con lo escrito
  intacto. **Guardar nombre** de nuevo guarda lo escrito. Enviar rondas,
  cobrar o entregar no cuentan como conflicto. Razón: el nombre es
  independiente del contenido del pedido.
- Pedido cerrado ⇒ «Este pedido ya se cerró.»; inexistente, de otra empresa,
  de mesa o delivery ⇒ «Este pedido ya no está disponible.», igual en todos los
  casos para no revelar nada. Ambos ofrecen **Volver a Mesas**.
- La transacción espera hasta 20 s el bloqueo, por encima de los 15 s de un
  cobro; si aun así vence responde «No se pudo guardar el nombre. Vuelve a
  intentarlo.» y reintentar es seguro.
- Al guardar, la hoja se cierra con «Nombre guardado» y Mesas se actualiza.
  Las comandas ya impresas no cambian; **Reimprimir** saca el nombre nuevo.
- Los flujos `Serializable` que escriben la misma sesión (guardado del
  borrador, envío, cobro, entrega) reintentan hasta 2 veces ante un conflicto
  de serialización, así que un renombre nunca provoca «El pedido cambió en
  otro dispositivo».

En Delivery el campo de la hoja se llama también «Nombre del cliente», sin
autocompletado, con la ayuda «Si lo dejas vacío, la tarjeta muestra el
teléfono y la comanda la hora del pedido.». Su conflicto de edición sigue
siendo el de todo el pedido.

### Etiqueta del pedido

`describeServiceOrder` (`src/delivery/use-cases/describe-service-order.ts`) es
la única fuente de los textos que nombran un pedido sin mesa; ninguna
superficie arma su etiqueta por su cuenta. Usa el nombre o, sin él, la hora de
apertura (`TableSession.openedAt`) en 12 horas de America/Lima, el formato del
encabezado de la comanda («9:40 p. m.»). Delivery sin nombre usa el teléfono
donde se puede mostrar.

| Superficie | Para llevar con nombre | Para llevar sin nombre | Delivery con nombre | Delivery sin nombre |
| --- | --- | --- | --- | --- |
| Tarjeta: título / subtítulo | «Rosa» / «Para llevar · desde las 9:40 p. m.» | «Para llevar» / «Desde las 9:40 p. m.» | «Ana» / «987 654 321» | «987 654 321» / sin subtítulo |
| Toma de pedido y cobro: título | «Para llevar · Rosa» | «Para llevar» | «Delivery · Ana» | «Delivery · 987 654 321» |
| Confirmación al enviar | «Pedido de Rosa enviado» | «Pedido para llevar enviado» | «Pedido de Ana enviado» | «Pedido de delivery enviado» |
| Comanda: línea del pedido | «Para llevar: Rosa» | «Para llevar: pedido de las 9:40 p. m.» | «Delivery: Ana» | «Delivery: pedido de las 8:15 p. m.» |
| «Impresiones pendientes» | «Para llevar · Rosa · Cocina» | «Para llevar · pedido de las 9:40 p. m. · Cocina» | «Delivery · Ana · Cocina» | «Delivery · pedido de las 8:15 p. m. · Cocina» |
| Aviso de pedidos sin cobrar | «Para llevar · Rosa · Pendiente» | «Para llevar · pedido de las 9:40 p. m. · Pendiente» | «Delivery · Ana · Despachado» | «Delivery · 987 654 321 · Pendiente» |
| «Entregados hoy» | «Para llevar · Rosa» | «Para llevar · pedido de las 9:40 p. m.» | «Delivery · Ana» | «Delivery · 987 654 321» |

- La comanda y «Impresiones pendientes» nunca muestran teléfono ni dirección;
  el diálogo repite lo que dice el papel para reconocer la misma comanda.
- Sin nombre, la comanda imprime la hora de apertura y nunca el código interno
  del pedido. Razón: el código no lo dice nadie en voz alta; la hora coincide
  con la tarjeta. Descartado: un número corto de pedido, que exige una
  numeración correlativa que no existe.
- Las horas de pedidos sin mesa van en 12 horas en la comanda, la tarjeta,
  «Impresiones pendientes», el aviso de cierre de turno y la hora de cierre de
  «Entregados hoy».
- Un nombre largo se parte en varias líneas, nunca se recorta con puntos
  suspensivos; en el aviso de cierre de turno el monto queda en la primera
  línea.
- La confirmación de envío de una mesa no cambia («Pedido de Mesa 4
  enviado»).

### Comanda

- La línea del pedido sin mesa («Para llevar: Rosa») va en negrita, como los
  productos: es lo que se busca con la bolsa en la mano. «Mesa: 4» no cambia.
- No hay línea aparte «Cliente: …»; el nombre está en la línea del pedido. La
  comanda sigue sin teléfono, dirección ni precios.
- El encabezado lleva la fecha y hora de envío de la ronda; la línea del
  pedido sin nombre conserva la hora de apertura en todas las rondas, para
  seguir reconociendo el mismo pedido.
- Cada comanda guarda en su snapshot la etiqueta vigente al enviarse la ronda
  (`kitchenTicketOrderLabel`); la reimpresión arma la etiqueta con el nombre
  actual. Un snapshot que trae `customerName` se sigue imprimiendo con
  «Cliente: …» para no romper trabajos ya encolados.
- Cocina solo ve el nombre en el papel: no hay pantalla de cocina.

### Liberar y rechazos sin «mesa»

- El botón para descartar un pedido sin productos se nombra por lo que libera:
  **Liberar mesa**, **Liberar pedido** (Para llevar) o **Liberar delivery**.
  Su efecto es el mismo en los tres. Razón: el problema era el texto, no la
  acción. La acción final de Para llevar cobrado sigue siendo **Entregado ·
  cerrar pedido**.
- En la toma de pedido sin mesa el botón de volver dice «Mesas» (nombre de la
  pantalla) y la sección se anuncia como «Pedido».
- Los rechazos de liberar, guardar el borrador, enviar y cobrar llevan un
  `type` estable. Las mesas muestran el texto del servidor; los pedidos sin
  mesa lo traducen por `type` (`src/table/use-cases/describe-session-failure.ts`).
  Los botones de recuperación se eligen por `type`, también en mesas:

| `type` | Texto en pedido sin mesa | Recuperación |
| --- | --- | --- |
| `SessionChanged` | «El pedido cambió en otro dispositivo. Tus cambios siguen aquí; revisa el pedido antes de continuar.» | **Ver pedido guardado** |
| `RoundConflict` | «Otro envío cambió el pedido. Actualiza el pedido y vuelve a intentarlo.» | **Ver pedido guardado** |
| `SessionClosed` | «Este pedido ya se cerró.» | **Volver a Mesas** |
| `SessionUnavailable` | «Este pedido ya no está disponible.» | **Volver a Mesas** |
| `SessionInvalid` | «El pedido no es válido. Vuelve a Mesas y ábrelo de nuevo.» | **Volver a Mesas** |
| `OrderLocked` | «Este pedido ya no admite cambios.» | **Volver a Mesas** e **Ir al cobro** |
| `SessionHasProducts` | «El pedido tiene productos y no se puede liberar.» | Ninguna: revisar el pedido |

- Guardar el borrador y enviar distinguen pedido cerrado (`SessionClosed`) de
  inexistente (`SessionUnavailable`). Al guardar, una revisión vieja gana
  sobre el estado de la orden (`SessionChanged` antes que `OrderLocked`),
  porque lo que el usuario ve no es el pedido real; al enviar se verifica
  primero el estado.
- El cobro sin cuenta responde `SessionUnavailable`. Las páginas de pedido y
  cobro sin mesa usan los mismos textos con **Volver a Mesas**.
- Los rechazos que ya no dicen «mesa» (productos bloqueados tras despachar,
  cocina o responsable inactivos, guardado sin respuesta) no llevan `type` y
  conservan su texto.

### Quién ve y hace qué

| Rol | Puede |
| --- | --- |
| ADMIN, CASHIER, WAITER, SELLER (`tables:update`) | Abrir Para llevar con nombre, editarlo y liberar pedidos vacíos. SELLER no entra al cobro de pedidos sin mesa |
| KITCHEN, BARTENDER | Ver el nombre en la comanda impresa |

El nombre no es un dato sensible (circula impreso por cocina), pero los
registros nunca incluyen nombre, teléfono ni dirección.

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
   (`tables:update`), que tienen ADMIN, CASHIER, WAITER y SELLER.
