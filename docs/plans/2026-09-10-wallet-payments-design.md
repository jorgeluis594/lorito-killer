# GAP-10 — Datos de pagos por billetera

Diseño y QA aprobados por el usuario.

- Nombre de billetera en texto libre (1–80 caracteres) y código de operación
  obligatorio (1–100 caracteres). Recortar extremos en servidor, conservar ceros
  iniciales. Se permiten referencias repetidas: no se ha definido una clave
  única por proveedor.
- Reutilizar `Payment.data.name` y `Payment.data.operationCode`; sin migración.
  Los pagos históricos incompletos siguen siendo consultables.
- Validar todos los pagos antes de escribir la venta para que una billetera
  inválida no registre parte de un pago combinado.
- Capturar los mismos datos en pago único y combinado. Mostrar nombre y código
  en detalle, comprobante y reporte de ventas; incluirlos en Excel.
- QA: pago único, combinado, espacios, campos vacíos, límites, persistencia,
  detalle/reporte/exportación y formulario móvil. Datos sintéticos locales.

## Grupos de implementación y commits

1. Diseño (este documento).
2. Validación y persistencia con pruebas de rechazo sin escrituras.
3. Captura en el formulario y consulta en detalle, comprobante y reportes.
4. Evidencia QA y actualización de pendientes.

Ejecutar tests y lint antes de cada commit. Registrar fallos preexistentes
separadamente: suite realtime y cancelación, 15 errores globales de lint y build
bloqueado por el import de `ui/alert` en `financial-block-notice.tsx`.
