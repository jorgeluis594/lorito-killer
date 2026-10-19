# Impresora de caja por el Print Gateway

Estado: plan, sin implementar.

## Objetivo

El ADMIN configura una sola **impresora de caja** (`Company.cashierPrinterId`). Por ella salen los comprobantes y la precuenta de mesa, a través del Print Gateway. iMin se elimina.

- Sin impresora de caja: el comprobante abre el PDF; la precuenta muestra un aviso para configurarla.
- El worker reintenta solo. Si el trabajo falla definitivamente (3 intentos, timeout o Gateway revocado), quien lo pidió recibe un toast de error por realtime.

## Decisiones

| Tema | Decisión |
|---|---|
| Impresora de comprobantes (`invoicePrinterId`) | Se elimina. En la migración, si una empresa solo tenía esa, se copia a `cashierPrinterId`. |
| Cola | Una sola tabla polimórfica: `sourceType` + `sourceId` (sin FK al origen). |
| Precuenta | No es un `Document`. Apunta a `TableSession`. |
| Cuándo se imprime la precuenta | Automática al pedir la cuenta y con un botón mientras la sesión esté `OPEN` o `BILL_REQUESTED`. |
| Comprobantes al cobrar | Boleta, factura y nota de venta, una copia. Las notas de crédito solo desde el detalle. Un documento anulado se reimprime con la marca "ANULADO". |
| Reintentos | Automáticos, en el worker, cuando el Gateway reporta `RETRYABLE_FAILURE`. Comanda: política actual (env). Caja: 3 intentos. |
| Gateway apagado | No hace falta vencimiento: hoy un trabajo que no se toma o no se confirma en `PRINT_JOB_TIMEOUT_MS` (10 s) pasa directo a `FAILED`, sin reintento. Se mantiene así: con el Gateway apagado el toast llega a los ~10 s. |
| Feedback | La acción vuelve apenas crea el trabajo. No hay toast de éxito. El error llega por realtime. |
| Cajas por empresa | Una sola. Límite conocido para varias cajas o locales. |
| Módulo restaurante | La impresora de caja y los comprobantes quedan para todos; `PRE_BILL` y cocinas siguen exigiendo `restaurants`. |
| iMin | Se borra en este refactor. Los clientes con iMin ven el PDF hasta instalar el Gateway; se les avisa antes del despliegue. |

## 1. Modelo

```prisma
enum PrintJobSourceType {
  KITCHEN_TICKET // sourceId → KitchenTicket.id
  TAX_DOCUMENT   // sourceId → Document.id
  PRE_BILL       // sourceId → TableSession.id
}

model PrintJob {
  id            String             @id @default(uuid())
  companyId     String             // FK Company (igual que hoy)
  sourceType    PrintJobSourceType
  sourceId      String             // sin FK: ningún código borra Order, KitchenTicket ni TableSession
  printerId     String             // FK Printer (igual que hoy)
  content       Bytes?             // legado: solo comandas creadas antes de `ticket`
  ticket        Json?              // snapshot del origen al crear el trabajo
  isReprint     Boolean            @default(false)
  requestedById String             // FK User, relación "PrintJobRequester"
  status        PrintJobStatus     @default(PENDING)
  // attempts, nextAttemptAt, claimRequestedAt, processingStartedAt, lastError, createdAt, updatedAt: igual que hoy

  @@index([sourceType, sourceId, createdAt]) // reemplaza [kitchenTicketId, createdAt]
  @@map("KitchetTicketPrintJob")
}

enum PrintJobStatus { ... @@map("KitchenTicketPrintJobStatus") }
```

Migración (SQL a mano):

1. `RENAME COLUMN "kitchenTicketId" TO "sourceId"`.
2. Agregar `sourceType` con default `'KITCHEN_TICKET'` y luego quitar el default.
3. Eliminar la FK a `KitchenTicket` y reemplazar el índice.
4. Copiar `invoicePrinterId` → `cashierPrinterId` donde la segunda sea `null`, y eliminar `invoicePrinterId`.
5. Verificar con `prisma migrate diff` que el schema y la base coinciden.

## 2. Estrategia por tipo

`src/printing/jobs/` es dueño de la cola: crear el trabajo, la reserva, `claim`/`result`, los reintentos, los timeouts y el registro de estrategias. Cada dominio implementa su estrategia:

```ts
type PrintJobStrategy<Snapshot> = {
  maxAttempts?: number;  // si se omite, PRINT_JOB_MAX_ATTEMPTS
  buildSnapshot(db: Tx, companyId: string, sourceId: string): Promise<Snapshot>;
  render(snapshot: Snapshot, printer: PrinterProfile): Promise<Uint8Array>;
  failureAudience(job: { companyId: string; sourceId: string; requestedById: string }):
    Promise<{ channels: string[] }>;
};

export const printJobStrategies = {
  KITCHEN_TICKET: kitchenTicketPrintStrategy, // src/kitchen
  TAX_DOCUMENT: taxDocumentPrintStrategy,     // src/document
  PRE_BILL: preBillPrintStrategy,             // src/table
} satisfies Record<PrintJobSourceType, PrintJobStrategy<any>>;
```

| Tipo | `buildSnapshot` | `render` | `maxAttempts` | Aviso de fallo |
|---|---|---|---|---|
| `KITCHEN_TICKET` | lo de hoy (`KitchenTicketContentInput`) | `createKitchenTicketContent` (imagen) | env | `kitchen-admin` + `kitchen-user-<responsable de la ronda>` (como hoy) |
| `TAX_DOCUMENT` | `Document` + `Order` + `Company` → `buildReceiptPrintData` | `buildThermalReceiptCommands` → ESC/POS (texto + QR nativo) | 3 | `print-user-<requestedById>` |
| `PRE_BILL` | `TableSession` + mesa + mozo + `Order` con ítems | comandos de precuenta → ESC/POS | 3 | `print-user-<requestedById>` |

- `buildThermalReceiptCommands` sale de `printers/imin/` y recibe las columnas del perfil de la impresora (hoy tiene `COLUMNS = 36` fijo).
- `print-commands-to-escpos.ts` lo comparten `TAX_DOCUMENT` y `PRE_BILL`, con `ReceiptPrinterEncoder` y respetando `columns`, `codepageMapping`, `cutEnabled` y `feedBeforeCut`.
- Precuenta: mesa, mozo, `guestCount`, hora, ítems, descuentos, total y "No válido como comprobante de pago".
- `renderPrintJobContent`: si existe `content` (legado) lo devuelve; si no, `strategies[sourceType].render(ticket, printer)`.
- "Reimprimir" vuelve a llamar a `buildSnapshot` (imprime el estado actual).
- Desvío (Tarea 1): `buildSnapshot` recibe un 4º argumento opcional `options?: { isReprint?: boolean }` porque la comanda reimpresa incluye los platos anulados; el envío de ronda sigue armando su snapshot en memoria dentro de la transacción.

## 3. Crear trabajos

- **Comprobante:** una server action `printTaxDocument(orderId)` busca el `Document` del pedido. Sin `cashierPrinterId` devuelve `{ mode: "pdf" }` y el cliente abre `/api/orders/[id]/documents`. Con impresora, crea un `TAX_DOCUMENT`. La usan `payment-modal.tsx`, `table-payment-view.tsx` y `receipt-print-button.tsx` (detalle de pedido y reporte de ventas).
- **Precuenta:** se crea al terminar bien `requestBillAction`, y con el botón "Imprimir precuenta" del panel de la mesa (permiso `tables:update`).
- Desvío (Tarea 3): `requestBillAction`, `table-session-panel.tsx` y `table-actions-menu.tsx` son código muerto. La precuenta se crea cuando `confirmTablePayment` con método `register` (Enviar a caja) deja la sesión en `BILL_REQUESTED`, después de la transacción del pago y sin hacerlo fallar; el botón está en `table-order-view.tsx`.
- **Consultas que pierden la relación `KitchenTicket.printJobs`** pasan a buscar los trabajos por `sourceType` y `sourceId`: `src/order/rounds/db_repository.ts:294`, `src/kitchen/db_repository.ts:304` y `:507`. La actividad de impresoras de cocina (`kitchen/db_repository.ts:383`) filtra `sourceType: "KITCHEN_TICKET"`.

## 4. Fallos por realtime

- El worker (`process-print-jobs.ts`) ya marca `FAILED` (timeouts y Gateway revocado) y llama a `notifyPrintJobFailed`; la ruta `result` lo hace al agotar intentos. `notifyPrintJobFailed` pasa a usar `failureAudience` de la estrategia.
- `TAX_DOCUMENT` y `PRE_BILL` publican `print-job-failed` en `print-user-<requestedById>`, con `{ jobId, sourceType, message }`.
- Un listener montado en `dashboard/layout.tsx` (donde hoy está `PrintingProvider`) muestra el toast de error.

## 5. Ajustes → Impresión

- Quitar `requireFeature("restaurants")` de la página; la sección de cocinas lo sigue exigiendo.
- Quitar el selector de impresora de comprobantes; `setCompanyPrinter` y `getCompanyPrinterIds` quedan solo para caja.
- La regla "no se puede desactivar una impresora asignada" deja de mirar `invoicePrinterId`.

## 6. Borrar iMin

`src/printing/printers/imin/`, `printing-provider.tsx`, `printing-runtime.ts`, `init-printers.ts`, `request-local-network-access.ts`, el `PrintingProvider` del layout, los tipos de iMin en `src/printing/types.ts`, la variable de entorno de Falcon, el SDK, y la ruta `/api/orders/[id]/print-data`, que queda sin uso.

## 7. Tests

- Registro: todo `sourceType` tiene estrategia; `renderPrintJobContent` con `content` legado.
- `render` de cada estrategia: comprobante con QR en 58 y 80 mm, precuenta, comanda (los actuales).
- Política por tipo: caja falla al tercer intento.
- Aviso de fallo al canal correcto por tipo.
- `printTaxDocument`: sin impresora devuelve pdf; con impresora crea el trabajo.
- `setCompanyPrinter` solo para caja.
- Los tests actuales de la cola de comandas siguen pasando.

## Después de implementar

Actualizar `docs/impresoras.md`: quitar la sección de iMin y la impresora de comprobantes, describir la cola polimórfica y la impresora de caja. Queda como pendiente el cajón de dinero (comando ESC/POS desde la impresora de caja).

## PRs

1. Modelo y cola genérica (secciones 1, 2 solo con `KITCHEN_TICKET`, y la parte de consultas de 3). Las comandas funcionan igual.
2. Comprobantes: `TAX_DOCUMENT`, fallos por realtime, Ajustes, borrar iMin.
3. Precuenta: `PRE_BILL`.

## Pendiente de verificar

- Si el renderer de iMin imprime el logo de la empresa; si lo imprime, hay que dibujarlo como imagen en ESC/POS.
- Que la impresora real imprima el QR nativo por ESC/POS; si no, se dibuja como imagen, igual que las comandas.
- Que `@@map` sobre el modelo y el enum no genere cambios en `prisma migrate diff`.
