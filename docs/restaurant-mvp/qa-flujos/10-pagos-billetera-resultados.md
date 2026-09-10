# QA GAP-10 — Datos de pagos por billetera

Fecha: 10 de septiembre de 2026 (America/Lima).
Resultado funcional: **PASS**. Gates globales: **bloqueos preexistentes**.

Se aplicó `qa-tester` con Playwright CLI y el diseño/plan aprobado por el usuario.
No se enviaron mensajes a Telegram; la autorización cubrió implementación y QA.

## Entorno y alcance

- Aplicación del directorio actual: `http://gap09-a.localhost:3000`.
- PostgreSQL local aislado `gap09-postgres` (55439) y Redis `gap09-redis` (56379),
  reutilizados del QA anterior. Usuarios y productos sintéticos.
- ADMIN, caja abierta desde el navegador, documentos Nota de Venta.
- Escritorio 1280 × 900 y móvil 390 × 844.
- Flujo de cobro existente en Nueva venta. GAP-10 agrega datos de billetera;
  no implementa un nuevo flujo de cobro o cierre de mesa.
- Billetera libre, código obligatorio, extremos recortados, referencias repetidas
  permitidas. Los límites son 80 y 100 caracteres respectivamente.

## Historia 1 — Registrar datos de billetera

Como cajero quiero identificar la billetera y operación del pago recibido.

| Caso | Resultado |
| --- | --- |
| Campos visibles y asociados a sus etiquetas | PASS. Billetera y código obligatorios. [Captura](gap10-evidencia/01-wallet-required.png). |
| Vacíos y espacios | PASS en navegador: no habilitan Realiza pago. PASS en servidor para omisión, null, vacío, espacios y tipos incorrectos. |
| Pago único | PASS: se ingresó `  Yape  ` y `  000GAP10-A  `, por S/ 10. [Formulario](gap10-evidencia/02-wallet-valid.png). PostgreSQL conserva `Yape` y `000GAP10-A`. |
| Límites | PASS automatizado: acepta 80/100, rechaza exceso. Navegador confirma maxlength 80/100; código es texto para conservar ceros iniciales. |
| Históricos incompletos | PASS automatizado: siguen siendo legibles sin lanzar errores. |

## Historia 2 — Combinar medios sin registros parciales

Como cajero quiero conservar la referencia cuando cobro efectivo y billetera juntos.

| Caso | Resultado |
| --- | --- |
| Combinado | PASS: S/ 6 efectivo y S/ 4 Plin con `000GAP10-B`, ambos en la misma venta. |
| Edición posterior de importes | PASS: tras cuadrar 6 + 4, cambiar a 5 + 4 deshabilita el pago y descarta el estado anterior; volver a 6 + 4 conserva billetera y código. |
| Validación del servidor | PASS: se interceptó el POST real del combinado y se reemplazó `000GAP10-B` por espacios. El servidor respondió “Ingrese el código de operación”. [Captura](gap10-evidencia/03-server-rejection.png). |
| Ausencia de pago parcial | PASS en PostgreSQL tras el rechazo: permanecieron exactamente una venta completada y un pago, ambos del caso anterior. [Estado](gap10-evidencia/rejected-payment-state.json). Los tests también verifican cero llamadas de escritura ante datos inválidos, incluso con efectivo primero. |
| Corrección y reintento | PASS: al enviar el código válido se creó la segunda venta con ambos pagos y montos intactos. [Base de datos](gap10-evidencia/database-verification.json). |
| Móvil | PASS: campos, importes y botón accesibles a 390 × 844. [Captura](gap10-evidencia/04-combined-mobile.png). |

## Historia 3 — Consultar referencias

Como administrador quiero consultar las referencias para conciliar las ventas.

| Caso | Resultado |
| --- | --- |
| Detalle de venta tras navegar | PASS: Plin / 000GAP10-B, efectivo S/ 6 y billetera S/ 4. [Captura](gap10-evidencia/05-sale-detail.png). |
| Reporte de ventas | PASS: aparecen las dos referencias. [Captura final](gap10-evidencia/07-report-pass.png). |
| Exportación real | PASS: clic en Exportar produjo HTTP 200 y un XLSX descargado por Playwright. La hoja “Pagos por billetera” contiene Yape S/ 10 y Plin S/ 4 con códigos de tipo texto. La hoja original de ventas se conserva. [Verificación](gap10-evidencia/export-verification.json). |
| Comprobante PDF | PASS: endpoint real HTTP 200 application/pdf; extracción de texto confirma Plin y 000GAP10-B; render revisado visualmente. [Imagen](gap10-evidencia/08-voucher.png). |
| Aislamiento de consulta | PASS automatizado: getMany filtra companyId y obtiene los pagos de los documentos seleccionados. No se agregó una consulta global de pagos. |

El primer intento del reporte detectó un import colocado antes de `"use client"`.
Se corrigió, se ejecutaron tests y lint, se hizo commit y se repitió el recorrido
con éxito. [Evidencia del fallo corregido](gap10-evidencia/06-report-before-fix.png).
La captura de la descarga requirió leer el archivo que Playwright guarda
automáticamente: el evento esperado en la pestaña original no se emitió porque
Exportar abre otra ventana. El endpoint y el archivo descargado sí se verificaron.

## Validación técnica

Tests y linter ejecutados antes de cada commit por concepto.

- 11 tests nuevos pasan: `src/order/__TEST__/wallet-payment.test.ts` y
  `src/document/__TEST__/wallet-report.test.ts`.
- Lint de todos los archivos de código cambiados: PASS.
- Suite global: 114 tests pasan, 5 fallan; 22 archivos pasan y 2 fallan.
  Los fallos previos corresponden a la exportación inexistente
  `createSupabaseRealtimeProvider` y al módulo `cancel-table-session` inexistente.
- Lint global: 15 errores y 4 advertencias preexistentes; mismo resultado inicial.
- Build: compila, pero TypeScript falla por el import previo de
  `@/shared/components/ui/alert` en `financial-block-notice.tsx`.
- La revisión TypeScript también identifica las dos suites previas inconsistentes;
  no identificó errores nuevos en los archivos de GAP-10.

Las imágenes de productos sin src y el intento de conexión a una impresora iMin
no instalada emitieron errores del entorno existente. Se verificó el comprobante
PDF de respaldo; no se da por probada una impresión física ni emisión tributaria.
No se necesita migración para GAP-10.
