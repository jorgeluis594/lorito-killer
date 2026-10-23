# Impresoras: estado actual

Todo sale por el **Print Gateway** (servicio Windows) a impresoras registradas. No hay impresión desde el navegador: iMin se eliminó.

| Qué imprime | Impresora | Sin impresora configurada |
|---|---|---|
| Comandas de cocina | La de cada `Kitchen` | No se imprime |
| Comprobantes (boleta, factura, nota de venta, notas de crédito) | Impresora de caja (`Company.cashierPrinterId`) | Abre el PDF de `/api/orders/[id]/documents` |
| Precuenta de mesa | Impresora de caja | Toast pidiendo configurarla |

## 1. Print Gateway + impresoras registradas

### Vinculación del equipo Windows
1. ADMIN genera un código de 4 dígitos en Ajustes → Impresión (`PrintClientLinkCode`, vence en 10 min).
2. El instalador `Kogoz.PrintGateway.exe` (`apps/print-gateway`) lo canjea en `POST /api/printing/clients/link` y guarda la credencial (`PrintClient`).
3. El Gateway reporta sus colas de Windows en `POST /api/printing/clients/printers` → se crean/actualizan `Printer` (único por `printClientId + localName`).
4. Un `PrintClient` puede revocarse (`revokedAt`); sus trabajos pendientes se marcan fallidos.

### Perfil de cada impresora (`Printer`)
`status` (ACTIVE/INACTIVE), `paperWidth` (58/80 mm), `columns`, `codepageMapping`, `cutEnabled`, `feedBeforeCut`. Se edita en `printer-profile-form.tsx`.

No se puede desactivar una impresora asignada a una cocina o como impresora de caja.

### Ajustes → Impresión
Disponible para todas las empresas. El ADMIN elige la **impresora de caja** (`company-printer-settings.tsx`, `setCompanyPrinter`); solo se listan impresoras activas y "Sin configurar" deja el campo en `null`. La sección de cocinas sigue exigiendo el módulo `restaurants`.

## 2. Cola polimórfica (`src/printing/jobs`)

`PrintJob` (tabla `KitchetTicketPrintJob`) apunta a su origen con `sourceType` + `sourceId`, sin FK. Al crear el trabajo se guarda un snapshot (`ticket`); los bytes se generan al tomarlo.

Cada tipo tiene una estrategia registrada en `printJobStrategies` (`strategies.ts`):

| `sourceType` | Estrategia | `sourceId` | Render | Intentos | Aviso de fallo |
|---|---|---|---|---|---|
| `KITCHEN_TICKET` | `src/kitchen/print-strategy.ts` | `KitchenTicket.id` | Imagen (`create-kitchen-ticket-content.tsx`) | `PRINT_JOB_MAX_ATTEMPTS` | `kitchen-admin` + `kitchen-user-<responsable>` |
| `TAX_DOCUMENT` | `src/document/print-strategy.ts` | `Document.id` | Texto + QR nativo ESC/POS | 3 | `print-user-<quien lo pidió>` |
| `PRE_BILL` | `src/table/print-strategy.ts` | `TableSession.id` | Texto ESC/POS | 3 | `print-user-<quien lo pidió>` + `print-user-<mozo>` |

- Comprobante y precuenta comparten `print-commands-to-escpos.ts` (`ReceiptPrinterEncoder` con el perfil de la impresora).
- `enqueuePrintJob` crea el trabajo, o devuelve el activo del mismo origen; si ya hubo uno, es reimpresión y vuelve a armar el snapshot con el estado actual.
- El Gateway recibe el aviso por realtime, toma el trabajo (`POST /api/printing/jobs/[jobId]/claim`), recibe los bytes y reporta el resultado (`POST .../result`: DELIVERED / RETRYABLE_FAILURE / FAILED).
- El worker (`process-print-jobs.ts`) reintenta y marca timeouts: `PRINT_JOB_TIMEOUT_MS` (10 s, sin reintento), `PRINT_JOB_RETRY_DELAYS_MS` (5 s, 15 s, 30 s).
- Al fallar definitivamente se publica `print-job-failed` en los canales de la estrategia; `PrintJobFailureListener` (layout del dashboard) muestra el toast. No hay toast de éxito.

## 3. Dónde se crean los trabajos

- **Comandas:** al enviar una ronda; reimpresión manual en `kitchen-attention-panel.tsx`.
- **Comprobantes:** `printTaxDocument(orderId)` desde el modal de pago, el cobro de mesa, el detalle de pedido y el reporte de ventas.
- **Precuenta** (módulo `restaurants`): automática cuando la mesa se envía a caja (`confirmTablePayment` con método `register`), y con el botón "Imprimir precuenta" de "Cobro de la cuenta" (`table-payment-view.tsx`, permiso `tables:update`). Imprime mesa, mozo, personas, hora, ítems, descuentos, total y "No valido como comprobante de pago". Si falla o no hay impresora, enviar a caja sigue funcionando.

## Pendiente

- Abrir el cajón de dinero desde la impresora de caja (comando ESC/POS).
- Una sola impresora de caja por empresa: límite para varias cajas o locales.
