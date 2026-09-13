# Brechas obligatorias del flujo de restaurante

## Alcance

- Mostrar “Mesas y zonas” en Configuración solo a administradores cuando `restaurants` esté habilitado.
- Enlazar el panel de una mesa ocupada con la ruta existente del pedido completo.
- Permitir observaciones opcionales por producto y enviarlas como `notes`.
- Exigir y conservar un motivo de cancelación de sesión, recortado, no vacío y de hasta 500 caracteres.
- Mostrar el contenido real del pedido: producto, cantidad, precio unitario, subtotal, observación y total.

## Diseño

Extender los componentes y repositorios actuales de `table`; no crear un dominio nuevo. La consulta de mesas incluirá los datos mínimos de cada ítem y el mapper conservará la orden en `TableSession`. El carrito reutilizará `Input` para las observaciones. La cancelación reutilizará el flujo existente, añadiendo `TableSession.cancellationReason`, validación Zod y un único argumento obligatorio cuando `cancelled` sea verdadero.

La navegación de Configuración reutilizará la sesión y el proveedor existente de feature flags. Los enlaces al pedido reutilizarán `/dashboard/tables/[tableId]/order`.

## Validación

Agregar pruebas unitarias pequeñas para la regla de cancelación y ejecutar las pruebas relacionadas, lint y build de desarrollo. No se incorporarán dependencias ni abstracciones nuevas.
