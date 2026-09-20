# Reporte de seguridad de migraciones — PR #106

- Fecha de revisión: 16 de septiembre de 2026.
- PR: [Implementar operación de restaurante y comandas impresas](https://github.com/jorgeluis594/lorito-killer/pull/106).
- Commit revisado: `1b45714e33509d99d2039ef6de54c8278bbf6bb2`.
- Base revisada: `377b1ea67ca0c8fca35c6d9b4d157f4124bfd726`.
- Dictamen: **no aprobar el despliegue automático en el estado revisado**.

## Qué falta hacer antes de desplegar

**Hay dos pendientes. B1 y B4 fueron corregidos y cubiertos con pruebas de regresión; B2 y B3 siguen abiertos.**

### 1. Corregir los totales de caja — RESUELTO

- **Problema corregido:** una venta anulada conserva su pago. La migración la marca como `PAID`, pero el cálculo actualizado de caja ya no la suma.
- **Ejemplo:** una venta de S/ 100 anulada antes no sumaba; con el PR puede agregar S/ 100 a los totales de caja.
- **Qué hacer:** corregir el filtro de `src/cash-shift/db_repository.ts` para excluir pedidos `CANCELLED`. Revisar tanto ventas anuladas antes de migrar como anulaciones realizadas después. Cambiar solo la migración no resuelve ambos casos.
- **Cómo comprobarlo:** probar una caja con una venta válida y otra anulada con pago. Solo la válida debe sumar en ventas, desgloses por medio de pago y cálculo del importe en caja. Comparar también una caja histórica antes y después.
- **Estado:** resuelto. El cálculo exige `paymentStatus = PAID` y excluye `status = CANCELLED`; la regresión está cubierta en `src/cash-shift/__TEST__/db_repository.test.ts`.

### 2. Corregir la etiqueta de ventas anuladas en el dashboard — RESUELTO

- **Qué fallaba:** ventas recientes comprobaba primero si el pedido estaba `PAID` y lo mostraba como “Completada”, incluso si estaba anulado.
- **Ejemplo:** una venta anulada con su pago conservado aparece como “Completada” en el dashboard, aunque su pedido siga `CANCELLED`.
- **Corrección:** `findRecentSales` deriva la etiqueta exclusivamente de `Order.status`: `COMPLETED` → “Completada”, `CANCELLED` → “Anulada” y `PENDING` → “Pendiente”. `paymentStatus` sigue reservado para caja y métricas.
- **Cómo comprobarlo:** la integración PostgreSQL `tests/integration/dashboard-recent-sales.test.ts` verifica los tres estados con `paymentStatus = PAID`.
- **Estado:** resuelto. Detalle y evidencia en B4.

### 3. Resolver cómo se harán las ventas durante el despliegue

- **Qué falla:** la migración clasifica los pagos existentes una sola vez. Si después la aplicación anterior registra una venta cobrada, el nuevo campo queda `PENDING`. La aplicación nueva puede excluirla de caja y dashboard y mostrarla pendiente.
- **Qué hacer:** definir y ensayar el procedimiento de transición. La opción más simple es pausar nuevas ventas, esperar que terminen las operaciones en curso, migrar, reemplazar las instancias anteriores, verificar y reabrir ventas. Si se necesita seguir vendiendo sin pausa, hace falta una solución de compatibilidad y reconciliación; el PR revisado no la demuestra.
- **Cómo comprobarlo:** ninguna venta normal cobrada durante la transición debe quedar mal clasificada ni desaparecer de los totales. Revisar la consulta de pagos con estado `PENDING` incluida más adelante y comparar caja y dashboard con los pagos registrados.
- **Estado:** pendiente de resolver operativamente o mediante código. No basta con ejecutar de nuevo la actualización mientras sigan escribiendo instancias antiguas. Detalle en B2.

### 4. Validar el código y ensayar la migración antes de producción

- **Qué falta en CI:** las pruebas de integración fallan por ausencia de `DATABASE_URL`; hay un test que importa un módulo inexistente y aparecen errores de conexión a Redis. El preview de Netlify también falló, pero no se confirmó su causa.
- **Qué hacer con las pruebas:** preparar una base aislada y los servicios necesarios, resolver el test roto y obtener pruebas pertinentes y build exitosos del commit final. Revisar el fallo de Netlify si se usa ese preview para aprobar el despliegue.
- **Qué hacer con la migración:** ejecutarla primero sobre una copia reciente y aislada de producción. Medir cuánto demora, comprobar el efecto de los bloqueos de índices y comparar registros, importes y totales antes y después. Disponer de un respaldo recuperable para el despliegue real.
- **Cómo comprobarlo:** build y pruebas satisfactorios, ensayo de migración exitoso, sin pérdida de registros ni cambios inesperados en importes o totales de ventas normales. Las pruebas deben incluir los casos de los puntos 1, 2 y 3.
- **Estado:** pendiente. Las 43 pruebas locales aprobadas son una validación parcial: no prueban por sí solas que estos problemas estén resueltos ni que la migración funcione sobre los datos de producción. Detalle en B3 y V1.

### Qué no hace falta hacer

No hace falta convertir rondas antiguas, reconstruir deliveries ni migrar cancelaciones históricas de restaurante: el usuario confirmó que no existen ventas ni clientes usando restaurante. Sí hacen falta las tablas nuevas para comenzar a usarlo. Los dos pendientes restantes siguen aplicando porque afectan a ventas normales, tablas compartidas o al despliegue.

**La salida esperada es concreta:** caja sin sumar anulaciones, dashboard con estados correctos, transición sin ventas cobradas mal clasificadas y un ensayo de despliegue satisfactorio. Hasta entonces, el reporte no recomienda desplegar.

## Alcance y límites

Se revisaron las seis migraciones nuevas, los cambios relacionados con pagos, anulaciones, caja y dashboard, los archivos de despliegue y los resultados de CI del commit indicado. La revisión se amplió con una comparación del flujo de venta normal frente a la base del PR, cuatro comprobaciones ejecutables de las expresiones de ambos commits y 43 pruebas existentes. No se ejecutaron migraciones, no se consultó producción ni se ensayó una restauración o migración sobre una copia de sus datos. Este reporte no certifica el estado real de la base ni constituye una auditoría completa del PR. La entrega es documental; no incluye correcciones de código.

Los hallazgos distinguen defectos confirmados en código, riesgos condicionados por la operación y validaciones pendientes. Las referencias de código enlazan al commit revisado para que el reporte siga siendo verificable si la rama cambia.

Contexto confirmado por el usuario: todavía no existe ninguna orden de venta de restaurante ni clientes usando esa funcionalidad. No se requiere convertir históricos de rondas, deliveries o cancelaciones de cocina, ni mantener compatibilidad con operaciones abiertas de restaurante. Las seis migraciones de estructura siguen siendo necesarias. Los riesgos siguientes afectan también a las ventas normales y sus tablas compartidas.

## Resumen de bloqueantes

| ID  | Prioridad   | Hallazgo                                                                                          | Condición para levantarlo                                                                                             |
| --- | ----------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| B1  | Alta        | Ventas anuladas con pagos se incluyen en los totales de caja                                      | Resuelto: se excluyen pedidos anulados y la regresión está cubierta                                                   |
| B2  | Alta        | Ventas de la versión anterior durante la transición pueden quedar pagadas pero marcadas `PENDING` | Garantizar una transición sin escrituras antiguas o implementar compatibilidad y reconciliación                       |
| B3  | Alta        | No hay validación satisfactoria del commit: CI y preview fallidos                                 | Resolver o aislar justificadamente los fallos y demostrar build y pruebas pertinentes exitosos                        |
| B4  | Media       | Las ventas anuladas con pagos aparecen como completadas en ventas recientes                       | Resuelto: la etiqueta se deriva de `Order.status` y la integración cubre `COMPLETED`, `CANCELLED` y `PENDING` pagadas |
| V1  | Condicional | Índices y actualización histórica sin medición sobre volumen real                                 | Ensayar con copia representativa y definir una ventana aceptable                                                      |

## Análisis validado del comportamiento de una venta normal

**Sí hay cambios que afectan a ventas normales.** No se limitan a restaurante: el nuevo `paymentStatus` se consume en caja y dashboard sin distinguir `orderType`. La ausencia de clientes de restaurante no evita estas regresiones.

Se considera venta normal el flujo de caja existente con productos simples, paquetes o servicios, sin platos `DISH`. La venta nueva cobrada por ese flujo se completa como antes y ahora también registra `PAID`. El problema aparece en anulaciones, clasificación de históricos y convivencia de versiones.

### Comparación ejecutada: base del PR frente al commit revisado

Se extrajeron directamente de ambos commits el predicado de inclusión en caja y la expresión que asigna el estado de ventas recientes. Se evaluaron con Node y aserciones, sin modificar archivos de código ni acceder a la base de datos. Todos los ejemplos se evaluaron como `RETAIL`; las expresiones actuales no consultan ese campo.

| Caso                                                                                         | Caja antes → después | Ventas recientes antes → después | Resultado                                                                             |
| -------------------------------------------------------------------------------------------- | -------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| Venta completada, con pago y `PAID`                                                          | Incluida → incluida  | Completada → completada          | Sin cambio en estos dos resultados                                                    |
| Venta anulada, conserva pago y queda `PAID`                                                  | Excluida → excluida  | Anulada → anulada                | B1 y B4 resueltos                                                                     |
| Venta completada con pago, creada por versión anterior después del backfill; queda `PENDING` | Incluida → excluida  | Completada → pendiente           | Regresión condicionada a la ventana de despliegue: B2                                 |
| Pedido `PENDING` con pago y `PAID`                                                           | Excluido → incluido  | Pendiente → completado           | Cambio semántico confirmado; no se comprobó que existan estos registros en producción |

La tercera fila también describe los resultados de un histórico `COMPLETED` que quede con `paymentStatus = PENDING` por no tener registros `Payment`. En ese caso, la pérdida de inclusión afecta al importe del pedido usado en el cálculo de caja y a métricas del dashboard; no significa que antes aportara a la suma de pagos si esos pagos no existían.

### Cambios y riesgos por parte del flujo

| Parte del flujo                           | Evidencia revisada                                                                                                                                          | Conclusión                                                                                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirmación de venta normal              | El modal sigue enviando `status: "completed"`; la acción conserva validación de empresa, caja, vendedor, descuentos y pagos                                 | No se identificó una regresión en la secuencia normal de confirmación                                                                                          |
| Registro de pagos                         | La creación conserva los pagos anidados y agrega `paymentStatus`; sin valor explícito `pending`, una venta con pagos queda `PAID`                           | La venta habitual nueva recibe el estado esperado; la versión anterior no conoce ese campo                                                                     |
| Importes y pagos combinados               | No hay cambios en `split-payments.ts` ni en `calculate-order-item-totals.ts`; sus pruebas pasan                                                             | No se identificó cambio en esas reglas de cálculo y validación                                                                                                 |
| Stock y comprobante                       | La acción mantiene la secuencia transaccional de pedido, actualización de stock, comprobante y despacho fiscal; no cambian los archivos de stock comparados | No se identificó una regresión en esa secuencia por el diff; no se ejecutó una venta completa contra servicios reales                                          |
| Anulación fiscal sin platos               | `canCancelOrder` conserva permiso, estado `completed`, comprobante `registered` y ventana de menos de 168 horas                                             | La elegibilidad normal continúa; el efecto posterior en caja y etiqueta sí cambia                                                                              |
| Venta con un plato `DISH`                 | La nueva restricción bloquea la anulación si está pagada y contiene un plato vigente, sin distinguir el canal del pedido                                    | Cambio intencional de alcance por producto; también alcanza una venta de mostrador si se le agrega un plato. No afecta al histórico confirmado sin restaurante |
| Totales de caja                           | Se exige `PAID` y se excluye `CANCELLED`                                                                                                                    | B1 resuelto; los pedidos pagados no anulados se contabilizan                                                                                                   |
| KPIs, tendencias y efectivo del dashboard | Se sustituye `COMPLETED` por `PAID` excluyendo `CANCELLED`                                                                                                  | Ventas normales completas y bien clasificadas mantienen inclusión; casos de transición o históricos atípicos pueden cambiar resultados                         |
| Ventas recientes                          | La etiqueta se deriva exclusivamente de `Order.status`                                                                                                      | B4 resuelto; `paymentStatus` no decide la etiqueta                                                                                                             |
| Reportes de ventas y vendedores           | Los filtros de pagadas en `document/db_repository.ts` y `sale_report/db_repository.ts` siguen usando `COMPLETED`                                            | Una venta normal completa que quede `paymentStatus = PENDING` puede seguir en esos reportes y desaparecer del dashboard/caja                                   |

Las diferencias de clasificación no modifican por sí mismas el importe guardado de una venta ni eliminan su pago. Cambian su inclusión en cálculos y su estado visible, con riesgo de descuadres operativos y lecturas contradictorias.

### Evidencia adicional del flujo normal

- [Confirmación desde el modal de pago](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/src/new-order/components/create-order-modal/payment-modal.tsx).
- [Acción de creación y secuencia transaccional](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/src/order/actions.ts).
- [Asignación de paymentStatus al crear](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/src/order/db_repository.ts#L235-L261).
- [Elegibilidad de anulación](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/src/order/use-cases/can-cancel-order.ts).
- [Filtro de reportes por comprobantes](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/src/document/db_repository.ts#L288-L298) y [reporte de vendedores](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/src/sale_report/db_repository.ts).

### Validación local y sus límites

Resultado: **7 archivos de pruebas aprobados, 43 pruebas aprobadas**. Se ejecutó:

```sh
npm test -- \
  src/order/__TEST__/can-cancel-order.test.ts \
  src/order/__TEST__/cancellation-eligibility-repositories.test.ts \
  src/order/__TEST__/split-payments.test.ts \
  src/order/__TEST__/calculate-order-item-totals.test.ts \
  src/order/__TEST__/wallet-payment.test.ts \
  src/dashboard/__TEST__/calculate-dashboard-summary.test.ts \
  src/cash-shift/__TEST__/db_repository.test.ts
```

Estas pruebas existentes cubren reglas puntuales y repositorios con dobles de prueba. La nueva integración PostgreSQL cubre la clasificación de ventas recientes con los tres estados operativos y `paymentStatus = PAID`; no resuelve B2 ni sustituye el build y las pruebas de CI descritas en B3. Las cuatro comparaciones adicionales verificaron expresiones reales de ambos commits y confirmaron los resultados de la tabla; no fueron una prueba de migración SQL ni una prueba de extremo a extremo.

## Inventario de migraciones

Todas están bajo `prisma/migrations/` y terminan en `migration.sql`.

| Directorio                                                 | Cambios principales                                                                      | Efecto sobre datos existentes                                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `20260915000000_add_print_clients_and_printers`            | Clientes de impresión, códigos de vinculación, impresoras, enums, índices y relaciones   | Crea tablas nuevas; no modifica registros históricos                                         |
| `20260915120000_add_kitchens_and_dish_products`            | Cocinas, valor `DISH`, columna nullable `Product.kitchenId`, índice y relación           | Los productos existentes quedan sin cocina; no se convierten automáticamente a platos        |
| `20260915180000_add_order_rounds_and_kitchen_tickets`      | Rondas, líneas de ronda, comandas y trabajos de impresión                                | Crea tablas vacías para comenzar a operar restaurante                                        |
| `20260915190000_add_delivery_lifecycle`                    | Ciclo de delivery, restricciones de auditoría e índice sobre `Order`                     | Crea la tabla de delivery e indexa pedidos existentes                                        |
| `20260915210000_coordinate_kitchen_print_jobs`             | Índices de coordinación y unicidad parcial de trabajos activos                           | Agrega restricciones a la tabla nueva de trabajos de impresión                               |
| `20260915230000_add_item_cancellations_and_payment_status` | `Order.paymentStatus`, actualización histórica, cancelaciones e índice sobre `OrderItem` | Agrega `PENDING` por defecto y cambia a `PAID` todos los pedidos que tengan al menos un pago |

No se encontraron `DROP TABLE`, `DROP COLUMN`, `DELETE` ni `TRUNCATE` en estas seis migraciones. El riesgo principal identificado es de clasificación y contabilización incorrecta, no de eliminación explícita de datos.

## B1 — Las ventas anuladas vuelven a contar en caja

**Estado: RESUELTO en código y cubierto por prueba de regresión; cantidad de registros afectados en producción desconocida.**

La migración de pagos utiliza esta condición:

```sql
UPDATE "Order" o
SET "paymentStatus" = 'PAID'
WHERE EXISTS (SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id);
```

Incluye pedidos `CANCELLED` que conservan sus pagos. Conservar el pago histórico no es por sí mismo un error: el problema estaba en el nuevo consumidor del estado. El cálculo de caja ahora exige `paymentStatus === "PAID"` y excluye `status === "CANCELLED"`.

El flujo de anulación revisado cambia el estado del pedido a `CANCELLED`, pero no elimina los pagos ni cambia `paymentStatus`. Por tanto, el defecto también puede aparecer con anulaciones posteriores al despliegue; corregir únicamente la actualización histórica no lo resuelve.

### Impacto

- Una venta anulada de S/ 100 con un pago conservado puede sumar S/ 100 a los totales calculados de caja.
- Afecta `totalSales`, los desgloses por medio de pago y el cálculo de `amountInCashRegister`.
- Puede alterar la visualización de cajas históricas porque esos valores se recalculan; no implica que la migración sobrescriba el `finalAmount` guardado.
- Los agregados del dashboard sí excluyen `CANCELLED`, de modo que caja y dashboard pueden mostrar resultados distintos. La etiqueta de ventas recientes se corrigió y se documenta en B4.

### Corrección aplicada

El cálculo de caja excluye `CANCELLED` además de exigir `PAID`. La prueba de regresión incluye ventas `COMPLETED` y `PENDING` pagadas, y una venta pagada anulada; verifica que solo las dos primeras aportan a ventas, importe en caja y desgloses por medio de pago. Se mantiene la separación entre estado operativo y estado de pago: en el nuevo flujo de restaurante, cobrar no completa el pedido, por lo que volver a exigir `COMPLETED` excluiría ventas pagadas válidas.

### Evidencia

- [Actualización histórica de pagos, líneas 3–7](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/prisma/migrations/20260915230000_add_item_cancellations_and_payment_status/migration.sql#L3-L7).
- [Filtro y totales de caja, líneas 198–253](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/src/cash-shift/db_repository.ts#L198-L253).
- [Flujo de anulación](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/src/order/use-cases/cancel.ts).
- [Persistencia del estado de anulación](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/src/order/db_repository.ts#L497-L504).
- [Filtro del dashboard](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/src/dashboard/db_repository.ts#L77-L83).

## B2 — Ventana de inconsistencia durante el despliegue

**Estado: riesgo confirmado por compatibilidad del código; depende de que continúen escrituras de la versión anterior.**

La columna nueva tiene valor predeterminado `PENDING`. La actualización a `PAID` se ejecuta una vez durante la migración. La versión anterior crea ventas y pagos sin conocer esa columna.

### Secuencia que produce el problema

1. Se ejecuta la migración y se clasifican los pagos existentes.
2. La aplicación anterior continúa atendiendo o termina una operación que estaba en curso.
3. Registra una venta pagada, pero la columna nueva queda en `PENDING`.
4. Entra la aplicación nueva, cuyos cálculos requieren `PAID`.
5. La venta y su pago existen, pero quedan excluidos de los totales correspondientes.

El repositorio prevé migraciones en un hook previo al despliegue de Coolify. Ese archivo no demuestra que producción detenga o drene todas las instancias anteriores. Además, `npm run build` ejecuta las migraciones antes del build; si se usa ese camino y el build falla, la base puede quedar migrada mientras continúa la aplicación anterior. El Dockerfile utiliza `build:dev` y delega la migración al hook.

### Resolución requerida

La alternativa operativa más simple es una ventana de mantenimiento: impedir nuevas escrituras, esperar que terminen las operaciones en curso, ejecutar la migración, reemplazar todas las instancias correspondientes, validar y recién reabrir ventas. Si se necesita despliegue sin pausa, diseñar compatibilidad temporal y una reconciliación después de retirar todos los escritores antiguos.

Un segundo `UPDATE` mientras siguen operando instancias antiguas no cierra definitivamente la ventana. También debe contemplarse este riesgo si se revierte la aplicación a la versión anterior.

### Evidencia

- [Creación de ventas en la base del PR](https://github.com/jorgeluis594/lorito-killer/blob/377b1ea67ca0c8fca35c6d9b4d157f4124bfd726/src/order/db_repository.ts#L220-L246).
- [Migración de estado de pago](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/prisma/migrations/20260915230000_add_item_cancellations_and_payment_status/migration.sql#L1-L7).
- [Hook de migración](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/scripts/migrate.sh).
- [Scripts de build](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/package.json) y [Dockerfile](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/Dockerfile).

## B3 — Validación del despliegue incompleta

**Estado: fallos observados en CI; no equivalen a prueba de que el SQL sea inválido.**

La ejecución revisada reportó 50 archivos de pruebas aprobados y 5 fallidos; 249 pruebas aprobadas y 9 omitidas.

- Cuatro archivos de integración fallan por ausencia de `DATABASE_URL`: `fulfillment-order`, `kitchen-configuration`, `kitchen-print-job-coordination` y `send-order-round`.
- `src/table/__TEST__/cancel-table-session.test.ts` importa un módulo inexistente. Este problema ya está presente en la base del PR y no debe atribuirse como regresión introducida por estas migraciones.
- También aparecen errores de conexión a Redis en el log.
- El preview de Netlify figura fallido. No se revisó su log, por lo que no se atribuye una causa ni se afirma que producción vaya a fallar por el mismo motivo.

### Resolución requerida

Ejecutar las pruebas de integración en una base aislada con las migraciones aplicadas y los servicios necesarios. Resolver el test que importa el módulo ausente y obtener un build exitoso del commit a desplegar. Confirmar el motivo del fallo del preview si ese entorno forma parte de la validación utilizada para aprobar producción.

Evidencia: [CI del commit revisado](https://github.com/jorgeluis594/lorito-killer/actions/runs/35158138670) y [preview fallido](https://app.netlify.com/projects/kogoz/deploys/6aab18e22f24c200089dbc1c).

## B4 — Una venta normal anulada aparece como completada — RESUELTO

**Estado: RESUELTO en código y cubierto por una integración PostgreSQL.**

En `findRecentSales`, la etiqueta se deriva exclusivamente de `Order.status`: `COMPLETED` se muestra como “Completada”, `CANCELLED` como “Anulada” y `PENDING` como “Pendiente”. `paymentStatus` continúa disponible para caja y métricas, pero no decide la etiqueta visual.

La integración `tests/integration/dashboard-recent-sales.test.ts` crea órdenes `COMPLETED`, `CANCELLED` y `PENDING`, todas con `paymentStatus = PAID`, y verifica que las etiquetas internas resulten `completed`, `cancelled` y `pending`. Esto cubre una venta normal anulada que conserva sus pagos y no depende de que existan pedidos de restaurante.

La corrección es visual en la lista de ventas recientes: no cambia el documento fiscal ni los agregados del dashboard. El estado mostrado ahora coincide con el estado operativo del pedido, aunque conserve un pago.

Evidencia: [clasificación de ventas recientes](https://github.com/jorgeluis594/lorito-killer/blob/1b45714e33509d99d2039ef6de54c8278bbf6bb2/src/dashboard/db_repository.ts#L513-L521).

## V1 — Bloqueos y costo de la migración

Se crean índices sin `CONCURRENTLY` sobre tablas existentes:

- `Product(kitchenId)`.
- `Order(companyId, orderType, createdAt)`.
- `OrderItem(orderId, productId)`.

PostgreSQL bloquea escrituras durante la construcción normal de un índice. El efecto puede ser breve en tablas pequeñas o perceptible bajo mayor volumen y carga. La actualización histórica también modifica todos los pedidos con pagos y debe medirse sobre datos representativos. No se conoce aquí el tamaño de esas tablas ni la duración esperada.

No se exige cambiar automáticamente los índices a concurrentes: primero se debe medir si caben en la ventana de mantenimiento. Si no caben, preparar y probar otra estrategia de creación de índices.

Referencia: [PostgreSQL — creación concurrente de índices y bloqueo de escrituras](https://www.postgresql.org/docs/current/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY).

## Verificaciones de datos propuestas

Las siguientes consultas son de solo lectura y **no fueron ejecutadas**. Deben revisarse y ejecutarse en el entorno objetivo por quien opere la migración. Sus resultados son candidatos a inspección, no instrucciones de corrección automática.

### Antes de migrar

```sql
-- Anulaciones con pagos: población potencialmente afectada por B1.
SELECT COUNT(*) AS cancelled_orders_with_payments
FROM "Order" o
WHERE o.status = 'CANCELLED'
  AND EXISTS (SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id);

-- Casos históricos que la migración dejaría como PENDING.
SELECT COUNT(*) AS completed_orders_without_payments
FROM "Order" o
WHERE o.status = 'COMPLETED'
  AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id);

-- La migración usa existencia de pagos, no validación del importe total.
SELECT o.status, COUNT(*) AS orders_with_payment_total_mismatch
FROM "Order" o
JOIN (
  SELECT "orderId", SUM(amount) AS amount
  FROM "Payment"
  GROUP BY "orderId"
) p ON p."orderId" = o.id
WHERE p.amount <> o.total
GROUP BY o.status;
```

Si existen pagos parciales o datos inconsistentes en las ventas normales, la regla de marcar `PAID` por mera existencia de un pago requiere revisión antes de aplicarla.

### Después de migrar y retirar los escritores antiguos

```sql
-- Detecta candidatos a la inconsistencia descrita en B2.
SELECT o.status, COUNT(*) AS pending_orders_with_payments
FROM "Order" o
WHERE o."paymentStatus" = 'PENDING'
  AND EXISTS (SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id)
GROUP BY o.status;
```

En un ensayo sin ventas nuevas, comparar conteos de pedidos, líneas y pagos, importes y totales por caja antes y después. La migración debe conservar esos registros e importes. Con B1 corregido, los pedidos anulados deben seguir excluidos de los totales pertinentes.

## Condiciones de salida y secuencia propuesta

- [x] Corregir B1 y ejecutar su prueba de regresión.
- [x] Corregir B4 y verificar las etiquetas de órdenes `COMPLETED`, `CANCELLED` y `PENDING` que conservan `paymentStatus = PAID`.
- [ ] Revisar anomalías de pagos antes de aceptar la regla de clasificación histórica.
- [ ] Obtener build y pruebas pertinentes satisfactorios del commit final.
- [ ] Ensayar las seis migraciones sobre una copia reciente y aislada de producción; medir duración y comparar datos y totales.
- [ ] Confirmar que la base objetivo tiene el historial esperado y no hay migraciones fallidas pendientes ni cambios manuales incompatibles.
- [ ] Disponer de un respaldo recuperable y un procedimiento de recuperación probado.
- [ ] Definir la pausa de escrituras y el drenaje de operaciones, o la estrategia alternativa que resuelva B2.
- [ ] Ejecutar las migraciones y actualizar aplicación y worker en el orden probado, sin habilitar consumidores nuevos antes de que exista el esquema requerido.
- [ ] Validar estado de pagos, exclusión de anulaciones, totales de caja y dashboard, y una venta y anulación de prueba controladas antes de dar por terminado el despliegue.

## Recuperación

Volver a desplegar la aplicación anterior no revierte los datos ni elimina las estructuras agregadas. Además, reintroduce escritores que no mantienen `paymentStatus`, por lo que debe contemplarse una reconciliación antes de regresar a la versión nueva.

Ante un fallo, detener escrituras si existe riesgo de inconsistencia, registrar qué migraciones y versión quedaron activas y evaluar una corrección hacia adelante. No eliminar tablas o marcar migraciones como resueltas sin comprobar el estado real. Restaurar un respaldo puede perder operaciones posteriores al respaldo; requiere un plan explícito para conservar o recuperar esas operaciones.

## Dictamen final

Las migraciones son principalmente aditivas y no contienen eliminación explícita de datos. La revisión no encontró cambios en las reglas habituales de cálculo de importes, validación de pagos y elegibilidad de anulación de ventas sin platos, pero sí confirmó cambios en la contabilización y presentación de ventas normales. B1 está resuelto en código y cubierto por una prueba de regresión: una venta anulada con pago queda excluida de caja. B4 está resuelto: la etiqueta de ventas recientes se deriva exclusivamente de `Order.status`, con cobertura PostgreSQL para los tres estados aunque `paymentStatus` sea `PAID`. B2 sigue abierto por el riesgo de transición y B3 por la validación incompleta. Por ello el dictamen general continúa sin aprobar el despliegue automático.
