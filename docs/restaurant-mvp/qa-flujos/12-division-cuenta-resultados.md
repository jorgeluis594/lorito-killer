# QA GAP-12 — División de cuenta

Fecha: 10 de septiembre de 2026 (America/Lima).
Resultado funcional: **PASS**. Gates globales: **bloqueos preexistentes**.

Se aplicó `qa-tester` con Playwright CLI sobre una instancia y PostgreSQL local
aislados.

## Entorno

- Aplicación: `http://gap09-a.localhost:4000`.
- PostgreSQL `gap09-postgres` en el puerto 55439 y Redis `gap09-redis` en 56379.
- Usuario ADMIN sintético con caja abierta y productos sintéticos.
- Escritorio 1280 × 720 y móvil 390 × 844.
- Documento: Nota de Venta.

## Resultados

| Criterio | Resultado |
| --- | --- |
| Aportes personalizados | PASS. El cajero puede agregar, editar y eliminar aportes con monto y medio de pago. |
| Partes iguales | PASS. S/ 10 entre tres produjo S/ 3.33, S/ 3.33 y S/ 3.34. [Captura](gap12-evidencia/03-cash-two-cards.png). |
| Efectivo y varias tarjetas | PASS. Se registró un aporte en efectivo y dos aportes separados con tarjeta de crédito. |
| Total cubierto y saldo | PASS. La pantalla mostró S/ 9.67 cubiertos y S/ 0.33 pendientes, con el cobro deshabilitado. [Captura](gap12-evidencia/04-pending-balance.png). |
| Exceso | PASS. S/ 10.67 mostró S/ 0.67 de exceso y mantuvo el cobro deshabilitado. |
| Billetera | PASS. Cada aporte puede usar billetera; nombre y código son obligatorios y su ausencia deshabilita el cobro. [Captura](gap12-evidencia/09-desktop-final.png). |
| Persistencia | PASS. PostgreSQL contiene una sola orden de S/ 10 con tres pagos: CASH 3.33, CREDIT_CARD 3.33 y CREDIT_CARD 3.34. |
| Venta y comprobante únicos | PASS. La operación generó exactamente una venta y un solo comprobante asociado. [Captura](gap12-evidencia/05-payment-success.png). |
| Fallo atómico | PASS automatizado. El servidor rechaza aportes vacíos, montos inválidos o una suma distinta al total antes de abrir la transacción. La transacción existente engloba venta, pagos, stock y comprobante. |
| Responsive | PASS. Las filas se apilan en móvil, eliminar queda alineado a la derecha y la acción de cobro permanece visible. [Captura](gap12-evidencia/10-mobile-final.png). |

## Validación técnica

- `src/order/__TEST__/split-payments.test.ts`: 10 tests PASS.
- Tests focalizados de división y billetera: 19 tests PASS.
- Lint focalizado de dominio, acciones, store y vistas GAP-12: PASS. El provider
  conserva dos errores `react-hooks/refs` preexistentes.
- Revisión visual Impeccable: PASS tras reservar espacio para el footer fijo.
- Suite global: 124 tests pasan y 5 fallan por las suites preexistentes de
  realtime y `cancel-table-session`.
- Lint global: conserva 15 errores y 4 advertencias preexistentes.
- TypeScript: conserva tres errores preexistentes: realtime,
  `financial-block-notice` y `cancel-table-session`; no aparecen errores de
  GAP-12.

No se validó una impresora iMin física. El intento de conexión del SDK agotó su
tiempo y el comprobante siguió la ruta PDF existente. Los errores por imágenes de
producto sin `src` también pertenecen a los fixtures existentes.
