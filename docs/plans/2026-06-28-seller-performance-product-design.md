# Producto: Reporte de Vendedores

## Contexto

El flujo actual permite asociar una venta a un vendedor mediante un codigo operativo durante el pago. Para el usuario de negocio, este dato representa al vendedor responsable de la venta. Ese dato resuelve la trazabilidad basica de "quien vendio", pero todavia no entrega la respuesta principal que necesita el cliente:

**cuantas ventas hizo cada vendedor y cuanto dinero vendio en un periodo.**

La funcionalidad debe evolucionar de ser un dato capturado en el pago a ser una dimension comercial dentro de reportes. El vendedor debe poder analizarse igual que hoy se analizan fechas, comprobantes, clientes o ventas.

## Objetivo De Producto

Permitir que duenios, administradores y supervisores puedan responder rapidamente:

- Cuanto vendio cada vendedor.
- Cuantas ventas hizo cada vendedor.
- Cual es el ranking de vendedores en un periodo.
- Que ventas explican el total de un vendedor.
- Que vendedor esta asociado a una venta especifica.
- Si existen ventas sin vendedor asignado que deban revisarse.

## Recomendacion Principal

Crear una vista principal de **Reporte de Vendedores** dentro del area de reportes.

Esta vista debe ser la fuente oficial para analizar performance por vendedor. Por ahora, el alcance queda concentrado en esta experiencia de reportes.

La regla de producto es simple: **performance de vendedores vive en reportes.**

## Jerarquia De Navegacion Recomendada

### Opcion Recomendada Para MVP

Agregar una pestana o vista dentro de **Reporte de ventas**:

- `Ventas`
- `Vendedores`

Esto mantiene el analisis en un solo lugar y evita crear una nueva seccion lateral antes de validar frecuencia de uso.

## Vista 1: Reporte De Vendedores

### Proposito

Mostrar el rendimiento comercial por vendedor en un rango de fechas.

### Usuario Principal

Administrador, duenio, gerente de tienda o supervisor que necesita revisar resultados y tomar decisiones.

### Jerarquia Visual

La pantalla debe leerse de arriba hacia abajo:

1. **Titulo y contexto del reporte**
   - Titulo: `Reporte de vendedores`
   - Subtitulo: `Ventas atribuidas por vendedor en el periodo seleccionado`

2. **Filtros**
   - Rango de fechas.
   - Vendedor.
   - Tipo de comprobante.
   - Estado de venta.
   - Cliente, como filtro avanzado.

3. **KPIs del periodo**
   - Total vendido.
   - Numero de ventas.
   - Ticket promedio.
   - Vendedores con ventas.
   - Vendedor con mayor venta del periodo.

4. **Ranking visual**
   - Barras horizontales con los vendedores top por monto vendido.
   - Debe mostrar nombre, monto y porcentaje de participacion.
   - Maximo 5 a 10 vendedores visibles para mantener lectura rapida.

5. **Tabla de vendedores**
   - Tabla completa, ordenada por total vendido de mayor a menor.
   - Debe ser la fuente precisa para revision y exportacion.

### Filtros Requeridos

**Rango de fechas**

Debe ser el filtro dominante. Valores rapidos recomendados:

- Hoy.
- Ayer.
- Ultimos 7 dias.
- Mes actual.
- Rango personalizado.

**Vendedor**

Debe permitir ver:

- Todos los vendedores.
- Un vendedor especifico.
- Vendedores activos.
- Vendedores inactivos con ventas historicas.
- Ventas sin vendedor asignado.

**Estado de venta**

Por defecto, el reporte debe mostrar ventas efectivas. Las ventas anuladas no deben inflar resultados comerciales.

Estados recomendados:

- Pagadas.
- Anuladas.
- Todas.

**Tipo de comprobante**

Debe mantener coherencia con el reporte de ventas:

- Nota de venta.
- Boleta.
- Factura.

### KPIs Principales

Los KPIs deben cambiar segun los filtros activos.

**Total vendido**

Monto total de ventas efectivas atribuidas a vendedores en el periodo.

**Ventas**

Cantidad de ventas efectivas en el periodo.

**Ticket promedio**

Total vendido dividido entre numero de ventas.

**Vendedores con ventas**

Cantidad de vendedores que registraron al menos una venta en el periodo.

**Top vendedor**

Vendedor con mayor total vendido en el periodo.

### Tabla Principal

Columnas recomendadas:

- Vendedor.
- Codigo.
- Estado.
- Ventas.
- Total vendido.
- Ticket promedio.
- Participacion del total.
- Anulaciones.
- Ultima venta.

### Ordenamiento Por Defecto

Ordenar por **Total vendido**, de mayor a menor.

El usuario debe poder ordenar tambien por:

- Ventas.
- Ticket promedio.
- Ultima venta.

### Acciones Por Vendedor

- Ver detalle.
- Ver ventas.
- Exportar reporte filtrado.

### Estado Vacio

Cuando no existan resultados:

`No hay ventas para los filtros seleccionados.`

Acciones visibles:

- Cambiar fechas.
- Limpiar filtros.

## Vista 2: Detalle De Vendedor

### Proposito

Permitir entender de donde sale el rendimiento de un vendedor especifico.

### Entrada

El usuario puede llegar desde:

- Ranking del Reporte de Vendedores.
- Tabla del Reporte de Vendedores.

### Jerarquia Visual

1. **Encabezado del vendedor**
   - Nombre.
   - Codigo.
   - Estado: activo o inactivo.
   - Periodo consultado.

2. **KPIs del vendedor**
   - Total vendido.
   - Ventas.
   - Ticket promedio.
   - Participacion sobre ventas totales.
   - Mejor dia del periodo.

3. **Tendencia**
   - Ventas por dia o por semana.
   - Debe ayudar a entender si el vendedor mantiene ritmo, tuvo picos o no vendio en ciertos dias.

4. **Lista de ventas del vendedor**
   - Fecha y hora.
   - Comprobante.
   - Cliente.
   - Total.
   - Metodo de pago.
   - Estado.
   - Accion para abrir venta.

5. **Analisis secundario**
   - Productos mas vendidos por el vendedor.
   - Clientes frecuentes atendidos por el vendedor.

### Alcance Recomendado

Para MVP, esta vista puede ser simple: encabezado, KPIs y lista de ventas. Tendencias y productos mas vendidos pueden quedar para una segunda fase.

## Estados Y Casos Especiales

### Ventas Sin Vendedor

Deben aparecer como una categoria propia: `Sin vendedor asignado`.

Esto permite detectar brechas de atribucion y evita esconder ventas no atribuibles.

### Vendedores Inactivos

Un vendedor inactivo debe seguir apareciendo en reportes historicos si tuvo ventas en el periodo consultado.

Debe mostrarse con etiqueta `Inactivo`, pero no debe eliminarse de resultados pasados.

### Ventas Anuladas

Por defecto, no deben sumar al total vendido.

Deben poder consultarse como:

- Metrica secundaria.
- Filtro.
- Columna de anulaciones en la tabla.

### Vendedores Sin Ventas

En el reporte principal, por defecto no deben ocupar espacio si no vendieron en el periodo. Debe existir una opcion para incluir vendedores sin ventas si el usuario quiere revisar actividad completa.

## Definicion De Metricas

**Venta**

Orden pagada atribuida a un vendedor.

**Total vendido**

Monto de ventas pagadas atribuidas al vendedor en el periodo.

**Ticket promedio**

Total vendido dividido entre numero de ventas.

**Participacion**

Porcentaje del total vendido del periodo que corresponde al vendedor.

**Ultima venta**

Fecha y hora de la venta mas reciente atribuida al vendedor.

**Ventas sin vendedor**

Ventas pagadas que no tienen vendedor asociado. Deben contarse por separado.

## Prioridad De Producto

### MVP

1. Reporte de Vendedores dentro de Reporte de ventas.
2. Filtro por fecha y vendedor.
3. KPIs: total vendido, ventas y ticket promedio.
4. Ranking por vendedor.
5. Tabla de vendedores con total vendido, ventas, ticket promedio y participacion.
6. Categoria `Sin vendedor asignado`.

### Fase 2

1. Detalle completo de vendedor.
2. Exportacion especifica del reporte por vendedor.
3. Productos mas vendidos por vendedor.
4. Comparacion contra periodo anterior.
5. Filtro por metodo de pago.
6. Vendedores sin ventas incluidos bajo demanda.

### Fuera Del MVP

1. Metas o cuotas por vendedor.
2. Comisiones automáticas.
3. Ranking gamificado.
4. Alertas automaticas.
5. Dashboard con multiples graficos avanzados.

Estas funcionalidades dependen de reglas comerciales mas especificas. Primero se debe resolver visibilidad, trazabilidad y lectura de performance.

## Criterios De Exito

La funcionalidad cumple su objetivo si el usuario puede:

- Ver en menos de un minuto cuanto vendio cada vendedor en un periodo.
- Identificar al vendedor con mayor venta.
- Abrir el detalle de ventas que componen el total de un vendedor.
- Filtrar ventas por vendedor.
- Detectar ventas sin vendedor asignado.

## Decision De Producto

La funcionalidad debe organizarse con esta jerarquia:

1. **Reporte de ventas** como contenedor principal.
2. **Reporte de Vendedores** como vista enfocada en performance por vendedor.
3. **Detalle de Vendedor** como profundizacion dentro del mismo reporte.

Esta organizacion mantiene el alcance concentrado en analisis comercial y da al cliente una respuesta clara a la pregunta principal: **quien vendio, cuantas ventas hizo y cuanto dinero vendio.**
