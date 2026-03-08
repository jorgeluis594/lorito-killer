# Documento de Producto: MVP Restaurantes y Bares
## Lorito Killer POS — Vertical Restaurantes

**Version:** 1.0
**Fecha:** 2026-03-07
**Estado:** Draft para revision de desarrollo
**Rama base:** `hide-products` (commit `810d8d6`)

---

## 1. Vision del Producto

### Problema que resuelve

Los restaurantes y bares en Peru operan con procesos manuales o sistemas fragmentados que generan fricciones operativas criticas:

- Los mozos toman pedidos en papel y los llevan fisicamente a cocina, generando errores de transcripcion y tiempos muertos.
- No existe visibilidad en tiempo real del estado de las mesas, generando confusion en sala y duplicacion de esfuerzo del cajero.
- La cocina no sabe que pedidos priorizar ni cuales llevan mas tiempo esperando.
- Dividir cuentas o gestionar multiples metodos de pago por mesa es manual y propenso a errores.
- Los duenos no tienen reportes confiables de ventas por mozo, por turno o por plato para tomar decisiones de negocio.

El sistema actual de Lorito Killer resuelve el problema de retail (venta directa en caja), pero carece del flujo de trabajo de restaurante: mesa → pedido → cocina → cuenta → pago. Esta expansion agrega esa capa sin reescribir el nucleo existente.

### Diferencias clave: Restaurante vs Retail

| Dimension | Retail (actual) | Restaurante |
|-----------|----------------|-------------|
| Orden | Cerrada al momento de crear | Abierta (se agrega items en el tiempo) |
| Producto | Fisico, con stock | Plato/bebida preparado al momento |
| Tiempo | Transaccion instantanea | Ciclo de vida de 30-120 minutos |
| Personal | Cajero principalmente | Mozo, cocinero, bartender, cajero |
| Cobro | Al inicio | Al final del consumo |
| Comanda | No aplica | Esencial: instruccion a cocina/barra |
| Mesa | No aplica | Unidad operativa central |
| Delivery | No aplica | Canal adicional importante |

### Propuesta de valor

**Para el dueno/administrador:** Control total del negocio desde un panel unificado. Reportes de ventas por mozo, por plato y por turno. Cierre de caja con detalle completo.

**Para el cajero:** Vision de todas las mesas en tiempo real, estado de cada pedido, y capacidad de cobrar y emitir comprobantes (boleta/factura/ticket) desde el mismo sistema ya existente.

**Para el mozo:** Tomar pedidos en tablet o celular por mesa, enviar directamente a cocina, recibir notificacion cuando el pedido esta listo. Sin papel, sin viajes innecesarios.

**Para la cocina:** Pantalla dedicada con los pedidos entrantes ordenados por tiempo, con capacidad de marcar estados sin necesidad de interfaz compleja.

### Usuarios objetivo

**Segmento primario:**
- Restaurantes de 5 a 50 mesas en Peru (categoria mediana)
- Bares y cevicherias con operacion de sala
- Dark kitchens y restaurantes con delivery propio

**Perfil del decisor de compra:**
- Dueno o administrador general, 30-55 anos
- Actualmente usa cuadernos, Excel o sistemas legacy costosos
- Busca simplificar operaciones y tener control del negocio

**Competencia en Peru:**
- Alegra POS: fuerte en facturacion, debil en restaurantes
- FacturaPeru / Factusol: enfocados en emision de comprobantes, no en operacion
- Toast / Square: no adaptados al mercado peruano (SUNAT)
- **Ventaja de Lorito Killer:** ya tiene integracion SUNAT, base solida, puede diferenciarse en UX para restaurantes

### Metricas de exito del MVP

| Metrica | Objetivo a 90 dias post-lanzamiento |
|---|---|
| Restaurantes activos (al menos 1 orden/semana) | 20 |
| Tiempo promedio de toma de pedido (mozo a cocina) | < 2 minutos |
| Tasa de error en pedidos (platos erroneos/total) | < 2% |
| Churn mensual de cuentas restaurante | < 10% |
| NPS del administrador | > 40 |
| Ordenes procesadas por tenant activo/dia | > 50 |
| Tiempo de onboarding (primer pedido en vivo) | < 2 horas |

---

## 2. Roles de Usuario

### 2.1 Administrador / Dueno

**Descripcion:** Propietario o gerente general. Configura el sistema y supervisa la operacion completa.

**Responsabilidades principales:**
- Configurar el menu (carta), precios y disponibilidad de platos
- Gestionar mesas, zonas y capacidad del local
- Crear y administrar usuarios del sistema (mozos, cajeros, cocineros)
- Ver reportes de ventas, cierre de caja y rendimiento por mozo
- Configurar datos del establecimiento para comprobantes (RUC, serie, etc.)

**Permisos:**
- CRUD completo sobre productos/carta, categorias, mesas, zonas
- Crear, editar y desactivar usuarios
- Ver todos los reportes y cierres de caja
- Cancelar cualquier pedido (incluyendo de otros usuarios)
- Exportar reportes

---

### 2.2 Cajero

**Descripcion:** Responsable del punto de cobro. Opera la caja, procesa pagos y emite comprobantes.

**Responsabilidades principales:**
- Abrir y cerrar turno de caja (cash shift)
- Ver el estado de todas las mesas y sus cuentas
- Procesar el cobro de mesas (uno o multiples pagos)
- Emitir boleta, factura o ticket
- Gestionar pedidos de delivery y take away

**Permisos:**
- Abrir/cerrar cash shift
- Leer estado de todas las mesas
- Cobrar cualquier mesa
- Aplicar descuentos
- Cancelar items u ordenes (con motivo)
- NO puede crear/editar usuarios ni configurar el menu

---

### 2.3 Mozo / Mesero

**Descripcion:** Personal de sala responsable de atender mesas y coordinar con cocina y barra.

**Responsabilidades principales:**
- Tomar pedidos en mesa desde su dispositivo (tablet/celular)
- Enviar pedidos directamente a cocina/barra
- Agregar items adicionales a pedidos abiertos
- Solicitar la cuenta para una mesa
- Agregar notas especiales por item

**Permisos:**
- Ver y gestionar mesas (ver el estado general de todas)
- Crear y modificar pedidos en mesas abiertas (antes de enviar)
- Solicitar cuenta (triggerea flujo en caja)
- NO puede cobrar ni emitir comprobantes
- NO puede ver reportes de ventas ni cierres de caja

---

### 2.4 Cocinero (Vista KDS)

**Descripcion:** Personal de cocina que usa una pantalla dedicada (KDS) para ver y gestionar pedidos entrantes.

**Responsabilidades principales:**
- Ver pedidos entrantes en tiempo real ordenados por hora de llegada
- Marcar comandas como "en preparacion"
- Marcar comandas como "listas" (notifica al mozo)
- Ver notas especiales de cada item

**Permisos:**
- Acceso exclusivo a la vista KDS
- Cambiar estado de comandas: PENDIENTE → EN_PREPARACION → LISTO
- NO puede ver precios, totales ni informacion de pago

---

### 2.5 Bartender (Opcional en MVP)

**Descripcion:** Similar al cocinero pero con vista filtrada solo a items de bebidas/barra.

> **Nota MVP:** Puede usar la misma pantalla KDS con filtro de categoria por URL. No se requiere rol diferenciado en V1.

---

## 3. Funcionalidades del MVP

### 3.1 Gestion de Mesas

**Mapa visual de mesas**
- Vista de grilla agrupada por zona/sector
- Cada mesa muestra: numero, capacidad, estado (color), mozo asignado y tiempo desde apertura
- Acceso rapido para abrir pedido, ver cuenta o cobrar directamente desde el mapa
- Actualizacion automatica cada 30 segundos (polling en V1, WebSocket en V2)

**Estados de mesa**

| Estado | Color | Descripcion |
|---|---|---|
| LIBRE | Verde | Sin ocupantes, disponible |
| OCUPADA | Rojo | Con pedido activo |
| CUENTA_PEDIDA | Amarillo/Azul | El mozo solicito la cuenta |
| RESERVADA | Morado | Reserva futura (asignacion manual) |

**Configuracion**
- El administrador puede agregar, editar y eliminar mesas
- Zonas configurables: Salon, Terraza, Barra, VIP, etc.
- No se puede eliminar una mesa con pedido activo

---

### 3.2 Sistema de Pedidos

**Flujo de pedido por mesa:**
1. Mozo selecciona mesa en el mapa
2. Navega la carta por categorias
3. Agrega items con cantidad, modificadores y notas especiales
4. Confirma y envia el pedido a cocina/barra
5. La mesa cambia de LIBRE a OCUPADA
6. La cocina ve el pedido en la pantalla KDS

**Capacidades:**
- Agregar items adicionales a un pedido ya enviado (rondas)
- Cada "envio" a cocina genera una comanda separada
- Ver resumen acumulado de todos los items de la mesa

**Tipos de pedido:**
- `DINE_IN` — pedido por mesa en salon
- `TAKE_AWAY` — para llevar, se cobra al momento
- `DELIVERY` — a domicilio, con datos del cliente

**Modificaciones y cancelaciones:**
- Antes de enviar a cocina: libre modificacion sin registro
- Despues de enviado: solo cajero o administrador pueden cancelar, con motivo obligatorio
- Items cancelados no se cobran pero quedan en historial

**Notas especiales por item:**
- Campo de texto libre (maximo 100 caracteres)
- Aparece junto al item en la pantalla KDS

---

### 3.3 Comanda de Cocina (KDS)

Vista dedicada para cocina, optimizada para lectura rapida.

**Visualizacion:**
- Comandas ordenadas por hora de llegada (mas antiguo primero)
- Cada comanda muestra: numero de mesa, mozo, hora, items con cantidades y notas
- Codigo de color por tiempo de espera:
  - Normal (< 10 min)
  - Amarillo (10-20 min)
  - Rojo (> 20 min)

**Estados de comanda:**

| Estado | Accion | Efecto |
|---|---|---|
| PENDIENTE | Estado inicial | Visible en pantalla |
| EN_PREPARACION | Cocinero toca "Iniciar" | Indica que lo esta trabajando |
| LISTO | Cocinero toca "Listo" | Notifica al mozo, sale de activos |

**Filtro por estacion:**
- URL con parametro de categoria (ej: `?station=kitchen` o `?station=bar`)
- Sin filtro: muestra todos los items
- Acceso con PIN de 4 digitos (sin login completo)

**Actualizacion:** cada 10 segundos automaticamente

---

### 3.4 Gestion de Cuenta

**Ver cuenta por mesa:**
- Detalle completo de todos los items (todas las rondas)
- Subtotales, descuentos aplicados y total
- Historial de comandas por ronda

**Division de cuenta:**
- **Por partes iguales:** Total dividido entre N comensales
- **Division manual:** El cajero selecciona que items van a cada sub-cuenta
- Cada sub-cuenta puede pagarse con diferente metodo de pago

**Multiples metodos de pago:**
- Se reutiliza el modelo de Payment existente (cash, credit_card, debit_card, wallet)
- Combinacion de metodos en una misma mesa
- Calculo automatico de vuelto para pagos en efectivo

**Generacion de comprobante:**
- Se usa el sistema de documentos existente (boleta, factura, ticket)
- Se puede reimprimir desde el historial

---

### 3.5 Delivery

**Registro de pedido (campos requeridos):**
- Nombre del cliente
- Telefono
- Direccion completa
- Referencia/indicaciones (opcional)
- Items del pedido

**Estados del delivery:**

| Estado | Descripcion |
|---|---|
| PENDIENTE | Pedido recibido, en cocina |
| EN_CAMINO | Despachado por el repartidor |
| ENTREGADO | Confirmacion de entrega |
| CANCELADO | Con motivo registrado |

> **Alcance MVP:** Solo pedidos propios del restaurante. Sin integracion con Rappi, PedidosYa ni Uber Eats.

---

### 3.6 Gestion de Carta / Menu

**Categorias con orden configurable:**
- Ejemplos: Entradas, Sopas, Platos de Fondo, Parrillas, Postres, Bebidas, Cocteles
- Las categorias tambien filtran la pantalla KDS

**Productos:**
- Foto del plato (ya soportado por UploadThing)
- Descripcion con ingredientes y alergenos
- Vista de carta del mozo: grilla visual con foto + nombre + precio

**Disponibilidad de plato (86'd):**
- Toggle rapido de Activar/Desactivar en la gestion del menu
- Usa el campo `hidden` ya existente en el modelo `Product`
- Producto desactivado no aparece en la carta del mozo
- No afecta pedidos ya enviados a cocina

**Modificadores:**

| Tipo | Ejemplo | Afecta precio |
|---|---|---|
| Seleccion unica requerida | Punto de coccion | No |
| Seleccion multiple opcional | Extra queso, extra bacon | Si (+precio por extra) |
| Nota de texto libre | "sin cebolla" | No |

---

### 3.7 Reportes Basicos

| Reporte | Contenido |
|---|---|
| Ventas del dia | Total, desglose por metodo de pago, ticket promedio |
| Ventas por mozo | Mesas atendidas, total vendido, ticket promedio por mozo |
| Platos mas vendidos | Ranking de productos con cantidad y total generado |
| Cierres de caja | Extension del cash shift: por tipo de pedido (mesa/delivery/take away) |

---

## 4. Historias de Usuario

### Epica 1: Gestion de Mesas

**HU-01:** Como mozo, quiero ver el mapa de mesas con colores por estado para saber de un vistazo que mesas estan libres, ocupadas o pidiendo la cuenta.

**HU-02:** Como mozo, quiero abrir una mesa con un toque para iniciar un pedido y que el sistema registre la hora de apertura automaticamente.

**HU-03:** Como administrador, quiero configurar las mesas del restaurante (numero, capacidad y zona) para que el mapa refleje la realidad del local.

**HU-04:** Como cajero, quiero ver todas las mesas con su mozo asignado y el tiempo que llevan abiertas para coordinar el cobro eficientemente.

**HU-05:** Como administrador, quiero reasignar una mesa a otro mozo cuando hay cambio de turno, sin perder el pedido en curso.

### Epica 2: Sistema de Pedidos

**HU-06:** Como mozo, quiero navegar la carta por categorias y agregar items con notas especiales para transmitir exactamente lo que pide el cliente.

**HU-07:** Como mozo, quiero poder agregar una segunda ronda de pedidos a una mesa ya abierta para que la cocina reciba solo los items nuevos.

**HU-08:** Como mozo, quiero solicitar la cuenta de una mesa con un boton para notificar al cajero que debe preparar el cobro.

**HU-09:** Como cajero, quiero crear un pedido de delivery con los datos del cliente y los items para gestionar su entrega.

**HU-10:** Como cajero, quiero crear un pedido de take away con nombre del cliente para que cocina lo prepare y yo lo cobre cuando el cliente llegue.

**HU-11:** Como administrador, quiero cancelar un item ya enviado a cocina indicando el motivo para que quede registrado y no se cobre al cliente.

### Epica 3: Cocina (KDS)

**HU-12:** Como cocinero, quiero ver todos los pedidos pendientes ordenados por hora de llegada para priorizar lo que lleva mas tiempo esperando.

**HU-13:** Como cocinero, quiero marcar un pedido como "en preparacion" para indicarle al equipo que ya lo estoy trabajando.

**HU-14:** Como cocinero, quiero marcar un pedido como "listo" para que el mozo sepa que puede recoger y llevar el pedido a la mesa.

**HU-15:** Como bartender, quiero ver en mi pantalla solo los pedidos de bebidas para no confundir mis items con los de cocina.

### Epica 4: Gestion de Cuenta y Pago

**HU-16:** Como cajero, quiero ver el detalle completo de la cuenta de una mesa (todos los items, subtotal y total) para preparar el cobro.

**HU-17:** Como cajero, quiero dividir la cuenta en partes iguales indicando cuantos comensales pagan por separado para agilizar el cobro en grupos.

**HU-18:** Como cajero, quiero cobrar una mesa con multiples metodos de pago (parte efectivo, parte tarjeta) para adaptarme a como quiere pagar el cliente.

**HU-19:** Como cajero, quiero generar una boleta o factura al cerrar la cuenta para cumplir con la obligacion tributaria y dar un comprobante al cliente.

### Epica 5: Gestion de Carta

**HU-20:** Como administrador, quiero desactivar un plato del menu en tiempo real (86'd) para que los mozos no puedan pedirlo cuando se agota en cocina.

**HU-21:** Como administrador, quiero configurar modificadores para un plato (punto de coccion, extras) para que los mozos tomen pedidos precisos sin papel.

**HU-22:** Como mozo, quiero ver los platos disponibles con foto y descripcion mientras tomo el pedido para poder recomendarlos al cliente.

### Epica 6: Delivery

**HU-23:** Como cajero, quiero registrar un pedido de delivery con nombre, telefono y direccion del cliente para tener trazabilidad de la entrega.

**HU-24:** Como cajero, quiero cambiar el estado de un delivery a "en camino" cuando el repartidor sale para saber cuantos pedidos estan en ruta.

### Epica 7: Reportes

**HU-25:** Como administrador, quiero ver las ventas del dia agrupadas por metodo de pago para saber cuanto hay en caja y cuanto en tarjeta.

**HU-26:** Como administrador, quiero ver el ranking de platos mas vendidos del mes para tomar decisiones sobre el menu y las compras.

**HU-27:** Como administrador, quiero ver el reporte de ventas por mozo del turno para evaluar el rendimiento de mi equipo.

---

## 5. Criterios de Aceptacion

### CA-01: Mapa de Mesas y Estados

1. Al acceder al modulo de mesas, se muestra grilla con todas las mesas agrupadas por zona con: numero, mozo, tiempo de apertura y estado por color.
2. Transiciones de estado:
   - Mesa pasa a OCUPADA al crear el primer pedido.
   - Mesa pasa a CUENTA_PEDIDA cuando mozo o cajero activa esa solicitud.
   - Mesa vuelve a LIBRE al procesar el pago exitosamente.
3. El mapa se refresca automaticamente cada 30 segundos.
4. Acciones directas: click en LIBRE → abrir pedido; click en OCUPADA → ver pedido; click en CUENTA_PEDIDA → flujo de cobro.
5. No se puede eliminar una mesa con pedido activo.

### CA-02: Toma de Pedido por Mesa

1. Al seleccionar mesa LIBRE se crea registro de pedido con timestamp y mozo. La mesa cambia inmediatamente a OCUPADA.
2. La carta muestra solo productos con `hidden = false`, agrupados por categoria con foto, nombre y precio.
3. Items con modificadores configurados: los requeridos deben ser seleccionados antes de confirmar.
4. Pedido enviado aparece en KDS en estado PENDIENTE en < 5 segundos.
5. Despues de enviado, el mozo no puede modificar esa comanda; puede agregar una nueva ronda.
6. Cancelacion de item enviado requiere cajero/admin y motivo (minimo 5 caracteres).

### CA-03: KDS — Pantalla de Cocina

1. Comandas ordenadas por hora de llegada (mas antigua primero), con mesa, mozo, hora y tiempo transcurrido.
2. Codigo de color: normal < 10 min, amarillo 10-20 min, rojo > 20 min.
3. Boton "Iniciar" → EN_PREPARACION; Boton "Listo" → LISTO + notificacion visual en mapa de mesas.
4. Timestamps de cada cambio de estado quedan en base de datos.
5. La pantalla se refresca cada 10 segundos automaticamente.
6. Acceso con PIN de 4 digitos; no requiere login completo.

### CA-04: Cobro y Division de Cuenta

1. Vista de cuenta muestra todos los items (todas las rondas), items cancelados con S/0.00 etiquetado.
2. Division por partes iguales: cajero ingresa N partes, sistema calcula monto por parte con redondeo correcto.
3. Division manual por items: checkboxes, un item no puede asignarse a mas de un grupo.
4. Multiples metodos de pago en un cobro: calculo de vuelto automatico para efectivo.
5. La mesa cambia a LIBRE solo cuando el pago cubre el 100% del total.
6. Comprobante disponible inmediatamente despues del cobro (boleta, factura, ticket).

### CA-05: Disponibilidad de Plato (86'd)

1. Toggle en lista de productos cambia disponibilidad con feedback inmediato ("Plato desactivado").
2. Producto con `hidden = true` no aparece en la carta del mozo.
3. La desactivacion no afecta pedidos ya enviados a cocina.
4. Lista de productos muestra claramente cuales estan activos y cuales desactivados.
5. Solo el administrador puede cambiar la disponibilidad en MVP.

---

## 6. Priorizacion (MoSCoW)

### Must Have (Mes 1-2)
1. Gestion de mesas (mapa, estados)
2. Ordenes abiertas por mesa
3. Agregar modificaciones por item
4. Separacion de comanda: cocina vs barra
5. Pantalla KDS para cocina
6. Roles: mozo / cocina / cajero / admin
7. Modo delivery y para llevar (basico)
8. Cobro con emision de comprobante (reusar lo existente)

### Should Have (Mes 3)
9. Notificaciones al mozo cuando pedido esta listo
10. Division de cuenta equitativa
11. Reportes por zona y categoria
12. Tiempo promedio de servicio por mesa

### Could Have (Mes 4+)
13. Reservas basicas
14. Historial de cliente en restaurante
15. Menu QR digital
16. Propinas en sistema

### Won't Have en MVP
- Integracion Rappi/PedidosYa/Uber Eats
- App nativa movil
- Inventario de insumos con recetas
- Programa de fidelidad
- Offline-first

---

## 7. Out of Scope (MVP)

| Funcionalidad | Razon | Target |
|---|---|---|
| Integraciones Rappi/PedidosYa/Uber Eats | Complejidad de APIs externas | V2 |
| Reservas con calendario | Requiere modulo separado | V2 |
| Notificaciones push al celular | Requiere PWA o app nativa | V2 |
| Gestion de recetas e insumos | Fichas tecnicas, cost of production | V2 |
| Propinas | Campo con distribucion entre mozos | V2 |
| Programa de fidelizacion | Puntos, cashback, descuentos | V2 |
| App movil nativa (iOS/Android) | MVP es web app responsive | V2 |
| Funcionalidad offline | Service workers, sincronizacion | V2 |
| Multi-sucursal | Cadenas con cocina central compartida | V2 |
| Impresion termica directa | Integracion ESC/POS (EPSON, Star) | V2 |
| Menu QR autoservicio | Cliente pide desde su celular | V2 |
| Gestion de turnos de personal | Horarios, RRHH | V2 |

---

## 8. Dependencias Tecnicas (Resumen)

### Nuevos modelos de base de datos

```prisma
model Zone {
  id        String   @id
  companyId String
  name      String
  order     Int
  tables    Table[]
}

model Table {
  id          String      @id
  companyId   String
  number      Int
  capacity    Int
  zoneId      String
  zone        Zone        @relation(...)
  status      TableStatus @default(LIBRE)
  waiterId    String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

enum TableStatus {
  LIBRE
  OCUPADA
  CUENTA_PEDIDA
  RESERVADA
}

model KitchenTicket {
  id          String          @id
  companyId   String
  orderId     String
  status      KitchenStatus   @default(PENDING)
  sentAt      DateTime        @default(now())
  startedAt   DateTime?
  readyAt     DateTime?
  items       KitchenTicketItem[]
}

enum KitchenStatus {
  PENDING
  IN_PREPARATION
  READY
}

model DeliveryOrder {
  id           String         @id
  companyId    String
  orderId      String
  customerName String
  phone        String
  address      String
  reference    String?
  status       DeliveryStatus @default(PENDING)
  dispatchedAt DateTime?
  deliveredAt  DateTime?
}

enum DeliveryStatus {
  PENDING
  IN_TRANSIT
  DELIVERED
  CANCELLED
}
```

### Cambios en modelos existentes

| Modelo | Campo nuevo | Tipo |
|--------|------------|------|
| Order | orderType | enum: DINE_IN, TAKE_AWAY, DELIVERY |
| Order | tableId | String? |
| Order | status | Ampliar a: OPEN, PREPARING, READY, SERVED, COMPLETED, CANCELLED |
| OrderItem | notes | String? (max 100) |
| OrderItem | modifierSelections | Json? |
| User | role | enum: ADMIN, CASHIER, WAITER, KITCHEN, BARTENDER |
| Category | station | enum: KITCHEN, BAR, ALL |
| Category | order | Int |

### Estructura de nuevos modulos

```
/src/table/                    # Gestion de mesas y zonas
/src/table-order/              # Pedidos asociados a mesas
/src/kitchen-ticket/           # Logica de comandas de cocina
/src/modifier/                 # Modificadores y opciones
/src/delivery-order/           # Gestion de pedidos delivery

/src/app/[subdomain]/dashboard/
  tables/           # Mapa de mesas
  kitchen/          # Vista KDS
  delivery/         # Lista delivery
```

### Real-time (MVP)

Opcion recomendada: **polling con React Query**
- KDS: `refetchInterval: 10000` (10 segundos)
- Mapa de mesas: `refetchInterval: 30000` (30 segundos)
- Sin dependencias externas adicionales
- Latencia aceptable para MVP

V2: SSE o WebSocket (Pusher/Supabase Realtime)

### Estimacion de desarrollo

| Fase | Contenido | Estimacion |
|------|-----------|------------|
| 1 | Migracion DB + roles + modelos base | 2 semanas |
| 2 | Modulo de mesas + pedidos dine-in | 3-4 semanas |
| 3 | KDS + real-time + notificaciones | 2 semanas |
| 4 | Delivery + take away + reportes | 2-3 semanas |
| **Total** | **MVP completo** | **14-18 semanas (2-3 devs)** |

---

## Glosario

| Termino | Definicion |
|---|---|
| 86'd | Termino de cocina para plato agotado o no disponible temporalmente |
| KDS | Kitchen Display System — pantalla digital de pedidos en cocina |
| Comanda | Registro de items pedidos por una mesa que se envia a cocina |
| Ronda | Cada envio adicional de items a cocina para una misma mesa |
| Cash Shift | Turno de caja abierto por un cajero |
| Take Away | Pedido para llevar; el cliente retira en el local |
| Delivery | Pedido con envio a domicilio gestionado por el restaurante |
| Modificador | Opcion adicional de un plato (punto de coccion, extras, exclusiones) |
| Estacion | Seccion de cocina o barra que filtra el KDS |
