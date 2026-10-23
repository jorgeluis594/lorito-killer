# Nombre de cliente y liberar en pedidos sin mesa: diseño técnico

**Estado:** diseño cerrado, pendiente de implementación. Basado en `docs/drafts/nombre-cliente-sin-mesa.md`. Base: rama `jorgeluis594/nombre-cliente-sin-mesa`, commit `30ddc43f`. La memoria del repositorio no está inicializada; el contexto sale de `AGENTS.md`, `docs/design/delivery-en-mesas.md`, `docs/impresoras.md` y del código.

## 1. Objetivo técnico

Un pedido Para llevar guarda un nombre del cliente opcional, recibido al abrirlo en una hoja y editable mientras esté abierto. Una sola función pura arma la etiqueta de cada pedido sin mesa (nombre, o la hora de apertura en 12 horas de Lima, o el teléfono del delivery donde se puede mostrar) y todas las superficies la leen: tarjeta, toma de pedido, cobro, confirmación de envío, comanda y su reimpresión, «Impresiones pendientes», aviso de cierre de turno y «Entregados hoy». Abrir un Para llevar es idempotente por intento de hoja. Los rechazos de toma de pedido, liberar, envío y cobro llevan un `type` estable y una segunda función pura traduce cada `type` a un texto sin «mesa» cuando el pedido no tiene mesa; las mesas conservan sus textos.

```text
Hoja «Nuevo pedido para llevar» ──openTakeAway({ sessionId: clave del intento, customerName })──▶ actions.ts
   │                                                                     │ protectedAction tables:update + feature restaurants
   │                                                                     ▼
   │                                       openServiceSession: crea TableSession(id = clave, customerName) + Order TAKE_AWAY
   │                                       (P2002 en la clave ⇒ devuelve la sesión ya creada)
   ▼
Toma de pedido ──saveTakeAwayCustomerName({ sessionId, customerName, expectedName })──▶ FOR UPDATE TableSession ⇒ decideCustomerNameSave
   │
   └─sendTableDraft──▶ submitOrderRound ─▶ snapshot de comanda: orderLabel = describeServiceOrder(...).ticketLabel
                                           reimpresión: kitchenTicketPrintStrategy.buildSnapshot relee nombre actual

describeServiceOrder(identity) ◀── tarjeta, página del pedido, cobro, «Impresiones pendientes», aviso de cierre, «Entregados hoy»
noTableFailureMessage(type)    ◀── TableOrderView, useTableDraft, páginas de pedido y cobro sin mesa
```

## 2. Decisiones

| Tema | Decisión |
| --- | --- |
| Dónde vive el nombre de Para llevar | Columna nullable `TableSession.customerName` (pendiente de la pregunta 1). Delivery sigue usando `Delivery.name`; la función de etiqueta elige la fuente por canal. |
| Por qué no en `Order` | `Order.updatedAt` es la versión del cobro (`orderVersion` en `src/table/payment-repository.ts`); renombrar un pedido haría rechazar un cobro en curso con «La cuenta cambió en otro dispositivo». `TableSession.updatedAt` no se usa como versión en ningún flujo. La fila de `TableSession` sí la escriben flujos `Serializable` (borrador, envío, cobro): el renombre puede provocarles un conflicto de serialización, que se absorbe con reintento acotado (§11). |
| Conflicto de serialización con el renombre | `updateTableDraft` gana el reintento acotado en P2034 que ya tienen `submitOrderRound`, `payTable` y `transitionDelivery` (hasta 2 reintentos); la nueva transacción relee y asigna el `type` real. Un renombre nunca produce «El pedido cambió en otro dispositivo» en un guardado, envío, cobro o liberación, y viceversa. |
| Migración | `20261023120000_take_away_customer_name`: solo `ALTER TABLE "TableSession" ADD COLUMN "customerName" TEXT;`, como el resto de `prisma/migrations` (ninguna fija `lock_timeout`). Aditiva, sin valor por defecto ni backfill: no reescribe filas. Sin `lock_timeout`: con `prisma migrate deploy` (`scripts/migrate.sh`) una migración que vence el timeout queda registrada como fallida y todo despliegue posterior se detiene con P3009 hasta un `migrate resolve` manual en producción, que es peor que la espera que evita. La espera está acotada: el `ACCESS EXCLUSIVE` aguarda a la transacción más larga abierta sobre `TableSession` (la más larga es `payTable`, con `timeout` de 15 s), así que en el peor caso Mesas se demora unos segundos. Esa cota no cubre una conexión ajena a la aplicación (`psql`, BI) que quede `idle in transaction` sobre `TableSession`: antes de desplegar se revisa `pg_stat_activity` (§7). Se despliega fuera de servicio y el PR lo dice. Los Para llevar abiertos antes quedan con `null`. |
| Lectura de la hoja al cerrarla | El producto dice «Al cerrarla, Mesas se actualiza». El diseño refresca solo tras un intento sin respuesta: cancelar sin enviar no creó nada, un éxito ya revalida desde la acción y los demás dispositivos se actualizan por realtime, así que lo que se ve es lo mismo con menos viajes al servidor. Es una lectura deliberada del producto, no una regresión. |
| Invariante de la columna | `customerName` solo tiene valor en sesiones sin mesa cuya orden es `TAKE_AWAY`. Lo garantizan los dos únicos escritores: `openServiceSession` con `delivery: null` y `updateTakeAwayCustomerName` tras verificar el canal. Mesas y Delivery nunca la escriben. |
| Hora de la etiqueta | `TableSession.openedAt`, formateada con un `Intl.DateTimeFormat("es-PE", { timeStyle: "short", timeZone: "America/Lima" })` creado una vez como constante de módulo («9:40 p. m.»), el mismo formato que el encabezado de la comanda. Una sola función `formatLimaTime`. |
| Fuente única de la etiqueta | `describeServiceOrder(identity)` en `src/delivery/use-cases/describe-service-order.ts` devuelve todos los textos por superficie; ninguna superficie arma su etiqueta por su cuenta. |
| Apertura idempotente | La hoja genera un UUID al abrirse y lo envía como `sessionId`; el repositorio crea la `TableSession` con ese `id`. Un reintento con la misma clave choca con la clave primaria de `TableSession` (P2002 con destino `TableSession_pkey`/`id`; cualquier otro P2002 es falla técnica) y devuelve la sesión existente de la misma empresa. Sin tabla de huellas ni columna nueva. |
| Reintento con otro nombre | Si el reintento trae un nombre distinto, se abre el pedido ya creado con el nombre del primer intento; se corrige con el lápiz. No se reescribe en la apertura. |
| Reintento de un pedido ya cerrado | Si la sesión del primer intento ya fue liberada o cerrada por otro dispositivo, la apertura devuelve igual su `sessionId` (con `closed: true` en el log) y la página del pedido muestra «Este pedido ya se cerró.». |
| Conflicto al guardar el nombre | Solo por nombre: la hoja envía `expectedName`. Bajo `FOR UPDATE` de la sesión: nombre nuevo igual al guardado ⇒ éxito sin escribir; guardado distinto de `expectedName` ⇒ rechazo `CustomerNameConflict` que devuelve `currentName` tipado; si no, se escribe. La hoja adopta `currentName` como su nuevo `expectedName`, así que **Guardar nombre** otra vez guarda lo escrito. Rondas, cobro o entrega no cuentan como conflicto. |
| Comanda | El snapshot conserva `orderType` y `orderLabel`; para pedidos sin mesa `orderLabel` es el nombre o «pedido de las 9:40 p. m.». Los snapshots nuevos ya no llevan `customerName`; el renderizador sigue leyendo un `customerName` opcional heredado solo para imprimir «Cliente: …» en snapshots creados antes del despliegue. La línea del pedido va en negrita solo en pedidos sin mesa; «Mesa: 4» no cambia. |
| Reimpresión | `kitchenTicketPrintStrategy.buildSnapshot` arma la etiqueta con el nombre actual y la hora de apertura; la comanda ya impresa conserva su snapshot. |
| Mensajes sin «mesa» | Los repositorios conservan sus textos de mesa y agregan `type` (`SessionChanged`, `SessionClosed`, `OrderLocked`, `SessionHasProducts`, `SessionInvalid`, `SessionUnavailable`, `RoundConflict`) en cada sitio de rechazo de la tabla de §5.6. El cliente, que siempre conoce el canal, muestra `noTableFailureMessage(type)` en pedidos sin mesa. `updateTableDraft` y `submitOrderRound` distinguen pedido cerrado (`SessionClosed`) de inexistente (`SessionUnavailable`). |
| Botones de recuperación | Por `type`, no por texto (§5.6): `SessionChanged` y `RoundConflict` ⇒ **Ver pedido guardado**; `SessionClosed`, `SessionUnavailable`, `SessionInvalid` ⇒ **Volver a Mesas**; `OrderLocked` ⇒ **Volver a Mesas** e **Ir al cobro**. Aplica también a mesas (solo cambian los botones, no los textos). |
| Liberar | `releaseLabel(channel)`: «Liberar mesa», «Liberar pedido», «Liberar delivery». La operación `release` de `updateTableDraft` no cambia. |
| Permisos | `tables:update` para abrir y renombrar, como `openDelivery`. Feature `restaurants`. Sin permisos nuevos. |
| Delivery | Solo cambia la etiqueta del campo («Nombre del cliente»), su ayuda y `autoComplete="off"`. Su apertura no se vuelve idempotente en esta versión (no lo pide el producto; un delivery vacío se quita con **Liberar delivery**). |
| Snapshots ya creados | Un trabajo de impresión pendiente creado antes del despliegue imprime con su snapshot viejo: código de 8 caracteres y, en Delivery, «Cliente: Ana» gracias a la lectura heredada. **Reimprimir** sale con la etiqueta nueva. |
| Alcance | Dos tareas en secuencia (sección 16): comparten `table-order-view.tsx`, `rounds/db_repository.ts` y `payment-repository.ts`, así que no hay partición sin archivos compartidos. Sin feature flag: el cambio es de texto y un dato opcional. |

## 3. Estado actual verificado

| Pieza | Ubicación | Estado |
| --- | --- | --- |
| `TableSession` sin mesa (`tableId` null) + `Order.orderType` `TAKE_AWAY`/`DELIVERY` | `prisma/schema.prisma` (modelos `Order`, `TableSession` ~725) | Existe. `TableSession.openedAt` default `now()`. Sin nombre para Para llevar. |
| `Delivery.name` (nullable), `phone`, `address` | `prisma/schema.prisma` modelo `Delivery` | Existe; se reusa como nombre del delivery. |
| `openServiceSession` | `src/delivery/db_repository.ts:31` | Crea sesión + orden sin clave del cliente: no idempotente. |
| `openDelivery` (con `null` abre Para llevar) | `src/delivery/actions.ts:31` | Existe; `tables:update` + `restaurants`; `notify` revalida y emite `tables/table-session-changed`. |
| `editDeliveryDetails` / `updateDeliveryDetails` | `src/delivery/actions.ts:82`, `src/delivery/db_repository.ts:221` | Conflicto por `Order.updatedAt`; no cambia. |
| `NewServiceButtons` | `src/delivery/components/delivery-section.tsx:259` | **Para llevar** crea directamente con `openDelivery(null)`. |
| Tarjeta de pedido sin mesa | `src/delivery/components/delivery-section.tsx:154-163` | Título «Para llevar» y hora en 24 h (`hourCycle: "h23"`). |
| `DeliverySheet` | `src/delivery/components/delivery-sheet.tsx` | Campo «Nombre» con `autoComplete="name"`, `maxLength` 120. |
| Página del pedido sin mesa | `src/app/[subdomain]/dashboard/tables/delivery/[sessionId]/order/page.tsx` | Título «Para llevar» o «Delivery · nombre/teléfono»; «No encontramos este pedido.» / «Volver a mesas». |
| `TableOrderView` | `src/table/components/table-order-view.tsx` | Toast `Pedido de ${title} enviado`; botón «Liberar mesa» (~862); `aria-label="Pedido de la mesa"`; **Ver pedido guardado** por `draft.error.includes("otro dispositivo")`. |
| `useTableDraft` | `src/table/components/use-table-draft.ts` | Muestra `result.message` del servidor. |
| `leaveEmptyTable` | `src/table/actions.ts:134` | «La mesa no es válida.» en entrada inválida. |
| `updateTableDraft` | `src/table/draft-repository.ts:55` | `Serializable`. Sesión no encontrada o revisión distinta ⇒ mismo texto «La mesa cambió…»; no distingue pedido cerrado. P2034 se responde directo como «cambió» sin reintento (`:203-205`). Textos de mesa en `:101`, `:136`. |
| `submitOrderRound` y snapshot de comanda | `src/order/rounds/db_repository.ts:330`, `:513-521` | `Serializable` con 2 reintentos en P2034. `orderLabel` = `order.id.slice(0, 8)` sin mesa; `customerName: order.delivery?.name`. Rechazos en `:361`, `:414`, `:416`, `:422`, `:490`, `:503`, `:554`, `:581`. |
| Reimpresión | `src/kitchen/print-strategy.ts:8-81` | Misma etiqueta con código interno. |
| Renderizado de comanda | `src/printing/create-kitchen-ticket-content.tsx` | Línea `${tipo}: ${orderLabel}` sin negrita y línea «Cliente:». |
| «Impresiones pendientes» | `src/kitchen/db_repository.ts:100-110`, `src/kitchen/components/kitchen-attention-panel.tsx:194` | Etiqueta «Para llevar» o «Delivery · nombre». |
| Cobro | `src/table/payment-repository.ts:106` (`sessionTitle`), `:142`, `:232`; `src/app/[subdomain]/dashboard/tables/delivery/[sessionId]/payment/page.tsx`; `src/table/components/table-payment-view.tsx` | Título «Para llevar»; textos «Esta mesa no tiene una cuenta disponible.», «No se encontró la cuenta de esta mesa.». La vista ya distingue `kind` en sus textos propios. |
| Aviso de pedidos sin cobrar | `src/delivery/db_repository.ts:168`, `src/delivery/use-cases/describe-unpaid-fulfillment-order.ts`, `src/cash-shift/components/close-cash-shift-form.tsx:196-216` | Delivery sin nombre sale como «Para llevar»; enlace con `truncate`. |
| «Entregados hoy» | `src/delivery/db_repository.ts:314` (`listDeliveredToday`), `src/app/[subdomain]/dashboard/tables/delivery/page.tsx` | Título «Para llevar» o nombre/teléfono; hora 24 h en columna `w-12`. |
| Mapeo de sesión | `src/table/db_repository.ts:115-180`, `src/table/types.ts:66` | `TableSession` de dominio sin `customerName`. |
| `ErrorResponse["type"]` | `src/lib/types.ts` | Unión cerrada; se extiende. |
| Permisos `tables:update` | `src/authorization/permissions.ts` | ADMIN, CASHIER, WAITER, SELLER. KITCHEN y BARTENDER solo `read`. |
| Pruebas existentes | `src/delivery/__TEST__/*`, `src/printing/__TEST__/create-kitchen-ticket-content.test.ts`, `src/table/__TEST__/draft-repository.test.ts`, `src/table/__TEST__/table-order-categories.test.tsx`, `tests/integration/delivery-in-tables.test.ts`, `cash-shift-unpaid-warning.test.ts`, `send-order-round.test.ts`, `kitchen-print-job-coordination.test.ts` | Algunas afirman los textos y etiquetas actuales y se actualizan. |

## 4. Brechas que cierra este diseño

1. No hay dónde guardar el nombre de un Para llevar (§7).
2. Abrir un Para llevar no es idempotente por intento (§5.1, §11).
3. No hay acción para editar el nombre con conflicto solo por nombre (§5.2, §11).
4. Cada superficie arma su etiqueta por su cuenta, con hora en 24 h y el código interno en la comanda (§5.3, §6).
5. La comanda imprime «Cliente:» aparte y el código del pedido (§9).
6. Los rechazos de pedidos sin mesa dicen «mesa» y no distinguen «pedido cerrado» de «pedido cambiado» ni de «pedido inexistente» (§5.4, §5.6, §8).
7. El botón de descartar dice «Liberar mesa» en todos los canales (§10).
8. `updateTableDraft` no reintenta en P2034: cualquier escritura concurrente de la sesión, también un renombre, produce un falso «cambió en otro dispositivo» (§11).
9. Los botones de recuperación se deciden por texto y faltan **Ver pedido guardado** en `RoundConflict` e **Ir al cobro** en `OrderLocked` (§5.6, §10).

## 5. Casos de uso

Forma: abrir y renombrar siguen la convención local de `editDeliveryDetails` + `updateDeliveryDetails` + `planDeliveryEdit`: acción (borde) + función de repositorio que hace la transacción y aplica reglas puras de `use-cases/` bajo el lock. No se crea una función de caso de uso con dependencias inyectadas: la única decisión con estado (`decideCustomerNameSave`) debe correr dentro de la transacción con lock, y las reglas puras ya quedan probadas sin base de datos.

### 5.1 `openTakeAway` (nuevo)

- Feature: `delivery`. Regla pura: `normalizeCustomerName` en `src/delivery/use-cases/normalize-customer-name.ts`. Persistencia: `openServiceSession` en `src/delivery/db_repository.ts`.
- Input: `{ sessionId: string /* UUID del intento */, customerName: string | null }`.
- Contexto de confianza: `companyId`, `userId` desde la sesión.
- Dependencias: `openServiceSession(input) => Promise<response<{ sessionId: string; replayed: boolean; closed: boolean }>>`.
- Salida: `{ sessionId }`.
- Fallas: `requireFeature` y `protectedAction` tal cual; nombre de más de 120 ⇒ `{ success: false, message: "El nombre puede tener hasta 120 caracteres.", errors: { customerName } }`; técnica ⇒ «No se pudo crear el pedido. Vuelve a intentarlo.».
- Flujo:
  1. La acción valida con `OpenTakeAwaySchema`.
  2. `normalizeCustomerName(customerName)` recorta y devuelve `null` si queda vacío; rechaza más de 120.
  3. `openServiceSession({ companyId, userId, sessionId, customerName, delivery: null })` crea `TableSession { id: sessionId, customerName }` y `Order TAKE_AWAY` en una transacción.
  4. Si la creación falla con P2002, el repositorio verifica el destino: solo cuando `meta.modelName === "TableSession"` y `meta.target` es la clave primaria (`["id"]` o `TableSession_pkey`, según cómo lo reporte la versión de Prisma; se fija con una prueba) lee, fuera de la transacción abortada, `tableSession.findFirst({ where: { id: sessionId, companyId, tableId: null }, select: { current, order: { select: { orderType } } } })`. Si existe y su orden es `TAKE_AWAY`, devuelve `{ sessionId, replayed: true, closed: current === null }`. Cualquier otro P2002 (orden, delivery) o una clave de otra empresa es falla técnica.
  5. Tras commit (o réplica): `notify(companyId)` solo si se creó; log `take_away_opened` con `replayed` y `closed`.

### 5.2 `saveTakeAwayCustomerName` (nuevo)

- Feature: `delivery`. Regla pura: `decideCustomerNameSave` en `src/delivery/use-cases/decide-customer-name-save.ts`. Persistencia: `updateTakeAwayCustomerName` en `src/delivery/db_repository.ts`.
- Input: `{ sessionId: string; customerName: string | null; expectedName: string | null }`.
- Contexto: `companyId`, `userId`.
- Dependencias: `updateTakeAwayCustomerName(companyId, input) => Promise<SaveCustomerNameResult>` (§6): `response<{ sessionId; customerName; changed }>` más la variante de conflicto con `currentName`.
- Fallas (todas con `type` salvo la de límite y la técnica):

| Situación | `type` | Mensaje | Dato tipado |
| --- | --- | --- | --- |
| Otro dispositivo cambió el nombre | `CustomerNameConflict` | «Otro dispositivo cambió el nombre a {actual}. Revisa y vuelve a guardar.» | `currentName: "Rosita"` |
| Otro dispositivo quitó el nombre | `CustomerNameConflict` | «Otro dispositivo quitó el nombre. Revisa y vuelve a guardar.» | `currentName: null` |
| Más de 120 caracteres | — (con `errors.customerName`) | «El nombre puede tener hasta 120 caracteres.» | — |
| Sesión cerrada (`current` null) | `SessionClosed` | «Este pedido ya se cerró.» | — |
| La transacción vence esperando el lock (P2028, más de 20 s detrás de otro flujo) | — | «No se pudo guardar el nombre. Vuelve a intentarlo.» | — |
| No existe, otra empresa, mesa o delivery | `SessionUnavailable` | «Este pedido ya no está disponible.» | — |

- Flujo:
  1. La acción valida con `SaveTakeAwayCustomerNameSchema` y normaliza `customerName` y `expectedName` con `normalizeCustomerName`.
  2. Transacción interactiva `ReadCommitted` con `timeout: 20000` (por encima de los 15 s de `payTable`, que puede tener la fila con `FOR UPDATE`): `SELECT id FROM "TableSession" WHERE id = $1 AND "companyId" = $2 FOR UPDATE`; relee la sesión con su orden.
  3. Sin fila, con `tableId`, o con orden distinta de `TAKE_AWAY` ⇒ `SessionUnavailable`. `current` null ⇒ `SessionClosed`.
  4. `decideCustomerNameSave({ current, expected, next })`: `"unchanged"` ⇒ éxito sin escribir; `{ conflict: current }` ⇒ rechazo `CustomerNameConflict` con `currentName: current`; `"save"` ⇒ `tableSession.update({ data: { customerName: next } })`.
  5. Tras commit y solo si `changed`: `notify(companyId)`.
  6. En la hoja: ante `CustomerNameConflict`, el estado `expectedName` pasa a `currentName` y el texto escrito queda intacto; el segundo **Guardar nombre** compara contra el nombre vigente y guarda lo escrito (salvo que otro dispositivo lo cambie otra vez).

### 5.3 `describeServiceOrder` (nuevo, puro)

- `src/delivery/use-cases/describe-service-order.ts`. Recibe la identidad del pedido sin mesa y devuelve los textos de todas las superficies (§6). Sin I/O; la hora se formatea con `formatLimaTime`.
- `toServiceOrderIdentity({ orderType, sessionCustomerName, delivery, openedAt })` en el mismo archivo arma la identidad desde lo que cargan los repositorios; devuelve `null` para mesas y ventas.

### 5.4 `noTableFailureMessage` y `releaseLabel` (nuevos, puros)

- `src/table/use-cases/describe-session-failure.ts`.
- `noTableFailureMessage(type: SessionFailureType): string` con los textos del producto. `sessionFailureMessage(result, channel)` devuelve `result.message` para `TABLE` o sin `type`, y `noTableFailureMessage(result.type)` en otro caso.
- `releaseLabel(channel)` y `serviceChannel(session)` (`session.tableId ? "TABLE" : session.delivery ? "DELIVERY" : "TAKE_AWAY"`).

### 5.5 Casos existentes que cambian

| Caso | Cambio |
| --- | --- |
| `openDelivery` | Solo abre delivery: una entrada `null` deja de abrir Para llevar y pasa por `validateDeliveryDetails`, que la rechaza como datos de entrega incompletos. |
| `openServiceSession` | Recibe `sessionId?` y `customerName?`; con `sessionId` aplica la recuperación por P2002. |
| `updateTableDraft` | Agrega `type` a cada rechazo (§5.6). Cuando la búsqueda con `current: true` no encuentra la sesión, relee por `id` y `companyId`: cerrada ⇒ `SessionClosed`; inexistente ⇒ `SessionUnavailable`; revisión distinta ⇒ `SessionChanged`. En P2034 reintenta la transacción completa hasta 2 veces (`attempt` como `submitOrderRound`); agotados los reintentos ⇒ `SessionChanged`. Los textos de mesa no cambian. |
| `submitOrderRound` | Rechazos con `type` según §5.6: lanza `RoundRejected(type, message)` dentro de `persist` en lugar de `Error` genérico y el `catch` lo convierte en `{ success: false, type, message }`. La sesión no encontrada relee por `id` + `companyId` como `updateTableDraft` (cerrada ⇒ `SessionClosed`). Snapshot con `orderLabel` de `kitchenTicketOrderLabel`, sin `customerName`. |
| `getTablePaymentData` / `payTable` | `sessionTitle` usa `describeServiceOrder(...).heading` sin mesa. «Esta mesa no tiene una cuenta disponible.» (`getTablePaymentData`, que retorna, no lanza) lleva `type: "SessionUnavailable"` en su retorno. En `payTable`, `reject()` lanza hoy un `Error` genérico y el `catch` solo conserva `message`; se agrega `PaymentRejected(message, type?)` (mismo patrón que `RoundRejected`): `reject()` acepta un `type` opcional, «No se encontró la cuenta de esta mesa.» lo lanza con `SessionUnavailable`, y el `catch` devuelve `{ success: false, message, type }` cuando el error es `PaymentRejected`, antes de la lógica de reintento transitorio. Los demás `reject()` siguen sin `type`. |
| `kitchenTicketPrintStrategy.buildSnapshot` | `orderLabel` con el nombre actual y la hora de apertura. |
| `findKitchenTickets` | `order.label` sin mesa = `describeServiceOrder(...).printLabel`. |
| `listUnpaidFulfillmentOrders` / `describeUnpaidFulfillmentOrder` | `customerLabel` pasa a `orderLabel` = `summaryLabel`. |
| `listDeliveredToday` | `title` = `summaryLabel`. |

### 5.6 Rechazos de la toma de pedido, el envío y el cobro

Cada sitio que hoy rechaza en un pedido sin mesa, con su `type`, el texto sin «mesa» y la acción de recuperación. Los sitios sin `type` ya tienen un texto sin «mesa» y no cambian. Los números de línea son de la base `30ddc43f` y se moverán cuando T1 edite el mismo archivo: T2 ubica cada sitio por su condición (columna «Situación» y el texto actual), no por la línea.

| Sitio | Situación | `type` | Texto sin mesa | Recuperación |
| --- | --- | --- | --- | --- |
| `leaveEmptyTable` entrada inválida (`src/table/actions.ts:141`) | Dato inválido al liberar | `SessionInvalid` | «El pedido no es válido. Vuelve a Mesas y ábrelo de nuevo.» | **Volver a Mesas** |
| `updateTableDraft` sesión `current` no encontrada, relectura cerrada | Liberar, guardar o enviar (lectura previa de `sendTableDraft`) un pedido cerrado | `SessionClosed` | «Este pedido ya se cerró.» | **Volver a Mesas** |
| `updateTableDraft` sesión inexistente u otra empresa | Ya no está | `SessionUnavailable` | «Este pedido ya no está disponible.» | **Volver a Mesas** |
| `updateTableDraft` revisión distinta, `updateMany.count !== 1`, P2034 agotado | Otro dispositivo cambió el borrador | `SessionChanged` | «El pedido cambió en otro dispositivo. Tus cambios siguen aquí; revisa el pedido antes de continuar.» | **Ver pedido guardado** |
| `updateTableDraft` sesión no `OPEN`, orden no `PENDING`, con pagos o comprobante (`:101`) | Cobrado o con comprobante | `OrderLocked` | «Este pedido ya no admite cambios.» | **Volver a Mesas** e **Ir al cobro** |
| `updateTableDraft` liberar con productos (`:136`) | Liberar con productos | `SessionHasProducts` | «El pedido tiene productos y no se puede liberar.» | Ninguna (revisar el pedido) |
| `updateTableDraft` producto no disponible | — | sin `type` | Texto actual | — |
| `submitOrderRound` sesión no encontrada (`:361`), relectura cerrada | Enviar a un pedido cerrado | `SessionClosed` | «Este pedido ya se cerró.» | **Volver a Mesas** |
| `submitOrderRound` sesión inexistente o mesa inactiva (`:361`) | Ya no está | `SessionUnavailable` | «Este pedido ya no está disponible.» | **Volver a Mesas** |
| `submitOrderRound` estado no admite cambios (`:414`) | Cobrado o con comprobante | `OrderLocked` | «Este pedido ya no admite cambios.» | **Volver a Mesas** e **Ir al cobro** |
| `submitOrderRound` delivery despachado (`:416`, `PRODUCTS_LOCKED_MESSAGE`) | Productos bloqueados | sin `type` | Texto actual (no dice «mesa») | — |
| `submitOrderRound` revisión de borrador distinta (`:422`) y borrador no limpiado (`:554`) | Otro dispositivo cambió el borrador | `SessionChanged` | «El pedido cambió en otro dispositivo. Tus cambios siguen aquí; revisa el pedido antes de continuar.» | **Ver pedido guardado** |
| `submitOrderRound` P2002 o P2034 agotado (`:581`) | Otro envío simultáneo | `RoundConflict` | «Otro envío cambió el pedido. Actualiza el pedido y vuelve a intentarlo.» | **Ver pedido guardado** |
| `submitOrderRound` cocina inactiva (`:490`), responsable inactivo (`:503`), `sendRound` «Revisa los productos y cantidades.» | — | sin `type` | Texto actual | — |
| `getTablePaymentData` sin sesión (`payment-repository.ts:142`) | Cobro sin cuenta | `SessionUnavailable` | «Este pedido ya no está disponible.» | **Volver a Mesas** |
| `payTable` sin sesión (`:232`) | Cuenta no encontrada al cobrar | `SessionUnavailable` | «Este pedido ya no está disponible.» | **Volver a Mesas** |
| Página del pedido sin mesa: sesión sin mesa cerrada / no encontrada, de otra empresa o de mesa | Al abrir la toma de pedido | — (página) | «Este pedido ya se cerró.» / «Este pedido ya no está disponible.» | **Volver a Mesas** |
| `useTableDraft` sin respuesta | Guardar sin respuesta | sin `type` | Texto actual | **Reintentar guardado** |

Precedencia: `updateTableDraft` compara primero sesión vigente y revisión, y después el estado de la orden. Desde una pantalla vieja, un pedido ya cobrado responde `SessionChanged`; al tocar **Ver pedido guardado** la revisión queda al día y el siguiente intento responde `OrderLocked`. Ese orden se mantiene: la revisión vieja significa que lo que el usuario ve no es el pedido real, y eso se resuelve primero. `submitOrderRound` verifica el estado (`:414`) antes que la revisión (`:422`), así que al enviar gana `OrderLocked`.

**Ir al cobro** reusa `openPayment` de `TableOrderView` (el mismo destino que **Cobrar cuenta**); la página de cobro sigue aplicando su control de rol, así que un vendedor que lo toque ve el rechazo actual de rol.

## 6. Dominio y tipos

```ts
// src/delivery/use-cases/describe-service-order.ts
/** Pedido sin mesa tal como se nombra. Delivery lleva teléfono porque es su respaldo visible. */
export type ServiceOrderIdentity =
  | { channel: "TAKE_AWAY"; customerName: string | null; openedAt: Date }
  | { channel: "DELIVERY"; customerName: string | null; phone: string; openedAt: Date };

export type ServiceOrderLabels = Readonly<{
  cardTitle: string;            // «Rosa» | «Para llevar» | «Ana» | «987 654 321»
  cardSubtitle: string | null;  // «Para llevar · desde las 9:40 p. m.» | «Desde las 9:40 p. m.» | «987 654 321» | null
  heading: string;              // «Para llevar · Rosa» | «Para llevar» | «Delivery · Ana» | «Delivery · 987 654 321»
  sentTitle: string;            // «Pedido de Rosa enviado» | «Pedido para llevar enviado» | «Pedido de Ana enviado» | «Pedido de delivery enviado»
  ticketLabel: string;          // «Rosa» | «pedido de las 9:40 p. m.» (nunca teléfono)
  printLabel: string;           // «Para llevar · Rosa» | «Delivery · pedido de las 8:15 p. m.» (el diálogo agrega «· Cocina»)
  summaryLabel: string;         // aviso de cierre y «Entregados hoy»: «Para llevar · pedido de las 9:40 p. m.» | «Delivery · 987 654 321»
}>;

export function describeServiceOrder(identity: ServiceOrderIdentity): ServiceOrderLabels;
// El Intl.DateTimeFormat es una constante de módulo: se llama por tarjeta en cada render y en el worker.
export function formatLimaTime(date: Date): string; // «9:40 p. m.»
```

- `ServiceOrderIdentity`: no existe un tipo que reúna canal, nombre, teléfono y apertura; la unión evita un teléfono nullable en Para llevar. Un nombre de solo espacios se trata como `null` dentro de la función (defensa para datos viejos de `Delivery.name`).
- `ServiceOrderLabels`: un campo por superficie del producto; cada superficie lee el suyo y ninguna concatena textos propios salvo el sufijo que ya agrega («· Cocina», «· Pendiente»).

```ts
// src/delivery/use-cases/normalize-customer-name.ts
export const CUSTOMER_NAME_MAX = 120;
export function normalizeCustomerName(value: string | null | undefined): response<string | null>;

// src/delivery/use-cases/decide-customer-name-save.ts
export type CustomerNameSaveDecision =
  | { kind: "unchanged" }
  | { kind: "save" }
  | { kind: "conflict"; current: string | null };
export function decideCustomerNameSave(input: {
  current: string | null; expected: string | null; next: string | null;
}): CustomerNameSaveDecision;

// src/delivery/use-cases/truncate-pasted-name.ts — regla del pegado (no vive en el componente)
export function truncatePastedName(input: {
  value: string; selectionStart: number; selectionEnd: number; pasted: string;
}): { value: string; caret: number; truncated: boolean }; // conserva hasta CUSTOMER_NAME_MAX caracteres

// src/delivery/types.ts (nuevo) — resultado de la acción de renombre
export type SaveCustomerNameResult =
  | { success: true; data: { sessionId: string; customerName: string | null; changed: boolean } }
  | { success: false; type: "CustomerNameConflict"; message: string; currentName: string | null }
  | (ErrorResponse & { errors?: { customerName?: string } });
```

- `SaveCustomerNameResult`: `ErrorResponse` no lleva datos y la hoja necesita el nombre vigente tipado para reintentar; la variante es local a esta acción, como `errors` en `openDelivery`. No se agrega un campo genérico a `ErrorResponse`.
- `truncatePastedName`: el recorte y el aviso son una regla del producto; la hoja solo la llama en `onPaste`.

```ts
// src/lib/types.ts — se extiende la unión
type?: ... | "SessionChanged" | "SessionClosed" | "OrderLocked" | "SessionHasProducts"
      | "SessionInvalid" | "SessionUnavailable" | "RoundConflict" | "CustomerNameConflict";

// src/table/use-cases/describe-session-failure.ts
export type ServiceChannel = "TABLE" | "TAKE_AWAY" | "DELIVERY";
export type SessionFailureType = Extract<ErrorResponse["type"],
  "SessionChanged" | "SessionClosed" | "OrderLocked" | "SessionHasProducts"
  | "SessionInvalid" | "SessionUnavailable" | "RoundConflict">;
```

| `type` | Texto en pedido sin mesa |
| --- | --- |
| `SessionChanged` | «El pedido cambió en otro dispositivo. Tus cambios siguen aquí; revisa el pedido antes de continuar.» |
| `SessionClosed` | «Este pedido ya se cerró.» |
| `OrderLocked` | «Este pedido ya no admite cambios.» |
| `SessionHasProducts` | «El pedido tiene productos y no se puede liberar.» |
| `SessionInvalid` | «El pedido no es válido. Vuelve a Mesas y ábrelo de nuevo.» |
| `SessionUnavailable` | «Este pedido ya no está disponible.» |
| `RoundConflict` | «Otro envío cambió el pedido. Actualiza el pedido y vuelve a intentarlo.» |

`TableSession` de dominio (`src/table/types.ts`) agrega `customerName: string | null`. `UnpaidFulfillmentOrder.customerLabel` se renombra a `orderLabel` (es la etiqueta del pedido, no el cliente del comprobante).

Esquemas Zod en `src/delivery/schemas.ts`:

```ts
export const OpenTakeAwaySchema = z.object({
  sessionId: z.string().uuid(),
  customerName: z.string().max(500).nullable(), // regla real en normalizeCustomerName
});
export const SaveTakeAwayCustomerNameSchema = z.object({
  sessionId: z.string().uuid(),
  customerName: z.string().max(500).nullable(),
  expectedName: z.string().max(500).nullable(),
});
```

| Capa | Tipos y autoridad |
| --- | --- |
| Cliente | Clave del intento, nombre escrito, `expectedName`. No decide conflicto ni recorte final. |
| Acción | `companyId` y actor desde la sesión; Zod; normaliza. |
| Repositorio | Lock, decisión con `decideCustomerNameSave`, escritura acotada a `customerName`. |
| Superficies | Solo leen `describeServiceOrder` y `sessionFailureMessage`. |

## 7. Persistencia

```prisma
model TableSession {
  // ...
  // Rótulo del pedido Para llevar («Nombre del cliente»). Solo en sesiones sin mesa con orden TAKE_AWAY.
  // No es el cliente del comprobante; Delivery usa Delivery.name.
  customerName String?
}
```

- Migración `prisma/migrations/20261023120000_take_away_customer_name/migration.sql`: `ALTER TABLE "TableSession" ADD COLUMN "customerName" TEXT;`, sin `SET` de sesión. En PostgreSQL agregar una columna nullable sin default no reescribe filas, pero pide `ACCESS EXCLUSIVE`: espera a que terminen las transacciones abiertas sobre `TableSession` (acotadas por sus `timeout`, la mayor de 15 s en `payTable`) y mientras tanto encola las nuevas. No se usa `lock_timeout` porque su falla deja la migración marcada como fallida en `_prisma_migrations` y bloquea todo `migrate deploy` siguiente con P3009. Sin índice: no se busca por nombre. El PR la menciona como exige `AGENTS.md`, pide desplegar fuera de servicio y documenta dos pasos:
  - Antes de desplegar: comprobar que no hay transacciones largas ni sesiones `idle in transaction` que tengan locks sobre `TableSession`, por ejemplo `SELECT pid, state, xact_start, query FROM pg_stat_activity a JOIN pg_locks l USING (pid) JOIN pg_class c ON c.oid = l.relation WHERE c.relname = 'TableSession' AND a.pid <> pg_backend_pid();`. Si aparece alguna ajena a la aplicación, se cierra o se espera antes de desplegar. No se agrega `lock_timeout`.
  - Recuperación de cualquier migración fallida: el `ALTER` se revierte solo, así que basta `npx prisma migrate resolve --rolled-back 20261023120000_take_away_customer_name` contra producción y volver a desplegar.
- Invariante: `customerName` solo tiene valor en sesiones sin mesa con orden `TAKE_AWAY`. La hacen cumplir sus dos únicos escritores, `openServiceSession` (solo con `delivery: null`) y `updateTakeAwayCustomerName` (tras verificar `tableId` null y `orderType` `TAKE_AWAY` bajo el lock). Un comentario en el modelo Prisma lo dice para que ningún flujo de mesas la reuse.
- Supuesto: hay negocios operando (el feedback de salón de octubre lo indica); la migración es segura igual porque es aditiva.
- Repositorio `src/delivery/db_repository.ts`:
  - `openServiceSession({ companyId, userId, sessionId?, customerName?, delivery })`: crea con `id: sessionId` y `customerName` (solo cuando `delivery` es `null`); devuelve `{ sessionId, replayed }`.
  - `updateTakeAwayCustomerName(companyId, input)`: §5.2; escribe solo `customerName`.
  - `listUnpaidFulfillmentOrders`: selecciona `tableSession { openedAt, customerName }` y `delivery { name, phone, status }`; un pedido sin sesión (no ocurre en sin mesa, pero el campo es nullable) usa `order.createdAt` como apertura.
  - `listDeliveredToday`: incluye `customerName`, `openedAt`, `order.orderType`.
- `src/table/db_repository.ts`: el mapeo de sesión agrega `customerName`.
- `src/kitchen/db_repository.ts` y `src/kitchen/print-strategy.ts`: seleccionan `tableSession { openedAt, customerName, table }` y `delivery { name, phone }`.
- `src/order/rounds/db_repository.ts`: la sesión cargada ya trae `openedAt` y `customerName` (es la fila completa); `order.delivery` ya trae `phone`.

## 8. Bordes de aplicación

| Acción / página | Permiso | Entrada | Cambio |
| --- | --- | --- | --- |
| `openTakeAway` (nueva, `src/delivery/actions.ts`) | `tables:update` + feature `restaurants` | `OpenTakeAwaySchema` | §5.1. Revalida `/[subdomain]/dashboard/tables` (layout) y emite `table-session-changed`. |
| `saveTakeAwayCustomerName` (nueva, `src/delivery/actions.ts`) | `tables:update` + `restaurants` | `SaveTakeAwayCustomerNameSchema` | §5.2. Revalida y emite solo si cambió. |
| `openDelivery` | igual | `DeliveryDetailsSchema` | Deja de aceptar `null`. |
| `leaveEmptyTable`, `saveTableDraft`, `sendTableDraft` (`src/table/actions.ts`) | igual | igual | Entrada inválida de `leaveEmptyTable` agrega `type: "SessionInvalid"`; el resto propaga el `type` del repositorio. |
| Página del pedido sin mesa | `tables:read` | — | Título `heading`; `sentTitle` como prop; lápiz con `TakeAwaySheet` en modo edición para Para llevar con `tables:update`; sesión sin mesa cerrada ⇒ «Este pedido ya se cerró.»; no encontrada, de otra empresa o sesión de mesa (hoy cae en «ya se cerró») ⇒ «Este pedido ya no está disponible.»; botón **Volver a Mesas**. |
| Página de cobro sin mesa | `ADMIN`, `WAITER`, `CASHIER` (sin cambio) | — | Rechazo con `type` ⇒ `noTableFailureMessage`; enlace **Volver a Mesas**. |
| Página «Entregados hoy» | `tables:read` | — | Título `summaryLabel`; hora con `formatLimaTime`. |

La entrada nunca trae `companyId`, actor, `orderType` ni `openedAt`: salen de la sesión y de la base.

## 9. Jobs, realtime e integraciones

- Sin jobs nuevos. La impresión sigue por `createPrintJob` con snapshot dentro de la transacción de `submitOrderRound` (ver `docs/impresoras.md`).
- Snapshot de comanda (`KitchenTicketContentInput`): `orderLabel` = `kitchenTicketOrderLabel({ table, identity })` (`src/kitchen/use-cases/kitchen-ticket-order-label.ts`): mesa ⇒ `label || number`; sin mesa ⇒ `describeServiceOrder(identity).ticketLabel`. Los snapshots nuevos no llevan `customerName`; el tipo lo conserva como opcional marcado «solo snapshots anteriores» y el renderizador imprime «Cliente: …» únicamente cuando viene. El renderizador pone en negrita la línea del pedido cuando `orderType` es `TAKE_AWAY` o `DELIVERY`.
- Realtime: `broadcast(companyId, "tables", "table-session-changed", {})` tras abrir y tras renombrar con cambio. Notifica; Mesas recarga.

| Ventana de falla | Qué pasa | Efecto para el usuario |
| --- | --- | --- |
| Se crea el pedido y se pierde la respuesta | La sesión existe con la clave del intento | Reintentar en la misma hoja devuelve la misma sesión; cerrar la hoja refresca Mesas y muestra la tarjeta |
| Falla el broadcast tras abrir o renombrar | Se registra `delivery_notification_failed` (existente) | Otras pantallas se actualizan al recargar |
| Se renombra con una comanda pendiente de imprimir | El snapshot ya guardado conserva el nombre anterior | La comanda pendiente sale con el nombre del envío; **Reimprimir** saca el nuevo |
| Trabajo pendiente creado antes del despliegue | Snapshot viejo con código y `customerName` | Imprime el código y, en Delivery, «Cliente: Ana»; **Reimprimir** sale con la etiqueta nueva |
| Se crea el pedido pero otro dispositivo lo libera antes del reintento | La réplica devuelve el `sessionId` con `closed: true` | La página del pedido muestra «Este pedido ya se cerró.» con **Volver a Mesas** |

## 10. Interfaz

| Archivo | Cambio |
| --- | --- |
| `src/delivery/components/take-away-sheet.tsx` (nuevo) | Hoja con modo crear y editar sobre `Sheet` de `src/shared/components/ui`, inferior en móvil y centrada en escritorio como `DeliverySheet`. Clave del intento en `useRef`, regenerada en cada apertura. Campo con `autoFocus`, `autoComplete="off"`, `maxLength={120}`, `enterKeyHint="go"`; `onPaste` llama a `truncatePastedName` y, si `truncated`, muestra «Se recortó a 120 caracteres.» como ayuda con `aria-live="polite"`. Bloquea campo y cierre mientras espera. Errores del servidor en el campo; sin respuesta ⇒ texto de duda del producto y marca `uncertain`. En edición mantiene `expectedName` en estado: arranca con el nombre cargado y, ante `CustomerNameConflict`, pasa a `currentName` con lo escrito intacto; ante `SessionClosed`/`SessionUnavailable` muestra **Volver a Mesas**. Al guardar bien en edición, la hoja se cierra y muestra el toast transitorio «Nombre guardado»; el título se actualiza por el `revalidatePath` de la acción. Al cerrar, `router.refresh()` solo si `uncertain` (hubo un intento sin respuesta); cancelar sin enviar no refresca y un éxito ya revalida desde la acción. |
| `src/delivery/components/delivery-section.tsx` | `NewServiceButtons`: **Para llevar** abre `TakeAwaySheet` (sin indicador de carga). Tarjeta: `cardTitle`/`cardSubtitle`; se elimina el formateador 24 h. |
| `src/delivery/components/delivery-sheet.tsx` | Etiqueta «Nombre del cliente», `autoComplete="off"`, ayuda «Si lo dejas vacío, la tarjeta muestra el teléfono y la comanda la hora del pedido.». |
| `src/app/[subdomain]/dashboard/tables/delivery/[sessionId]/order/page.tsx` | `heading`, `sentTitle`, lápiz de edición 44 px con etiqueta «Editar nombre del cliente». |
| `src/table/components/table-order-view.tsx` | Prop `sentTitle?: string` (por defecto `Pedido de ${title} enviado`). Canal con `serviceChannel(session)`; `releaseLabel(channel)`; `aria-label` «Pedido» sin mesa; confirmación de **Ver pedido guardado** sin «de la mesa» sin mesa; errores con `sessionFailureMessage`; el banner guarda el `type` del último rechazo (de `finish` o de `draft.errorType`) y muestra los botones de §5.6: **Ver pedido guardado** (`SessionChanged`, `RoundConflict`), **Volver a Mesas** (`SessionClosed`, `SessionUnavailable`, `SessionInvalid`, `OrderLocked`) e **Ir al cobro** (`OrderLocked`, con `openPayment`). Se elimina la detección por `includes("otro dispositivo")`. |
| `src/table/components/use-table-draft.ts` | Guarda `{ message, type }` del rechazo y expone `errorType`; el mensaje visible pasa por `sessionFailureMessage`. |
| `src/table/components/table-payment-view.tsx` | Mensajes de recarga con `sessionFailureMessage` según `data.kind`. |
| `src/kitchen/components/kitchen-attention-panel.tsx` | Sin cambio: ya muestra `{order.label} · {kitchen.name}`. |
| `src/cash-shift/components/close-cash-shift-form.tsx` | `order.orderLabel`; el enlace pasa de `truncate` a `break-words`; la fila usa `items-start` para que el monto quede en la primera línea. |
| `src/app/[subdomain]/dashboard/tables/delivery/page.tsx` | `formatLimaTime(closedAt)` con `whitespace-nowrap` y columna más ancha; se elimina su formateador 24 h. |

Stories: si `delivery-sheet` tiene story, se actualiza; se agrega `take-away-sheet.stories.tsx` con estados vacío, con nombre, recortado, error y espera. Ante datos viejos, cada pantalla recarga con el broadcast existente; la hoja de edición no se recarga sola: su conflicto lo resuelve el servidor.

## 11. Transacciones y concurrencia

Apertura (`openServiceSession` con clave):
1. Transacción por defecto (`ReadCommitted`): `tableSession.create({ id: sessionId, companyId, waiterId, customerName, order: { create: TAKE_AWAY } })`, `recalculateOrderTotals`.
2. Dos solicitudes con la misma clave: la segunda falla con P2002 en la clave primaria y su transacción se revierte entera (no queda una orden huérfana). Fuera de la transacción se relee por `id` + `companyId` + `tableId: null` y se devuelve la sesión existente.
3. Una clave que choca con una sesión de otra empresa no devuelve nada de ella: falla técnica genérica.

Renombrar (`updateTakeAwayCustomerName`):
1. `ReadCommitted` con `timeout: 20000`, `SELECT … FROM "TableSession" WHERE id = $1 AND "companyId" = $2 FOR UPDATE`. El renombre puede esperar el `FOR UPDATE` de `payTable` (transacción de hasta 15 s); con los 5 s por defecto de Prisma un cobro lento lo haría fallar sin conflicto real. Con 20 s espera al cobro y continúa. Si aun así vence (P2028), responde la falla técnica «No se pudo guardar el nombre. Vuelve a intentarlo.», registra `take_away_customer_name_save_failed` con `code` y la hoja conserva lo escrito; reintentar es seguro porque guardar el mismo nombre es éxito.
2. Relee sesión y `order.orderType` bajo el lock; valida canal y `current`.
3. `decideCustomerNameSave`; escribe solo `customerName`.
4. Dos renombres simultáneos con el mismo `expectedName`: el segundo espera el lock, ve el nombre nuevo y recibe `CustomerNameConflict` con `currentName` (o éxito si eligió el mismo nombre).
5. El renombre no cambia `Order.updatedAt` ni `draftRevision`, así que no altera ninguna versión que comparen otros flujos. Pero escribe la misma fila de `TableSession` que escriben `updateTableDraft` (`updateMany` del borrador), `submitOrderRound` (limpieza del borrador) y `payTable` (`FOR UPDATE` y cierre), todos `Serializable`. Si el renombre confirma entre la lectura y la escritura de uno de ellos, PostgreSQL responde 40001 (P2034) a ese flujo. Cómo se resuelve:
   - `submitOrderRound`, `payTable` y `transitionDelivery` ya reintentan hasta 2 veces; la nueva transacción relee una fila cuyo `draftRevision` no cambió y termina bien.
   - `updateTableDraft` gana el mismo reintento acotado (hasta 2, con `attempt`); hoy responde «cambió» en el primer P2034. La transacción repetida relee y asigna el `type` real: éxito si solo cambió el nombre, `SessionChanged` si otro dispositivo cambió el borrador, `SessionClosed` si lo cerraron. Solo un P2034 que persiste tras los reintentos responde `SessionChanged`.
   - En sentido inverso, el renombre corre en `ReadCommitted` con `FOR UPDATE`: si un flujo `Serializable` tiene la fila, espera su commit y relee; nunca recibe 40001 y su único conflicto posible es el de nombre.
   - Orden de locks: el renombre toma un solo lock de fila (`TableSession`) y no pide otro mientras lo tiene, así que no puede formar parte de un ciclo de deadlock. Esto se afirma solo del renombre: entre `submitOrderRound` (`Order` y luego sesión) y `payTable` (sesión y luego `Order`) existe un orden opuesto previo a este diseño, que no cambia y queda registrado en §15.
   - «Entregado · cerrar pedido» (`closeServiceSessionAction` → `updateSessionStatus`, `src/table/db_repository.ts:688`) también escribe la fila, con un `update` simple en `ReadCommitted`: no puede producir 40001 contra el renombre; el `FOR UPDATE` del renombre los ordena.
   - Un cierre concurrente (liberar, entregar, cerrar pedido) que gane primero deja `current` null y el renombre responde `SessionClosed`.

Snapshot: `submitOrderRound` lee `customerName` dentro de su transacción `Serializable`; la comanda lleva el nombre vigente al enviarse la ronda. Un renombre concurrente no la invalida (el producto acepta cualquiera de los dos órdenes).

`updateTableDraft` y `submitOrderRound`: la relectura para distinguir `SessionClosed` de `SessionUnavailable` va dentro de la misma transacción, sin lock nuevo; solo elige el `type`.

## 12. Organización del código

| Archivo | Cambio |
| --- | --- |
| `prisma/schema.prisma`, `prisma/migrations/20261023120000_take_away_customer_name/` | Columna `TableSession.customerName`. |
| `src/delivery/use-cases/describe-service-order.ts` | Nuevo: `ServiceOrderIdentity`, `describeServiceOrder`, `toServiceOrderIdentity`, `formatLimaTime`. Capacidad expuesta a `kitchen`, `order/rounds`, `table`, `cash-shift`. |
| `src/delivery/use-cases/normalize-customer-name.ts` | Nuevo. |
| `src/delivery/use-cases/decide-customer-name-save.ts` | Nuevo. |
| `src/delivery/use-cases/truncate-pasted-name.ts` | Nuevo: regla del pegado de 120 caracteres. |
| `src/delivery/types.ts` | Nuevo: `SaveCustomerNameResult`. |
| `src/delivery/use-cases/describe-unpaid-fulfillment-order.ts` | Usa `describeServiceOrder`; devuelve `orderLabel`. |
| `src/delivery/schemas.ts`, `actions.ts`, `db_repository.ts` | Esquemas, acciones `openTakeAway` y `saveTakeAwayCustomerName`, repositorio. |
| `src/delivery/components/take-away-sheet.tsx`, `delivery-section.tsx`, `delivery-sheet.tsx` | §10. |
| `src/kitchen/use-cases/kitchen-ticket-order-label.ts` | Nuevo: etiqueta de la comanda para mesa y sin mesa. |
| `src/kitchen/print-strategy.ts`, `src/kitchen/db_repository.ts` | Etiquetas de reimpresión e «Impresiones pendientes». |
| `src/printing/create-kitchen-ticket-content.tsx` | Sin `customerName`; negrita sin mesa. |
| `src/order/rounds/db_repository.ts` | Snapshot (T1); `type` en rechazos (T2). |
| `src/table/types.ts`, `src/table/db_repository.ts` | `customerName` en la sesión. |
| `src/table/payment-repository.ts` | `sessionTitle` (T1); `type` en rechazos (T2). |
| `src/table/use-cases/describe-session-failure.ts` | Nuevo (T2). |
| `src/table/draft-repository.ts` | Reintento acotado en P2034 (T1); `type` y relectura de cerrado (T2). |
| `src/table/actions.ts`, `src/table/components/table-order-view.tsx`, `use-table-draft.ts`, `table-payment-view.tsx` | §5.5, §5.6 y §10. |
| `src/lib/types.ts` | Unión de `type`. |
| Páginas en `src/app/[subdomain]/dashboard/tables/delivery/` | §8. |
| `src/cash-shift/components/close-cash-shift-form.tsx` | §10. |

## 13. Observabilidad

| Evento | Nivel | Dónde | Campos |
| --- | --- | --- | --- |
| `take_away_opened` | info | `openTakeAway` tras commit o réplica | `["companyId", "userId", "sessionId", "hasCustomerName", "replayed", "closed"]` |
| `service_order_open_failed` | error | `openServiceSession` (reemplaza el `console.error`; abre Para llevar y Delivery) | `["companyId", "userId", "sessionId", "channel", "stage", "code", "target"]` |
| `table_draft_serialization_retried` | debug | `updateTableDraft` antes de cada reintento por P2034 | `["companyId", "sessionId", "operation", "attempt"]` |
| `take_away_customer_name_saved` | info | `saveTakeAwayCustomerName` tras commit | `["companyId", "userId", "sessionId", "outcome"]` (`saved` \| `unchanged`) |
| `take_away_customer_name_conflict` | warn | `saveTakeAwayCustomerName` | `["companyId", "userId", "sessionId", "kind"]` (`changed` \| `removed`) |
| `take_away_customer_name_save_failed` | error | repositorio | `["companyId", "sessionId", "code"]` |
| `delivery_notification_failed` | warn | `notify` (existente) | `["companyId", "error"]` |

Nunca se registra el nombre del cliente, el teléfono ni la dirección. Los rechazos con `type` de toma de pedido no agregan eventos: son los mismos rechazos de hoy con otro texto.

## 14. Pruebas

Unitarias, `src/delivery/__TEST__/describe-service-order.test.ts`:
- `test("titula la tarjeta de un para llevar de Rosa con «Rosa» y «Para llevar · desde las 9:40 p. m.»")`
- `test("titula la tarjeta de un para llevar sin nombre con «Para llevar» y «Desde las 9:40 p. m.»")`
- `test("titula la tarjeta de un delivery sin nombre con el teléfono y sin subtítulo")`
- `test("nombra la toma de pedido «Para llevar · Rosa», «Para llevar», «Delivery · Ana» y «Delivery · 987 654 321»")`
- `test("anuncia «Pedido de Rosa enviado» y, sin nombre, «Pedido para llevar enviado»")`
- `test("anuncia «Pedido de Ana enviado» para un delivery con nombre y «Pedido de delivery enviado» sin nombre")`
- `test("etiqueta la comanda de un para llevar sin nombre como «pedido de las 9:40 p. m.»")`
- `test("etiqueta la comanda de un delivery sin nombre con la hora de apertura y nunca con el teléfono")`
- `test("etiqueta «Impresiones pendientes» como «Delivery · pedido de las 8:15 p. m.» sin teléfono")`
- `test("etiqueta el aviso de cierre y «Entregados hoy» de un delivery sin nombre como «Delivery · 987 654 321»")`
- `test("usa la hora de Lima: 02:40 UTC se muestra como 9:40 p. m.")`
- `test("trata un nombre de solo espacios como sin nombre")`

`src/delivery/__TEST__/normalize-customer-name.test.ts`:
- `test("guarda «  Rosa » como «Rosa»")`
- `test("convierte un nombre vacío o de solo espacios en null")`
- `test("acepta un nombre de 120 caracteres")`
- `test("rechaza un nombre de 121 caracteres con «El nombre puede tener hasta 120 caracteres.»")`

`src/delivery/__TEST__/decide-customer-name-save.test.ts`:
- `test("guarda cuando el nombre guardado es el que vio la hoja")`
- `test("da éxito sin escribir cuando el nombre nuevo ya es el guardado")`
- `test("rechaza con el nombre actual cuando otro dispositivo lo cambió a «Rosita»")`
- `test("rechaza como nombre quitado cuando otro dispositivo lo dejó vacío")`
- `test("guarda lo escrito cuando el nombre esperado ya es el que devolvió el conflicto")`

`src/delivery/__TEST__/truncate-pasted-name.test.ts`:
- `test("pegar 150 caracteres en un campo vacío deja 120 y avisa el recorte")`
- `test("pegar sobre una selección cuenta solo lo que queda fuera de ella")`
- `test("pegar un texto que cabe no recorta ni avisa")`
- `test("deja el cursor al final de lo pegado")`

`src/delivery/__TEST__/describe-unpaid-fulfillment-order.test.ts` (actualizada):
- `test("un delivery sin nombre despachado aparece como «Delivery · 987 654 321» y «Despachado», nunca como «Para llevar»")`
- `test("un para llevar de Rosa aparece como «Para llevar · Rosa» y «Pendiente»")`

`src/printing/__TEST__/create-kitchen-ticket-content.test.ts` (actualizada):
- `test("imprime «Para llevar: Rosa» en negrita y sin línea «Cliente:»")`
- `test("imprime «Delivery: Ana» sin teléfono ni dirección")`
- `test("mantiene «Mesa: 4» sin negrita")`
- `test("un snapshot anterior con customerName sigue imprimiendo «Cliente: Ana»")`

`src/kitchen/__TEST__/kitchen-ticket-order-label.test.ts`:
- `test("usa la etiqueta o el número de la mesa en una mesa")`
- `test("usa el nombre o la hora de apertura en un pedido sin mesa y nunca el código interno")`

`src/table/__TEST__/describe-session-failure.test.ts` (T2):
- `test("traduce SessionChanged a «El pedido cambió en otro dispositivo…» en un pedido sin mesa")`
- `test("traduce SessionClosed a «Este pedido ya se cerró.»")`
- `test("traduce RoundConflict a «Otro envío cambió el pedido. Actualiza el pedido y vuelve a intentarlo.»")`
- `test("traduce OrderLocked a «Este pedido ya no admite cambios.»")`
- `test("ofrece Ver pedido guardado para SessionChanged y RoundConflict, Volver a Mesas para SessionClosed, SessionUnavailable y SessionInvalid, y Volver a Mesas e Ir al cobro para OrderLocked")`
- `test("conserva el mensaje del servidor en una mesa")`
- `test("ningún texto de pedido sin mesa contiene «mesa»")`
- `test("nombra el botón de descartar «Liberar mesa», «Liberar pedido» o «Liberar delivery» según el canal")`

`src/table/__TEST__/draft-repository.test.ts` (T1 el reintento, T2 los `type`):
- `test("reintenta un conflicto de serialización y guarda el borrador si la revisión no cambió")` (T1)
- `test("tras tres conflictos de serialización responde que el pedido cambió")` (T1)
- `test("responde SessionClosed al liberar una sesión que otro dispositivo cerró")`
- `test("responde SessionUnavailable cuando la sesión no existe o es de otra empresa")`
- `test("responde SessionChanged al liberar con una revisión vieja")`
- `test("responde SessionHasProducts y conserva el texto de mesa al liberar con productos")`

`src/table/__TEST__/table-order-labels.test.tsx` (T2, mismo entorno que `table-order-categories.test.tsx`):
- `test("un para llevar vacío muestra «Liberar pedido» y no «Liberar mesa»")`
- `test("un delivery vacío muestra «Liberar delivery»")`
- `test("una mesa vacía sigue mostrando «Liberar mesa»")`
- `test("la sección del pedido sin mesa se anuncia como «Pedido»")`
- `test("un rechazo RoundConflict al enviar muestra «Ver pedido guardado»")`
- `test("un rechazo OrderLocked muestra «Volver a Mesas» e «Ir al cobro»")`
- `test("un rechazo SessionClosed al liberar muestra «Este pedido ya se cerró.» con «Volver a Mesas»")`

`src/delivery/__TEST__/take-away-sheet.test.tsx` (T1):
- `test("la hoja abre con el campo «Nombre del cliente» sin autocompletado y con **Continuar al pedido** activo vacío")`
- `test("la hoja de edición carga el nombre actual y su acción es **Guardar nombre**")`
- `test("tras un conflicto de nombre la hoja conserva lo escrito y envía el nombre vigente como esperado en el siguiente guardado")`
- `test("cerrar la hoja sin haber enviado no refresca Mesas; cerrarla tras una respuesta perdida sí")`
- `test("guardar el nombre con éxito cierra la hoja y muestra «Nombre guardado»")`
- `test("una falla técnica al guardar deja la hoja abierta con lo escrito")`

`src/delivery/__TEST__/delivery-sheet.test.tsx` (T1):
- `test("la hoja de delivery muestra «Nombre del cliente» con autocompletado desactivado y la ayuda nueva")`

Integración, `tests/integration/take-away-customer-name.test.ts` (T1):
- `test("abre un para llevar con «Rosa» y la tarjeta y el título lo muestran")`
- `test("repetir la apertura con la misma clave devuelve la misma sesión y deja una sola tarjeta")`
- `test("dos aperturas simultáneas con la misma clave dejan una sola sesión y una sola orden")`
- `test("una clave que pertenece a otra empresa no abre ni revela su pedido")`
- `test("reintentar la apertura de un pedido que otro dispositivo ya liberó devuelve su sesión marcada como cerrada")`
- `test("un P2002 que no es de la clave de la sesión responde falla técnica y no devuelve ninguna sesión")`: provoca el choque dentro del `create` anidado (una orden que ya ocupa `Order.tableSessionId`), no en una sentencia aparte, y fija la forma de `meta` de ambos casos (clave de la sesión y lado de la orden).
- `test("abrir con «   » deja el pedido sin nombre")`
- `test("rechaza abrir con 121 caracteres sin crear el pedido")`
- `test("guarda «Rosa M.» aunque otro dispositivo haya enviado una ronda y cobrado desde que se abrió la hoja")`
- `test("guardar el nombre no cambia la versión del cobro ni la revisión del borrador")`
- `test("rechaza guardar cuando otro dispositivo cambió el nombre a «Rosita»")`
- `test("rechaza guardar cuando otro dispositivo quitó el nombre")`
- `test("tras el conflicto con «Rosita», guardar otra vez con el nombre vigente como esperado persiste «Rosa M.»")`
- `test("un vencimiento de la transacción (P2028) del renombre responde «No se pudo guardar el nombre. Vuelve a intentarlo.» sin type y registra take_away_customer_name_save_failed")` (con el error simulado en el mapeo del repositorio; esperar 20 s no es práctico)
- `test("dos guardados simultáneos con el mismo nombre esperado dejan uno y rechazan el otro con el nombre vigente")`
- `test("un renombre en paralelo con el guardado del borrador deja ambos guardados, sin «el pedido cambió»")`
- `test("un renombre en paralelo con liberar el pedido vacío lo libera, o responde SessionClosed al renombre si la liberación ganó")`
- `test("un renombre en paralelo con el envío de una ronda y con el cobro deja ronda, cobro y nombre guardados")`
- `test("un renombre que espera el bloqueo de un cobro de varios segundos termina guardando, sin falla técnica")`
- `test("un renombre en paralelo con «Entregado · cerrar pedido» guarda el nombre o responde SessionClosed, nunca «cambió»")`
- `test("cobrar el para llevar de Rosa no la pone como cliente de la boleta: Order.customerId sigue vacío y el comprobante no la nombra")`
- `test("rechaza guardar el nombre de un pedido cerrado con «Este pedido ya se cerró.»")`
- `test("responde «Este pedido ya no está disponible.» para un pedido de otra empresa, inexistente o un delivery")`
- `test("un vendedor abre y renombra un para llevar; cocina es rechazada por permiso")`
- `test("la comanda de Rosa guarda «Rosa» en el snapshot y la reimpresión tras renombrar usa «Rosa M.»")`
- `test("la segunda ronda de un para llevar sin nombre abierto a las 9:40 p. m. sigue diciendo «pedido de las 9:40 p. m.»")`
- `test("«Impresiones pendientes» etiqueta la comanda de Rosa como «Para llevar · Rosa»")`
- `test("«Entregados hoy» lista «Para llevar · Rosa» y un para llevar sin nombre como «Para llevar · pedido de las 9:40 p. m.»")`
- `test("un para llevar abierto antes de la migración aparece sin nombre y acepta uno")`

`tests/integration/cash-shift-unpaid-warning.test.ts` (T1, actualizada):
- `test("el aviso lista «Para llevar · Rosa · Pendiente» y «Delivery · 987 654 321 · Despachado»")`

`tests/integration/delivery-in-tables.test.ts`:
- T1 actualiza los casos que abren Para llevar con `openDelivery(null)` (`:170`, `:183`) para usar `openTakeAway`, y agrega `test("openDelivery con null ya no abre un para llevar")`.
- T2 agrega:
  - `test("liberar un para llevar con la gaseosa guardada por otro dispositivo responde SessionChanged y el pedido sigue en Mesas")`
  - `test("liberar un para llevar que otro dispositivo liberó responde SessionClosed")`
  - `test("enviar a un pedido sin mesa ya cerrado responde SessionClosed")`
  - `test("enviar a un pedido sin mesa inexistente responde SessionUnavailable")`
  - `test("enviar a un pedido sin mesa ya cobrado responde OrderLocked")`
  - `test("cobrar un pedido sin mesa sin cuenta responde SessionUnavailable")`
  - `test("payTable sobre una sesión inexistente devuelve type SessionUnavailable y no reintenta")`
  - `test("guardar el borrador con revisión vieja en un pedido ya cobrado responde SessionChanged y, con la revisión al día, OrderLocked")`
  - `test("liberar una mesa cambiada conserva el texto «La mesa cambió en otro dispositivo…»")`

`tests/integration/send-order-round.test.ts`:
- T1 actualiza las afirmaciones del snapshot que esperan el código de 8 caracteres o `customerName`.
- T2 agrega:
  - `test("un envío concurrente responde RoundConflict")`
  - `test("un envío con revisión de borrador vieja responde SessionChanged")`

`tests/integration/kitchen-print-job-coordination.test.ts` (T1): actualiza las afirmaciones de etiqueta («Para llevar», código) a las de `describeServiceOrder`.

Verificaciones manuales pendientes:
- Comanda real: «Para llevar: Rosa» en negrita, sin «Cliente:» ni código; un nombre de 60 caracteres se parte sin cortar.
- Hoja en celular: cursor puesto, teclado con «Ir», sin lista de autocompletado, pegar 150 caracteres muestra el aviso.
- Respuesta perdida (modo avión tras tocar **Continuar al pedido**): reintentar abre el mismo pedido.

## 15. Límites y verificaciones durante la implementación

- Verificar que `Intl` del servidor y del navegador producen el mismo «9:40 p. m.» (con Node 22.22 sale con espacios simples; otra versión de ICU puede usar espacio no separable). Las pruebas comparan contra `formatLimaTime`, no contra un literal con espacios.
- Fijar con una prueba la forma exacta de `meta` que reporta la versión de Prisma del repositorio en un P2002 sobre la clave primaria de `TableSession` creada con orden anidada (`modelName`, `target` como `["id"]` o `TableSession_pkey`); el filtro de §5.1 paso 4 usa esa forma.
- Verificar que ningún flujo usa `TableSession.updatedAt` como versión antes de escribir el nombre ahí (hoy solo se mapea).
- El snapshot de comanda no se valida con Zod al renderizar (deuda existente en `src/printing/jobs`); este diseño no la cambia.
- Deuda conocida, previa a este diseño: `submitOrderRound` toma `Order` y luego escribe la sesión, mientras `payTable` toma la sesión y luego `Order`. Un envío y un cobro simultáneos del mismo pedido pueden bloquearse mutuamente; PostgreSQL aborta uno y ambos flujos reintentan. Este diseño no lo cambia.
- Deuda conocida, tarea propia: `listDeliveredToday` filtra por `companyId`, `tableId` null, `status` CLOSED y `closedAt` del día, pero solo existe `@@index([companyId, status])`, así que recorre todas las sesiones cerradas de la empresa. Un índice `[companyId, status, closedAt]` lo resuelve; crearlo sin `CONCURRENTLY` bloquea escrituras de `TableSession`, así que no va en esta migración.
- Fuera: idempotencia de la apertura de Delivery, conflicto por campo en la hoja de Delivery, teléfono en Para llevar, vínculo con el catálogo de clientes, numeración corta, pantalla de cocina, navegación de vuelta a Mesas (observación 5).

## 16. Plan de implementación

### Orden y paralelismo

Ola 1: T1. Ola 2: T2. Van en secuencia porque ambas editan `src/table/components/table-order-view.tsx`, `src/order/rounds/db_repository.ts`, `src/table/payment-repository.ts`, `src/table/draft-repository.ts` y tres pruebas de integración; un bloqueador previo no elimina esos archivos compartidos, así que no hay partición paralela con archivos disjuntos. Solo T1 crea migración. Cuando un archivo aparece en ambas, la lista dice qué parte toca cada tarea.

### T1. Nombre del cliente y etiqueta única de pedidos sin mesa

**Alcance:** migración `TableSession.customerName` (sin `lock_timeout`, recuperación documentada en el PR); `describeServiceOrder`, `formatLimaTime` (formateador de módulo), `normalizeCustomerName`, `decideCustomerNameSave`, `truncatePastedName`, `kitchenTicketOrderLabel`; acciones `openTakeAway` (apertura idempotente con filtro de destino del P2002 y réplica de pedido cerrado) y `saveTakeAwayCustomerName` (con `SaveCustomerNameResult` y `currentName`); reintento acotado en P2034 de `updateTableDraft` (sin tocar sus textos ni agregar `type`), para que un renombre no provoque falsos conflictos; `TakeAwaySheet` (crear y editar, refresco solo tras duda) y el lápiz en la página del pedido; `openDelivery` solo para delivery; etiquetas en tarjeta, toma de pedido (`title`, `sentTitle`), cobro (`sessionTitle`), comanda (lectura heredada de `customerName`) y reimpresión, «Impresiones pendientes», aviso de cierre de turno (con nombres partidos en líneas) y «Entregados hoy» (hora 12 h); campo «Nombre del cliente» en `DeliverySheet`; observabilidad §13 salvo lo de T2.
**Fuera de alcance:** textos de rechazo sin «mesa», `type` de rechazos y «Liberar pedido/delivery» (T2); cualquier cambio a la apertura o al conflicto de Delivery.
**Criterios de aceptación:**
1. Tocar **Para llevar**, escribir «Rosa» y **Continuar al pedido** abre «Para llevar · Rosa»; la tarjeta muestra «Rosa» / «Para llevar · desde las 9:40 p. m.».
2. Enviar una pachamanca muestra «Pedido de Rosa enviado» y el snapshot de la comanda tiene `orderLabel: "Rosa"` y se renderiza «Para llevar: Rosa» en negrita, sin «Cliente:» ni código.
3. Un Para llevar sin nombre abierto a las 9:40 p. m. imprime «Para llevar: pedido de las 9:40 p. m.» en su primera y en su segunda ronda (10:10 p. m.).
4. Con la impresora apagada, «Impresiones pendientes» lista «Para llevar · Rosa · Cocina» y «Para llevar · pedido de las 9:40 p. m. · Cocina».
5. Renombrar a «Rosa M.» actualiza tarjeta y título; la comanda ya guardada no cambia y **Reimprimir** sale con «Para llevar: Rosa M.».
6. Renombrar mientras otro dispositivo envía y cobra guarda sin conflicto; si otro dispositivo lo cambió a «Rosita», responde «Otro dispositivo cambió el nombre a Rosita. Revisa y vuelve a guardar.» con «Rosa M.» intacto, y el segundo **Guardar nombre** guarda «Rosa M.».
7. Repetir **Continuar al pedido** con la misma clave tras una respuesta perdida deja una sola sesión; si otro dispositivo ya liberó ese pedido, se abre su página con «Este pedido ya se cerró.».
8. «   » abre sin nombre; pegar 150 caracteres deja 120 y muestra «Se recortó a 120 caracteres.».
9. El aviso de cierre lista «Para llevar · Rosa · Pendiente» y «Delivery · 987 654 321 · Despachado»; «Entregados hoy» lista «Para llevar · Rosa» con «10:15 p. m.» en una línea.
10. El cobro de Rosa se titula «Para llevar · Rosa» y la boleta no trae a Rosa como cliente (`Order.customerId` vacío).
11. La hoja de Delivery muestra «Nombre del cliente» sin sugerencias del navegador.
12. Un renombre en paralelo con el guardado automático del borrador, la liberación, el envío o el cobro del mismo pedido no produce «cambió en otro dispositivo» en ninguno de esos flujos.
13. Cerrar la hoja sin confirmar no recarga Mesas; cerrarla tras el mensaje de duda sí.
14. Un trabajo de comanda de delivery creado antes del despliegue sigue imprimiendo «Cliente: Ana».
**Pruebas:** de §14: `describe-service-order`, `normalize-customer-name`, `decide-customer-name-save`, `truncate-pasted-name`, `describe-unpaid-fulfillment-order`, `create-kitchen-ticket-content`, `kitchen-ticket-order-label`, `take-away-sheet`, `delivery-sheet`, los casos T1 de `draft-repository`, `tests/integration/take-away-customer-name.test.ts`, `tests/integration/cash-shift-unpaid-warning.test.ts` y las actualizaciones T1 de `delivery-in-tables`, `send-order-round` y `kitchen-print-job-coordination`; además `npm test` completo en verde.
**Archivos:** `prisma/schema.prisma`, `prisma/migrations/20261023120000_take_away_customer_name/`, `src/delivery/**` (types, use-cases, schemas, actions, db_repository, components, `__TEST__`), `src/kitchen/use-cases/kitchen-ticket-order-label.ts`, `src/kitchen/print-strategy.ts`, `src/kitchen/db_repository.ts`, `src/kitchen/__TEST__/kitchen-ticket-order-label.test.ts`, `src/printing/create-kitchen-ticket-content.tsx` y su prueba, `src/order/rounds/db_repository.ts` (solo el snapshot), `src/table/types.ts`, `src/table/db_repository.ts`, `src/table/draft-repository.ts` (solo el reintento en P2034), `src/table/__TEST__/draft-repository.test.ts` (casos del reintento), `src/table/payment-repository.ts` (solo `sessionTitle` e `include`), `src/table/components/table-order-view.tsx` (solo la prop `sentTitle`), `src/app/[subdomain]/dashboard/tables/page.tsx` (si cambian las props de `NewServiceButtons`), `src/app/[subdomain]/dashboard/tables/delivery/[sessionId]/order/page.tsx` (título, `sentTitle`, lápiz), `src/app/[subdomain]/dashboard/tables/delivery/page.tsx`, `src/cash-shift/components/close-cash-shift-form.tsx`, `tests/integration/take-away-customer-name.test.ts`, `tests/integration/cash-shift-unpaid-warning.test.ts`, `tests/integration/delivery-in-tables.test.ts` (casos de `openDelivery(null)`), `tests/integration/send-order-round.test.ts` y `tests/integration/kitchen-print-job-coordination.test.ts` (afirmaciones de etiqueta y snapshot).
**Depende de:** nada.

### T2. Pedidos sin mesa sin «mesa»

**Alcance:** extender `ErrorResponse["type"]`; `describe-session-failure.ts` (`noTableFailureMessage`, `sessionFailureMessage`, recuperación por `type`, `releaseLabel`, `serviceChannel`); cada sitio de rechazo de §5.6 con su `type`: `updateTableDraft` (con la distinción `SessionClosed`/`SessionUnavailable`), `leaveEmptyTable`, `submitOrderRound` (`RoundRejected`, misma distinción de cerrado) y el cobro (`PaymentRejected` en `payTable`, `type` en el retorno de `getTablePaymentData`); `TableOrderView` (liberar por canal, `aria-label`, confirmación de **Ver pedido guardado**, mensajes y botones **Ver pedido guardado** / **Volver a Mesas** / **Ir al cobro** por `type`); `useTableDraft` con `errorType`; mensajes de la página del pedido y de cobro sin mesa con **Volver a Mesas**; `TablePaymentView` con `sessionFailureMessage`.
**Fuera de alcance:** cambiar textos de mesas; cambiar el efecto de liberar; textos de la etiqueta (T1).
**Criterios de aceptación:**
1. Un Para llevar vacío muestra **Liberar pedido**, un Delivery vacío **Liberar delivery**, la mesa 4 vacía **Liberar mesa**.
2. Mozo B guarda una gaseosa en un Para llevar vacío; mozo A toca **Liberar pedido** con la pantalla vieja y ve «El pedido cambió en otro dispositivo. Tus cambios siguen aquí; revisa el pedido antes de continuar.» con **Ver pedido guardado**; al tocarlo ve la gaseosa y el botón de liberar desaparece.
3. Mozo B libera el Para llevar; mozo A toca **Liberar pedido** y ve «Este pedido ya se cerró.» con **Volver a Mesas**.
4. Enviar a un pedido sin mesa que otro dispositivo cerró muestra «Este pedido ya se cerró.» con **Volver a Mesas**; a uno inexistente, «Este pedido ya no está disponible.».
5. Un envío simultáneo muestra «Otro envío cambió el pedido. Actualiza el pedido y vuelve a intentarlo.» con **Ver pedido guardado**.
6. Con la revisión del borrador al día, enviar o guardar en un pedido sin mesa ya cobrado muestra «Este pedido ya no admite cambios.» con **Volver a Mesas** e **Ir al cobro**; desde una pantalla con revisión vieja, guardar responde primero «El pedido cambió en otro dispositivo…» (§5.6, precedencia).
7. El cobro de un pedido sin mesa sin cuenta muestra «Este pedido ya no está disponible.» con **Volver a Mesas**.
8. Una mesa en las mismas situaciones conserva los textos actuales.
9. Ningún texto visible de la toma de pedido, la página del pedido ni el cobro de un pedido sin mesa contiene «mesa» (salvo «Mesas» como nombre de pantalla).
**Pruebas:** de §14: `describe-session-failure`, los casos T2 de `draft-repository`, `table-order-labels`, las ampliaciones T2 de `delivery-in-tables` y `send-order-round`; `npm test` completo en verde.
**Archivos:** `src/lib/types.ts`, `src/table/use-cases/describe-session-failure.ts`, `src/table/draft-repository.ts` (los `type` y la relectura de cerrado), `src/table/actions.ts`, `src/table/payment-repository.ts` (rechazos), `src/order/rounds/db_repository.ts` (rechazos y relectura de cerrado), `src/table/components/table-order-view.tsx` (todo salvo `sentTitle`), `src/table/components/use-table-draft.ts`, `src/table/components/table-payment-view.tsx`, `src/app/[subdomain]/dashboard/tables/delivery/[sessionId]/order/page.tsx` (mensajes de sesión cerrada, inexistente o de mesa), `src/app/[subdomain]/dashboard/tables/delivery/[sessionId]/payment/page.tsx`, `src/table/__TEST__/describe-session-failure.test.ts`, `src/table/__TEST__/draft-repository.test.ts` (casos de `type`), `src/table/__TEST__/table-order-labels.test.tsx`, `tests/integration/delivery-in-tables.test.ts` y `tests/integration/send-order-round.test.ts` (casos de mensajes).
**Depende de:** T1 (archivos compartidos).

Si T1 se atrasa, el reintento en P2034 de `updateTableDraft` y sus pruebas pueden salir como T1a (misma ola, sin migración) de la que T1 dependa; no se parte por adelantado.

### Verificación final

Las verificaciones manuales de §14 en una tablet y la impresora de cocina, con fotos de la comanda en la descripción del pull request.

## 18. Preguntas decididas por la revisión

Respondidas por la revisión de arquitectura del flujo implement-task (revisor de diseño y revisor de rendimiento, rondas 1 a 3, 23/10/2026), pendientes de confirmación del fundador en el pull request final.

1. **¿Dónde se guarda el nombre del cliente de un Para llevar?**
   - Respuesta: columna nullable `TableSession.customerName`; Delivery sigue en `Delivery.name`.
   - Decidieron: revisor de diseño y revisor de rendimiento, de acuerdo en las tres rondas; el coordinador lo confirmó.
   - Razón: es una columna aditiva sin backfill. Renombrar no cambia `Order.updatedAt` (versión del cobro y de la edición de Delivery) ni `draftRevision`, así que no rechaza un cobro en curso. `openedAt`, la otra mitad de la etiqueta, ya vive en la fila que cargan todos los lectores. Su costo, los conflictos de serialización con los flujos `Serializable` que escriben la sesión, se absorbe con reintentos acotados (§11).
   - Descartadas: `Order.customerName` solo para Para llevar (cada renombre rechazaría un cobro abierto en otro dispositivo, o habría que escribirla con SQL crudo para saltar `@updatedAt`, algo frágil); una sola `Order.customerName` para ambos canales con backfill desde `Delivery.name` (reescribe datos de producción, toca la edición de Delivery y su control de conflicto, y tiene el mismo problema de versión del cobro).

Decidido salvo objeción: la tabla de §2, sin objeciones de la revisión.

Diferidos con riesgo real: ninguno. Lo diferido (idempotencia de la apertura de Delivery, índice de `listDeliveredToday`, orden de locks previo entre envío y cobro) no causa pérdida de dinero, duplicados con dinero ni comprobantes errados.
