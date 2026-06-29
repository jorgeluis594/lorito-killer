# Documento de Producto: Dashboard
## Lorito Killer POS

**Fecha:** 2026-06-28  
**Estado:** Draft de producto  
**Audiencia:** Producto, diseno, negocio y stakeholders no tecnicos

---

## 1. Contexto

El dashboard actual muestra una plantilla generica con metricas como ingresos, suscripciones, ventas y actividad reciente. Esa informacion no representa las decisiones reales que toma un administrador, encargado o cajero dentro de Lorito Killer.

El nuevo dashboard debe convertirse en una vista operativa del negocio. Su funcion principal no es reemplazar reportes detallados, sino responder rapidamente:

1. Como va el negocio hoy.
2. Que requiere atencion inmediata.
3. Que esta explicando el resultado del dia: ventas, productos, horarios, caja, vendedores, mesas o medios de pago.

El dashboard debe usar lenguaje del negocio y evitar metricas decorativas. Cada bloque debe ayudar a tomar una decision o llevar al usuario a una accion concreta.

---

## 2. Objetivo del Dashboard

El dashboard V1 es la vista de control del rol `ADMIN`.

Debe permitir:

- Entender el rendimiento comercial del dia.
- Controlar caja y medios de pago.
- Detectar incidencias operativas antes del cierre.
- Ver pedidos abiertos o mesas activas sin confundirlos con ventas cobradas.
- Identificar productos con mayor movimiento y productos con stock en cero.
- Revisar ultimas ventas y operaciones recientes.
- Acceder rapidamente a reportes o vistas detalladas.

El dashboard V1 no se muestra a `CASHIER`, `SELLER`, `WAITER`, `KITCHEN` ni `BARTENDER`. Esos roles ingresan a sus flujos operativos.

---

## 3. Match con Roles Actuales

El dashboard V1 se asigna a un solo rol: `ADMIN`.

| Rol actual | Match de negocio | Comportamiento V1 |
|---|---|---|
| ADMIN | Dueno, administrador, gerente, encargado con responsabilidad de negocio, administrativo contable | Ve el dashboard completo |
| CASHIER | Cajero, supervisor de caja, encargado operativo de turno | No ve dashboard; ingresa a nueva venta y usa caja chica para operar su turno |
| SELLER | Vendedor de mostrador o vendedor identificado por codigo | No ve dashboard; ingresa a nueva venta |
| WAITER | Mozo / mesero | No ve dashboard; ingresa al flujo de toma de pedido |
| KITCHEN | Cocina | No ve dashboard; ingresa a la pantalla de cocina |
| BARTENDER | Barra | No ve dashboard; ingresa a la pantalla de barra |

### ADMIN

Es el principal usuario del dashboard. Agrupa los casos de dueno, administrador, encargado general y administrativo que necesita revisar el negocio.

Decisiones principales:

- Saber si el negocio esta vendiendo bien hoy.
- Revisar ventas, caja, comprobantes, stock y productos mas vendidos.
- Detectar descuentos, anulaciones o problemas de caja.
- Identificar incidencias antes del cierre.
- Ir al detalle de ventas, caja, stock o comprobantes.

### CASHIER

El cajero no necesita un dashboard ejecutivo completo. Su prioridad es operar rapido: vender, cobrar, emitir comprobantes y controlar su caja.

Comportamiento V1:

- Ingresa directamente a nueva venta.
- Controla su turno desde caja chica.
- No ve KPIs generales del negocio.
- No ve stock en cero, reportes globales ni alertas administrativas.

### SELLER

El vendedor no necesita una vista de dashboard. Su trabajo esta asociado a generar ventas y quedar atribuido en la operacion.

Comportamiento V1:

- Ir directamente a nueva venta.
- No mostrar KPIs, reportes, caja global, stock en cero ni alertas administrativas.

### WAITER

El mozo no necesita una vista de dashboard. Mostrarle KPIs o alertas administrativas agrega ruido y no ayuda a su trabajo diario.

Comportamiento V1:

- Ir directamente al flujo de mesa o toma de pedido.
- No mostrar dashboard, reportes, KPIs, caja ni resumen de negocio.

### KITCHEN y BARTENDER

Cocina y barra no necesitan dashboard. Sus pantallas deben ser operativas y enfocadas en comandas.

Comportamiento V1:

- `KITCHEN` ingresa a cocina.
- `BARTENDER` ingresa a barra.
- No mostrar dashboard, sidebar de gestion, reportes ni KPIs comerciales.

---

## 4. Decisiones Cerradas de V1

- El dashboard V1 se llama "Dashboard".
- El dashboard V1 solo lo ve `ADMIN`.
- `CASHIER` y `SELLER` entran a nueva venta.
- `WAITER` entra al flujo de toma de pedido.
- `KITCHEN` y `BARTENDER` no ven dashboard y entran a sus pantallas operativas.
- El periodo por defecto es "Hoy".
- Las ventas del dashboard son ventas cobradas, sin anulaciones.
- Los pedidos abiertos y mesas activas se muestran como operacion en curso, no como ventas.
- Empresas con restaurante habilitado muestran "Mesas activas".
- Empresas sin restaurante habilitado muestran "Pedidos abiertos".
- La caja abierta muestra efectivo esperado.
- La diferencia de caja solo aparece en cajas cerradas.
- Stock en cero V1 significa productos activos con stock igual a cero.
- Descuentos V1 muestra todos los descuentos aplicados del periodo.
- Anulaciones V1 muestra todas las anulaciones del periodo.
- V1 no muestra comparaciones contra periodos anteriores.
- V1 no muestra margen, clientes recurrentes, promociones ni comparativo entre locales.

---

## 5. Alcance V1

### Usuario V1

- `ADMIN`.

### Modulos V1

El dashboard V1 contiene estos modulos:

1. Encabezado con titulo, periodo, filtros, ultima actualizacion y accion "Nueva venta".
2. Tarjetas principales: ventas cobradas, numero de ventas, ticket promedio y estado de caja.
3. Alertas operativas: caja abierta sin cierre, pedidos abiertos/mesas activas, stock en cero, anulaciones y descuentos.
4. Grafico de ventas por hora.
5. Desglose de ventas por medio de pago.
6. Ranking de productos mas vendidos por monto.
7. Ranking de productos mas vendidos por cantidad.
8. Ultimas ventas.
9. Accesos rapidos.

### Accesos rapidos V1

El dashboard muestra estos accesos rapidos:

- Nueva venta.
- Reporte de ventas.
- Caja chica.
- Comprobantes de venta.
- Productos.
- Movimientos de stock.
- Mesas, solo para empresas con restaurante habilitado.

### Filtros V1

El dashboard V1 tiene estos filtros:

- Periodo: Hoy, Ayer, Ultimos 7 dias, Este mes, Personalizado.
- Caja: Todas las cajas, caja especifica.
- Vendedor: Todos los vendedores, vendedor especifico.

### Interacciones V1

- Click en ventas cobradas abre reporte de ventas filtrado por periodo.
- Click en estado de caja abre caja chica.
- Click en stock en cero abre productos filtrados por stock.
- Click en "Mesas activas" abre mesas.
- Click en "Pedidos abiertos" abre comprobantes de venta filtrados por ventas en curso.
- Click en anulaciones abre ventas filtradas por anuladas.
- Click en descuentos abre ventas con descuentos.
- El grafico de ventas por hora muestra monto y cantidad por hora.
- El dashboard tiene boton "Actualizar".
- El dashboard muestra "Ultima actualizacion: HH:mm".

---

## 6. Graficas V1

El dashboard V1 tiene cuatro graficas.

### Grafica 1: Evolucion de ventas cobradas

Tipo: barras verticales.

Muestra:

- Monto vendido.
- Cantidad de ventas.

Reglas:

- Si el periodo es "Hoy" o "Ayer", agrupa por hora.
- Si el periodo es "Ultimos 7 dias", "Este mes" o "Personalizado", agrupa por dia.
- No incluye ventas anuladas.
- No incluye pedidos abiertos.

Interaccion:

- Al pasar sobre una barra, muestra periodo, monto vendido y cantidad de ventas.
- Al hacer click, abre reporte de ventas filtrado por ese periodo.

### Grafica 2: Ventas por medio de pago

Tipo: barras horizontales.

Muestra:

- Efectivo.
- Tarjeta.
- Billetera digital.
- Otros medios disponibles.

Reglas:

- Cada barra muestra monto cobrado y porcentaje del total.
- No incluye ventas anuladas.
- No incluye pedidos abiertos.

Interaccion:

- Al hacer click en un medio de pago, abre reporte de ventas filtrado por ese medio.

### Grafica 3: Productos mas vendidos por monto

Tipo: barras horizontales.

Muestra:

- Top 10 productos por monto vendido.
- Monto vendido por producto.
- Cantidad vendida como dato secundario.

Reglas:

- No incluye ventas anuladas.
- Si no hay ventas, muestra estado vacio.

Interaccion:

- Al hacer click en un producto, abre reporte de ventas filtrado por producto.

### Grafica 4: Productos mas vendidos por cantidad

Tipo: barras horizontales.

Muestra:

- Top 10 productos por cantidad vendida.
- Cantidad vendida por producto.
- Monto vendido como dato secundario.

Reglas:

- No incluye ventas anuladas.
- Si no hay ventas, muestra estado vacio.

Interaccion:

- Al hacer click en un producto, abre reporte de ventas filtrado por producto.

---

## 7. Fuera de Alcance V1

No entra en V1:

- Dashboard para `CASHIER`.
- Dashboard para `SELLER`.
- Dashboard para `WAITER`.
- Dashboard para `KITCHEN`.
- Dashboard para `BARTENDER`.
- Comparaciones contra ayer, semana anterior o mes anterior.
- Margen estimado como KPI principal.
- Comparativo entre locales.
- Promociones como campanas.
- Devoluciones separadas de anulaciones.
- Clientes nuevos y recurrentes como dato principal.
- Ranking avanzado del equipo, comisiones o productividad detallada.
- Canales avanzados como delivery y para llevar.
- Umbrales configurables por producto.
- Reportes ejecutivos o exportaciones avanzadas desde el dashboard.

Estos puntos pasan a backlog y no bloquean el dashboard V1.

---

## 8. Backlog V2

Los siguientes puntos quedan fuera de V1:

- Desempeno completo por vendedor y cajero.
- Categorias mas vendidas.
- Clientes nuevos y recurrentes.
- Margen validado.
- Promociones y descuentos por campana.
- Comparativo entre locales.
- Canales de venta consolidados: salon, mostrador, delivery y para llevar.
- Umbrales configurables de stock bajo.
- Detalle avanzado desde cada KPI.
- Exportaciones y reportes ejecutivos.

---

## 9. Organizacion de la Vista V1

### Encabezado

El encabezado muestra:

- Titulo: "Dashboard".
- Periodo visible: por defecto "Hoy".
- Filtros: periodo, caja y vendedor.
- Ultima actualizacion con hora.
- Accion principal: "Nueva venta".

### Primera fila: KPIs principales

La primera fila contiene cuatro tarjetas:

1. Ventas cobradas.
2. Numero de ventas cobradas.
3. Ticket promedio.
4. Estado de caja.

Cada tarjeta muestra:

- Etiqueta clara.
- Valor principal.
- Contexto del periodo.

### Segunda fila: alertas operativas

La segunda fila muestra estas alertas:

- Caja abierta sin cierre.
- Pedidos abiertos o mesas activas.
- Stock en cero.
- Anulaciones.
- Descuentos.

Estados visuales:

- Rojo: caja cerrada con diferencia, stock en cero.
- Amarillo: caja abierta sin cierre, pedidos abiertos.
- Neutro: anulaciones y descuentos del periodo.

### Zona central

La zona central contiene:

- Grafico de ventas por hora.
- Desglose por medio de pago.
- Productos mas vendidos por monto.
- Productos mas vendidos por cantidad.

### Lateral o bloque secundario

El bloque secundario muestra:

- Ultimas ventas.
- Accesos rapidos a areas clave.

Las ultimas ventas muestran datos operativos: hora, monto, comprobante, vendedor, medio de pago y estado.

### Parte inferior

La parte inferior muestra:

- Stock en cero.
- Productos con mayor movimiento.
- Resumen de descuentos y anulaciones.

---

## 10. Definiciones de KPIs V1

| KPI | Definicion V1 | Destino al hacer click |
|---|---|---|
| Ventas cobradas | Suma de ventas pagadas del periodo, excluyendo anuladas | Reporte de ventas |
| Numero de ventas cobradas | Cantidad de ventas pagadas del periodo, excluyendo anuladas | Reporte de ventas |
| Ticket promedio | Ventas cobradas / numero de ventas cobradas | Reporte de ventas |
| Estado de caja | Abierta o cerrada; si esta abierta muestra efectivo esperado; si esta cerrada muestra diferencia | Caja chica |
| Ventas por medio de pago | Total cobrado por efectivo, tarjeta, billetera y otros medios existentes | Reporte de ventas |
| Cajas abiertas sin cierre | Cajas que siguen abiertas fuera del flujo normal de supervision | Caja chica |
| Mesas activas | Operaciones de salon en curso; no forman parte de ventas cobradas | Mesas |
| Pedidos abiertos | Operaciones en curso fuera del flujo de mesas; no forman parte de ventas cobradas | Comprobantes de venta |
| Stock en cero | Productos activos con stock igual a cero | Productos |
| Anulaciones | Cantidad y monto de ventas anuladas en el periodo | Reporte de ventas |
| Descuentos | Cantidad y monto de descuentos aplicados en el periodo | Reporte de ventas |
| Productos mas vendidos por monto | Ranking de productos por dinero vendido en el periodo | Reporte de ventas |
| Productos mas vendidos por cantidad | Ranking de productos por unidades vendidas en el periodo | Reporte de ventas |
| Ventas por hora | Ventas cobradas agrupadas por hora del dia | Reporte de ventas |
| Ultimas ventas | Lista de ventas recientes con hora, monto, comprobante, vendedor, medio de pago y estado | Detalle de venta |

---

## 11. Historias de Usuario

### Historia 1: Ver rendimiento del dia

Como `ADMIN`, quiero ver ventas cobradas, cantidad de ventas y ticket promedio para saber rapidamente como va el negocio hoy.

Criterios de aceptacion:

- El dashboard muestra ventas cobradas del dia.
- Muestra cantidad de ventas cobradas.
- Muestra ticket promedio.
- El periodo visible es claro.
- Los datos principales se entienden sin entrar a otro reporte.

### Historia 2: Controlar caja

Como `ADMIN`, quiero ver el estado de caja y los pagos por medio para detectar diferencias antes del cierre.

Criterios de aceptacion:

- Se muestra si la caja esta abierta o cerrada.
- En caja abierta se muestra efectivo esperado.
- En caja cerrada se muestra la diferencia.
- Se muestran ventas por medio de pago.
- Las alertas de caja aparecen en la primera vista.

### Historia 3: Distinguir ventas cobradas de operacion abierta

Como `ADMIN`, quiero ver pedidos abiertos y mesas activas sin que se mezclen con ventas cobradas.

Criterios de aceptacion:

- El dashboard muestra pedidos abiertos o mesas activas.
- Las ventas en curso estan separadas de las ventas cobradas.
- El `ADMIN` identifica rapidamente que requiere atencion.
- Los pedidos abiertos permiten ir al detalle correspondiente.

### Historia 4: Ver alertas criticas

Como `ADMIN`, quiero ver alertas importantes para resolver problemas antes de que afecten venta, caja o cierre.

Criterios de aceptacion:

- Se muestran alertas de stock en cero.
- Se muestran cajas abiertas sin cierre.
- Se muestran anulaciones o descuentos relevantes.
- Cada alerta indica una accion esperada.

### Historia 5: Entender que se esta vendiendo

Como `ADMIN`, quiero ver productos mas vendidos para tomar decisiones de compra, carta, promociones o reposicion.

Criterios de aceptacion:

- Se muestra ranking de productos por monto.
- Se muestra ranking de productos por cantidad.
- Los productos con stock en cero se destacan.
- El modulo permite ir al detalle de productos o ventas.

### Historia 6: Revisar ventas por hora

Como `ADMIN`, quiero ver en que horarios se concentra la venta para planificar personal y operacion.

Criterios de aceptacion:

- El dashboard muestra ventas por hora del dia.
- Se distinguen horas pico y horas bajas.
- La visualizacion es simple y accionable.
- El `ADMIN` ve monto y cantidad por hora.

### Historia 7: Ver ultimas ventas

Como `ADMIN`, quiero ver las ventas recientes para revisar actividad actual y detectar operaciones inusuales.

Criterios de aceptacion:

- La lista muestra hora, monto, comprobante, vendedor, medio de pago y estado.
- Las anulaciones o ventas pendientes se distinguen visualmente.
- La lista prioriza informacion operativa.
- Cada venta permite ir a su detalle.

### Historia 8: Navegar a detalle desde el resumen

Como `ADMIN`, quiero abrir el detalle desde cada KPI o alerta para investigar sin buscar manualmente en el menu.

Criterios de aceptacion:

- Cada KPI relevante tiene un destino de detalle.
- Cada alerta abre una vista filtrada o contextual.
- El dashboard mantiene accesos rapidos a nueva venta, caja, reportes, stock y comprobantes.

### Historia 9: Redirigir roles sin dashboard

Como usuario que no es `ADMIN`, quiero entrar directo a mi flujo operativo para trabajar sin ver KPIs que no necesito.

Criterios de aceptacion:

- `CASHIER` entra a nueva venta.
- `SELLER` entra a nueva venta.
- `WAITER` entra al flujo de toma de pedido.
- `KITCHEN` entra a cocina.
- `BARTENDER` entra a barra.
- Ninguno de estos roles ve el dashboard V1.

---

## 12. Estados de Producto V1

### Sin ventas

Texto:

"Aun no hay ventas en este periodo."

Acciones:

- Crear nueva venta.
- Cambiar periodo.

### Sin stock en cero

Texto:

"No hay productos con stock en cero."

Este estado no muestra alerta roja.

### Carga

La estructura del dashboard debe mantenerse visible mientras cargan datos:

- Bloques para KPIs.
- Espacios reservados para graficos.
- Espacios para listas.

### Error parcial

Si falla un modulo, no debe bloquear todo el dashboard.

Texto:

"No pudimos cargar este resumen. Reintenta en unos segundos."

---

## 13. Criterios de Exito

El dashboard sera exitoso si:

- El `ADMIN` entiende el estado del negocio en menos de un minuto.
- Las alertas criticas aparecen sin necesidad de navegar.
- Las ventas cobradas no se confunden con pedidos abiertos.
- Caja, pagos y comprobantes son faciles de revisar.
- El `ADMIN` pasa del resumen al detalle en un clic.
- La vista se siente especifica para un POS de tienda/restaurante, no como una plantilla generica.
- El dashboard ayuda a actuar durante el dia, no solo a revisar despues.

---

## 14. Recomendacion Final

La V1 reemplaza el dashboard generico por una vista "Hoy" exclusiva para `ADMIN`.

Orden de la vista:

1. KPIs principales: ventas cobradas, numero de ventas, ticket promedio, caja y medios de pago.
2. Alertas: caja abierta, pedidos abiertos, stock en cero, anulaciones y descuentos.
3. Explicacion del dia: ventas por hora, medios de pago y productos mas vendidos.
4. Actividad reciente: ultimas ventas y accesos rapidos.

Los roles sin dashboard entran a sus flujos operativos: nueva venta, toma de pedido, cocina o barra.
