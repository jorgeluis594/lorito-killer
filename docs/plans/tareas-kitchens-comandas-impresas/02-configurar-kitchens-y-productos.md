# KIT-02 — Configurar destinos y crear platos asignados

Estado: pendiente de implementación y pruebas.
Dependencias: [KIT-01](01-vincular-cliente-y-registrar-impresoras.md).
Fuente: [diseño — configuración, perfil, estados y DishProduct](../2026-09-13-kitchens-comandas-impresas-design.md).

## Flujo y resultado

El administrador crea una Kitchen con nombre propio, asigna opcionalmente una impresora y crea o edita un plato asociado. Puede cambiar el dispositivo sin editar los productos.

## Alcance

- Administración de Kitchens: nombre, estado y asignación exclusiva opcional; `getKitchens`, `createKitchen`, `updateKitchen`.
- Edición de perfil y estado mediante `updatePrinter` en `printing/clients/use-cases`.
- `Kitchen`, enums administrativos, `Product.kitchenId`, `ProductType.DISH`, restricciones y relaciones históricas.
- Contrato `DishProduct` en tipos, schemas, repositorio y formularios de creación/edición; selector opcional de Kitchen para productos.

## Fuera de alcance

Enviar rondas, imprimir, alertas, inventario para platos, perfiles por modelo, drivers propios y reglas de impresión de paquetes.

## Criterios de aceptación

1. Solo ADMIN configura Kitchens, impresoras y Kitchen de productos; las mutaciones validan empresa en servidor. Una Kitchen puede crearse sin impresora y se identifica como no configurada.
2. Solo se asignan Printers `ACTIVE` de la misma empresa y libres de otra Kitchen. `UNIQUE (printerId)` protege asignaciones simultáneas. Estar apagada, desconectada o ausente del inventario no bloquea la configuración.
3. Reemplazar o retirar una impresora modifica la asignación, sin cambiar `Product.kitchenId` ni destinos y bytes de trabajos históricos. No dispara impresiones pendientes.
4. Kitchen y Printer usan únicamente `ACTIVE`/`INACTIVE`, con `ACTIVE` inicial. Una Kitchen con productos activos no se desactiva; una Printer asignada tampoco. Las validaciones resisten cambios concurrentes y no modifican productos inactivos ni historial.
5. El selector de productos devuelve únicamente `id` y `name` de Kitchens activas de su empresa. Crear o editar acepta cero o una Kitchen activa y rechaza referencias ajenas/inactivas. La validación de producto no consulta impresoras ni conexión.
6. El perfil admite `MM58`/`MM80`, columnas positivas con valores iniciales 32/42 ajustables, mapping válido con `epson` inicial, corte booleano y avance entero no negativo. Entradas inválidas se rechazan antes de guardar.
7. Crear y editar `DishProduct` usa campos comunes y Kitchen opcional, sin mostrar ni enviar inventario. El repositorio traduce `DISH` ↔ `DishProductType` en lectura, creación y actualización; no devuelve tipos Prisma ni construye accidentalmente un `SingleProduct`.
8. Un `DISH` persiste `stock`, `unitType`, `purchasePrice`, `targetMovementProductId` y `targetMovementProductStock` en `NULL`. No se inventan valores de inventario y los otros tipos conservan su comportamiento.
9. Las relaciones con historial se conservan mediante desactivación y restricciones de eliminación, no cascadas. Las consultas administrativas pueden incluir inactivos.

## Prueba autónoma

**Preparación:** dos empresas, administrador y mozo, cliente e impresoras obtenidos por KIT-01 o fixture equivalente; una impresora ausente del último inventario. No requiere envíos.

**Recorrido:**

1. Crear «Parrilla» sin impresora y un plato asociado; recargar y editarlo sin campos de inventario.
2. Configurar una impresora ausente, cambiar su perfil, reemplazarla y retirarla. Confirmar que el producto sigue asociado a Parrilla.
3. Crear un producto sin Kitchen y probar selección ajena/inactiva mediante petición directa.
4. Intentar asignar la misma impresora a dos Kitchens simultáneamente y desactivar una Kitchen con producto activo o una Printer asignada.
5. Retirar asociaciones que bloquean la desactivación y comprobar estados, selector y reactivación. Probar valores inválidos del perfil y mutaciones por un mozo.
6. Leer/crear/actualizar un plato y un producto existente de otro tipo, verificando contrato y columnas persistidas. Comprobar que retirar asignaciones o desactivar entidades conserva los productos inactivos y referencias ya disponibles. La conservación de trabajos se comprueba con KIT-03/KIT-07 cuando esos modelos existan; no se necesitan fixtures de tablas futuras para cerrar esta tarea.

**Evidencia de cierre:** capturas de formularios y administración, pruebas de repositorio/validación y concurrencia real de asignación. No depende de KIT-03 para acreditar configuración.
