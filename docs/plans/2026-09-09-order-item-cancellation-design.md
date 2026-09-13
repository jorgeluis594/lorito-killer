# Cancelación de productos antes de Cocina

## Decisión

Cada `OrderItem` tendrá un estado operativo propio. Una línea nueva nace en
`PENDING`; Cocina puede tomarla y moverla a `PREPARING`; Salón solo puede
cancelarla mientras siga en `PENDING`.

## Flujo

- Salón selecciona una línea enviada pendiente e ingresa un motivo obligatorio.
- El servidor valida usuario, empresa, sesión abierta y estado `PENDING`.
- Una actualización condicional cambia la línea a `CANCELLED`, registra usuario,
  fecha y motivo, y recalcula los totales vigentes de la orden en la misma
  transacción.
- Si Cocina tomó la línea o otra solicitud ya la canceló, la operación no cambia
  datos y devuelve un error de negocio.
- Cocina ve las líneas pendientes y dispone de una acción para tomarlas. Las
  canceladas permanecen visibles como historial.

## Alcance mínimo

La cancelación es por línea completa. No se implementa cantidad parcial porque
la regla solicitada habla de cancelar un producto y el modelo actual agrupa cada
producto enviado en una línea. Si se necesita cancelación parcial, deberá
registrarse cantidad cancelada y recalcular descuentos proporcionalmente.

## Validación

Pruebas unitarias cubrirán motivo recortado, transición permitida, rechazo cuando
el producto ya fue tomado y convergencia ante solicitudes repetidas. Se ejecutará
la prueba focalizada, Prisma generate, lint de los archivos modificados y build.
