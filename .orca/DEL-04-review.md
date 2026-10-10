# DEL-04 — Revisión

Alcance revisado: `git log del-02-datos-entrega..HEAD` (700faf5, 076b94b), contra el documento de la tarea 04, el alcance aprobado (`05-delivery.md`) y la arquitectura (§§3.1.1, 3.4, 4, 5, 7, 8, 11.6, 11.8, 11.9). Solo lectura: no se modificó ningún archivo del repo.

Resumen: **1 bloqueante, 0 importantes, 4 menores.**

## Hallazgos

### B1 — Bloqueante: el formulario de edición falla siempre que “Pago esperado” es “Sin definir”
- **Dónde:** `src/delivery/components/delivery-edit-form.tsx:60` y `:87-91` (envía `...form`), frente a `src/delivery/schemas.ts:14` (`expectedPaymentMethod: z.enum(["CASH","WALLET"]).nullish()`).
- **Problema:** el formulario guarda el medio esperado como `""` cuando no hay ninguno (`initial.expectedPaymentMethod ?? ""` o al elegir “Sin definir”) y lo envía tal cual. El esquema de la acción solo acepta `CASH`, `WALLET`, `null` o `undefined`, así que `editDeliveryDetails` responde “Los datos del pedido no son válidos.” y no guarda nada. El formulario de creación sí lo convierte a `null` (`src/order/components/fulfillment-order.tsx:95`); el de edición no.
- **Escenario:** pedido creado sin medio esperado (el campo es opcional en DEL-02, así que es frecuente) → el usuario abre “Editar datos de entrega”, corrige solo la dirección y guarda → toast de error y nada se guarda. Pasa en cualquier estado, también Entregado y cobrado. Por eso no se cumplen en la UI los criterios 1–3 para esos pedidos. Lo comprobé ejecutando `UpdateDeliveryDetailsSchema.safeParse({...form, expectedPaymentMethod: ""})`, que devuelve `invalid_enum_value` en `expectedPaymentMethod`.
- **Por qué los tests no lo detectan:** `tests/integration/delivery-edit-list.test.ts` siempre envía `null` o un valor válido, nunca la forma real del formulario.
- **Corrección sugerida:** en el envío del formulario, mandar `expectedPaymentMethod: form.expectedPaymentMethod || null` (y `cashPaysWith: form.cashPaysWith || null`), igual que en la creación. Otra opción es que el esquema acepte `""` y lo convierta a `null`. Agregar un caso que llame a `editDeliveryDetails` con la forma exacta del formulario (strings y `""`) en un pedido sin medio esperado.

### M1 — Menor: si el cobro pierde contra la edición en X2, el usuario ve el texto crudo de Postgres
- **Dónde:** `src/order/fulfillment-payment-repository.ts:233-243` (código anterior a DEL-04; no está en el diff).
- **Problema:** `payFulfillmentOrder` solo traduce `P2034`. Un conflicto de serialización llega como `P2010` con `meta.code = "40001"` desde el `SELECT … FOR UPDATE` crudo, y el catch devuelve `error.message`: el SQL y el texto de Postgres.
- **Escenario:** la edición de envío y el cobro corren a la vez y la edición confirma primero → el cobrador ve un mensaje técnico de Prisma/Postgres. El resultado sigue siendo coherente (sin pago ni documento), así que el criterio 5 se cumple; el defecto es de mensaje y de exposición de detalles internos.
- **¿Corregir en DEL-04?** No es imprescindible: el archivo pertenece al cobro (DEL-03) y el resultado financiero es correcto. Conviene corregirlo en DEL-03 o en un `fix:` corto antes de cerrar Delivery: compartir el helper `isSerializationConflict` (hoy repetido en `src/delivery/db_repository.ts:19`, `:100` y en `src/order/rounds/db_repository.ts:657`) y devolver “El pedido cambió. Consulta su estado antes de reintentar.” también ante 40001.

### M2 — Menor: un Despachado creado ayer y todavía en la calle no aparece en la lista por defecto ni se resalta
- **Dónde:** `src/delivery/db_repository.ts:189-202` (`createdAt` dentro del día de Lima).
- **Problema:** la lista por defecto filtra por la fecha de creación de hoy.
- **Escenario:** un pedido creado a las 23:30 y despachado a las 23:45 desaparece de la vista por defecto a las 00:00. A las 01:45 está atrasado, pero no se ve resaltado salvo que alguien cambie la fecha a ayer. El documento dice literalmente “del día”, así que la implementación cumple el texto; el objetivo del criterio 8 (detectar atrasos) se debilita cerca de la medianoche. El implementador ya lo anotó.
- **Corrección sugerida:** decidirlo con el coordinador. Una opción es que el filtro por defecto (sin fecha explícita) incluya también los PENDING/DISPATCHED de días anteriores; otra es dejarlo documentado como limitación.

### M3 — Menor: buscar con el prefijo +51 no encuentra el teléfono
- **Dónde:** `src/delivery/db_repository.ts:194` y `:208`.
- **Problema:** `digits = search.replace(/\D/g, "")` conserva el `51` del prefijo, pero los teléfonos se guardan sin él (`normalizeDeliveryPhone`).
- **Escenario:** buscar “+51 987 654” → busca `51987654` → sin resultados, aunque el pedido tiene `987654321`. Además, cualquier búsqueda por nombre que tenga un dígito (“Ana 9”) amplía la búsqueda a casi todos los teléfonos, porque todos empiezan con 9.
- **Corrección sugerida:** quitar un prefijo `51` inicial cuando la búsqueda empieza con `+51` o tiene más de 9 dígitos. Opcionalmente, buscar por teléfono solo cuando la búsqueda es mayormente numérica.

### M4 — Menor: “Volver al inicio” pierde los filtros
- **Dónde:** `src/app/[subdomain]/dashboard/delivery/page.tsx:51-56`.
- **Problema:** el enlace va a `/dashboard/delivery` sin `date`, `status` ni `search`, pero el campo de búsqueda (estado del cliente en `delivery-list-filters.tsx:19`) sigue mostrando el texto anterior.
- **Escenario:** buscar “ana”, pulsar “Ver más” y luego “Volver al inicio” → la lista muestra todos los pedidos mientras la caja de búsqueda sigue diciendo “ana”.
- **Corrección sugerida:** armar el enlace con los mismos parámetros sin `cursor` (como ya hace `next`, sin la línea 45).

## Verificaciones sin hallazgos

- **Criterios 1–4 (servidor):** `updateDeliveryDetails` usa una transacción Serializable. Primero hace `FOR UPDATE` sobre Order y después lee el pedido filtrando por `companyId` y `orderType = DELIVERY`. Rechaza CANCELLED. Compara `updatedAt` y vuelve a leer los documentos bajo el bloqueo. El bloqueo vale con documento o con PAID, y se rechaza la solicitud entera (`planDeliveryEdit`). Recalcula `total` y `netTotal` con el helper común `recalculateOrderTotals` y revalida “paga con”; un rechazo hace rollback por excepción. Toda edición actualiza `updatedAt`. Los reintentos ante conflicto están acotados y vuelven a decidir.
- **Bloqueos:** solo Order, el mismo orden que cobro y rondas, así que no hay riesgo de interbloqueo nuevo.
- **Dinero:** el plan compara en céntimos; el CHECK de BD de §3.1.1 sigue protegiendo fee, phone y cashPaysWith; “paga con” ≥ total se valida dentro de la transacción.
- **Autorización:** las acciones usan `protectedAction` (delivery update/read), `requireFeature("restaurants")`, y la empresa y el actor salen de la sesión. El esquema descarta total, estado y actor. Los mensajes son genéricos para otra empresa. La página `/dashboard/delivery` aplica `requirePermission` y `requireFeature`. En `src/proxy.ts`, la ruta exige delivery:read: WAITER y KITCHEN son redirigidos y el prefijo no colisiona con otras rutas. El menú está sujeto a la feature y al permiso. Que SELLER edite está alineado con sus permisos de delivery; editar no concede cobro.
- **Notificaciones:** no se agregan eventos realtime ni datos sensibles en canales; solo `revalidatePath`.
- **Lista:** filtra por empresa y DELIVERY y excluye cancelados. Por defecto muestra PENDING+DISPATCHED. El cursor es estable (createdAt desc, orderId desc) y los filtros se aplican antes de paginar. Las columnas pedidas están en la UI. `isDeliveryOverdue` es puro (≥ 2 h, solo DISPATCHED) y no persiste nada.
- **Tests §11:**
  - L1–L8, X2 y S1–S3 (+S4) existen en `tests/integration/delivery-edit-list.test.ts`, contra PostgreSQL real, con bloqueos reales y sin mocks del repositorio (solo `getSession` y `revalidatePath`, como exige §11.1).
  - L3 cubre el pago real y el documento sembrado.
  - L8 incluye empates de hora y filtros.
  - X2 ejecuta 8 rondas con `Promise.all` y dos órdenes deterministas.
  - L7 también tiene pruebas puras.
- **Estilo:** sigue las convenciones del repo (`@/`, kebab-case, `use-cases`, `__TEST__`). El helper `isSerializationConflict` nuevo no se reutiliza en `transitionDelivery` (`src/delivery/db_repository.ts:100`); es cosmético y se incluye en M1.

## Comandos (BD propia `lorito_killer_del_04`, contenedor `del-04-db` en :55404)

| Comando | Resultado |
| --- | --- |
| `npm test` | OK — 61 archivos, 401 tests pasan (incluye `tests/integration/delivery-edit-list.test.ts`) |
| `npm run lint` | OK — 0 errores, 2 warnings preexistentes (`interactive-data-table.tsx`, `stock-adjustment-form.tsx`) |
| `npx tsc --noEmit` | Falla con 5 errores **preexistentes** fuera del diff: `src/cash-shift/__TEST__/db_repository.test.ts:118,119`; `tests/integration/kitchen-print-job-coordination.test.ts:205,236,239`. Ninguno está en archivos de DEL-04. |

## Pendientes

- Corregir B1 y agregar un test con la forma real del formulario.
- Decidir M2 con el coordinador.
- M1 en DEL-03 o en un `fix:` aparte.
- La prueba exploratoria en navegador del documento de la tarea sigue sin ejecutarse.
