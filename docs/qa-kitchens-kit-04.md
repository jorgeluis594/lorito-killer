# QA KIT-04 — ejecución y recuperación de impresiones

Fecha: 2026-09-15

## Validación automatizada

- ESLint focalizado: aprobado.
- Vitest focalizado: 19 pruebas aprobadas en 5 archivos.
- Integración PostgreSQL: reserva concurrente por impresora, trabajo activo único por comanda, claim, reintento y conservación de bytes aprobados.
- TypeScript global: KIT-04 sin errores. El repositorio conserva tres errores previos ajenos en `.next/dev/types/validator.ts`, `src/lib/realtime/__TEST__/supabase-provider.test.ts` y `src/table/__TEST__/cancel-table-session.test.ts`.

## QA Playwright contra endpoints reales

- Trabajo no reclamado: `FAILED`, `attempts = 0`, fechas de claim/procesamiento limpias.
- Claim y claim repetido: HTTP 200, mismo `jobId`, `attemptNumber = 1`, impresora correcta y `contentBase64 = S0lULTA0LVFB`, igual a los bytes persistidos.
- Resultado `DELIVERED` y repetición: HTTP 200, un solo intento y respuesta limitada a identificadores, estado y calendario.
- Credencial inválida: HTTP 401 sin contenido del trabajo.
- Los fixtures fueron eliminados y el worker quedó activo.

## Pendiente físico

Pendiente validar con el cliente .NET y una impresora real que repetir el mismo intento no produzca otra ejecución local y que el papel respete los bytes ESC/POS. El simulador HTTP no acredita salida física.
