# Validacion Tecnica — MVP Restaurante y Bar
## Lorito Killer POS — Analisis de Viabilidad y Gaps

**Version:** 1.0
**Fecha:** 2026-03-07
**Analisis basado en:** rama `hide-products`, commit `810d8d6`

---

## 1. Estado Actual del Sistema (Resumen)

El codebase de Lorito Killer es un POS multi-tenant para retail bien arquitecturado. Sus componentes existentes aprovechables:

| Componente | Estado | Reutilizable para restaurante |
|------------|--------|-------------------------------|
| Sistema de ordenes (Order, OrderItem) | Funcionando | SI — con extensiones |
| Pagos multiples (Payment) | Funcionando | SI — sin cambios |
| Turno de caja (CashShift) | Funcionando | SI — sin cambios |
| Documentos/Comprobantes SUNAT | Funcionando | SI — diferenciador clave |
| Productos con fotos (Product) | Funcionando | SI — como carta/menu |
| Categorias (Category) | Funcionando | SI — con campo `order` y `station` |
| Clientes (Customer) | Funcionando | SI — para factura y delivery |
| Auth NextAuth.js | Funcionando | SI — necesita roles |
| Multi-tenant (subdomains) | Funcionando | SI — sin cambios |
| Zustand stores | Funcionando | SI — patron reutilizable |
| Inngest (background jobs) | Funcionando | SI — para notificaciones V2 |

**Lo que NO existe y es critico para restaurante:**
- Entidad Mesa (Table) — no existe en el schema
- Comanda/KitchenTicket — no existe
- Roles diferenciados (mozo, cocinero, cajero) — no existe
- Estado de orden abierta (ciclo de vida largo) — no existe
- Delivery como entidad — no existe
- Real-time / actualizacion de pantalla — no existe

---

## 2. Analisis del Schema de Base de Datos

### Modelos Existentes Relevantes

```
Product     → items del menu (fotos, categorias, hidden, precio)
Category    → agrupacion de productos
Order       → orden de venta (estados: PENDING, COMPLETED, CANCELLED)
OrderItem   → item dentro de una orden (precio, cantidad, descuento)
Payment     → pago de orden (CASH, CREDIT_CARD, DEBIT_CARD, WALLET)
CashShift   → turno de caja (OPEN, CLOSED)
Document    → comprobante SUNAT (INVOICE, RECEIPT, TICKET)
Customer    → cliente con RUC/DNI
Company     → empresa/tenant con subdominio
User        → usuario (email, password, companyId — SIN ROL)
```

### Nuevos Modelos Requeridos

```prisma
model Zone {
  id        String   @id @default(cuid())
  companyId String
  name      String
  order     Int      @default(0)
  tables    Table[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([companyId])
}

model Table {
  id          String      @id @default(cuid())
  companyId   String
  number      Int
  capacity    Int
  zoneId      String
  zone        Zone        @relation(fields: [zoneId], references: [id])
  status      TableStatus @default(LIBRE)
  waiterId    String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([companyId, status])
}

enum TableStatus {
  LIBRE
  OCUPADA
  CUENTA_PEDIDA
  RESERVADA
}

model KitchenTicket {
  id        String          @id @default(cuid())
  companyId String
  orderId   String
  order     Order           @relation(fields: [orderId], references: [id])
  status    KitchenStatus   @default(PENDING)
  sentAt    DateTime        @default(now())
  startedAt DateTime?
  readyAt   DateTime?
  items     KitchenTicketItem[]
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  @@index([companyId, status])
}

model KitchenTicketItem {
  id                String        @id @default(cuid())
  kitchenTicketId   String
  kitchenTicket     KitchenTicket @relation(fields: [kitchenTicketId], references: [id])
  productName       String
  quantity          Decimal       @db.Decimal(10, 2)
  notes             String?
  status            String        @default("PENDING")
  startedAt         DateTime?
  completedAt       DateTime?
}

enum KitchenStatus {
  PENDING
  IN_PREPARATION
  READY
  COMPLETED
  CANCELLED
}

model DeliveryOrder {
  id           String         @id @default(cuid())
  companyId    String
  orderId      String
  order        Order          @relation(fields: [orderId], references: [id])
  customerName String
  phone        String
  address      String
  reference    String?
  status       DeliveryStatus @default(PENDING)
  dispatchedAt DateTime?
  deliveredAt  DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@index([companyId, status])
}

enum DeliveryStatus {
  PENDING
  IN_TRANSIT
  DELIVERED
  CANCELLED
}

model Modifier {
  id        String           @id @default(cuid())
  companyId String
  name      String
  required  Boolean          @default(false)
  multiSelect Boolean        @default(false)
  options   ModifierOption[]
  products  ProductModifier[]
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
}

model ModifierOption {
  id              String   @id @default(cuid())
  modifierId      String
  modifier        Modifier @relation(fields: [modifierId], references: [id])
  name            String
  priceAdjustment Decimal  @default(0) @db.Decimal(10, 2)
}

model ProductModifier {
  productId  String
  modifierId String
  product    Product  @relation(fields: [productId], references: [id])
  modifier   Modifier @relation(fields: [modifierId], references: [id])

  @@id([productId, modifierId])
}
```

### Cambios en Modelos Existentes

```prisma
// Order — cambios requeridos
model Order {
  // ... campos existentes ...

  // NUEVOS para restaurante:
  orderType    OrderType  @default(RETAIL)   // nuevo enum
  tableId      String?                        // nullable
  status       OrderStatus                    // ampliar enum
  preparedAt   DateTime?
  servedAt     DateTime?

  // Nuevas relaciones:
  kitchenTickets KitchenTicket[]
  delivery       DeliveryOrder?
}

enum OrderType {
  RETAIL      // flujo actual — sin cambios
  DINE_IN     // mesa en salon
  TAKE_AWAY   // para llevar
  DELIVERY    // a domicilio
}

// Status ampliado (no rompe estados existentes):
enum OrderStatus {
  PENDING     // ya existe
  PREPARING   // nuevo
  READY       // nuevo
  SERVED      // nuevo
  COMPLETED   // ya existe
  CANCELLED   // ya existe
}

// OrderItem — cambios requeridos
model OrderItem {
  // ... campos existentes ...

  // NUEVOS para restaurante:
  notes                String?   // "sin cebolla", "bien cocido"
  modifierSelections   Json?     // opciones seleccionadas + ajuste total
}

// User — cambios requeridos (CRITICO)
model User {
  // ... campos existentes ...

  // NUEVO — sin rol actualmente:
  role UserRole @default(ADMIN)
}

enum UserRole {
  ADMIN
  CASHIER
  WAITER
  KITCHEN
  BARTENDER
}

// Category — cambios requeridos
model Category {
  // ... campos existentes ...

  // NUEVOS:
  order   Int     @default(0)   // orden en la carta
  station String  @default("ALL") // "KITCHEN", "BAR", "ALL"
}
```

### Indices de Base de Datos Requeridos

```sql
-- Para queries del KDS (muy frecuentes, cada 10s):
CREATE INDEX ON "KitchenTicket" ("companyId", "status");

-- Para el mapa de mesas (frecuente, cada 30s):
CREATE INDEX ON "Table" ("companyId", "status");

-- Para deliveries activos:
CREATE INDEX ON "DeliveryOrder" ("companyId", "status");

-- Para ordenes de restaurante:
CREATE INDEX ON "Order" ("companyId", "orderType", "status");
```

---

## 3. Analisis del Sistema de Autenticacion y Roles

### Estado Actual

```typescript
// src/lib/auth-config.ts
// NextAuth con CredentialsProvider (email/password)
// JWT con payload: { user, token, userId }
// Session callback recupera usuario por email

// Problema: NO HAY SOPORTE DE ROLES
// Tipo actual de User en session:
type SessionUser = {
  id: string;
  companyId: string;
  name?: string | null;
  email: string;
  // ← SIN CAMPO "role"
}
```

### Cambios Requeridos

**1. Actualizar auth-config.ts:**
```typescript
// Agregar role al JWT y session callbacks
callbacks: {
  jwt: ({ token, user }) => {
    if (user) {
      token.role = user.role;  // NUEVO
    }
    return token;
  },
  session: ({ session, token }) => {
    session.user.role = token.role;  // NUEVO
    return session;
  }
}
```

**2. Crear middleware de autorizacion:**
```typescript
// src/lib/authorization.ts
type Permission =
  | 'CREATE_ORDER'
  | 'PROCESS_PAYMENT'
  | 'VIEW_KITCHEN'
  | 'MANAGE_USERS'
  | 'VIEW_REPORTS'
  | 'MANAGE_TABLES'
  | 'CANCEL_ORDER_ITEM'
  | 'VIEW_DELIVERY'

const ROLE_PERMISSIONS: Record<UserRole, Permission[] | ['*']> = {
  ADMIN:     ['*'],
  CASHIER:   ['PROCESS_PAYMENT', 'CREATE_ORDER', 'MANAGE_TABLES', 'VIEW_DELIVERY'],
  WAITER:    ['CREATE_ORDER', 'MANAGE_TABLES'],
  KITCHEN:   ['VIEW_KITCHEN'],
  BARTENDER: ['VIEW_KITCHEN'],
}

export const hasPermission = (role: UserRole, permission: Permission): boolean
export const requirePermission = (permission: Permission) => async (req) => {
  const session = await getServerSession();
  if (!hasPermission(session.user.role, permission)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
}
```

**3. Proteger Server Actions:**
```typescript
// En cada action.ts del modulo
export async function createOrder(data: OrderInput) {
  const session = await getServerSession();
  if (!['ADMIN', 'CASHIER', 'WAITER'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  // ... logica existente
}
```

**Complejidad:** MEDIA
- Cambio de schema: Bajo (campo nullable → con default)
- Actualizar auth-config: Bajo (2 callbacks)
- Proteger endpoints: Alto (auditar todos los modulos)

---

## 4. Analisis del Sistema de Ordenes

### Flujo Actual (Retail)

```
Usuario crea Order con items →
Se calcula stock →
Se aplican descuentos →
Se crean Payments →
Se genera Document PDF →
Se envia a SUNAT via Inngest →
Order → COMPLETED
```

**Problema:** El flujo actual cierra la orden inmediatamente. Para restaurante la orden vive horas antes de cerrarse.

### Cambios Requeridos para Restaurante

**Desacoplamiento creacion-pago:**
```typescript
// Estado actual: crear orden → pagar → completar (todo en un flujo)
// Estado nuevo para DINE_IN:
//   1. Crear orden (PENDING/OPEN)
//   2. Enviar a cocina (PREPARING)
//   3. Listo en cocina (READY)
//   4. Servido en mesa (SERVED)
//   5. Cliente pide cuenta
//   6. Cajero cobra (COMPLETED) ← recien aqui se asocia al CashShift del cajero

// Para RETAIL y TAKE_AWAY: flujo actual sin cambios
```

**Crear KitchenTicket automaticamente:**
```typescript
// En src/order/actions.ts — modificar createOrder:
export async function createOrder(data: OrderInput) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: orderData });

    // NUEVO para restaurante:
    if (data.orderType !== 'RETAIL') {
      await tx.kitchenTicket.create({
        data: {
          orderId: order.id,
          companyId: data.companyId,
          items: {
            create: data.orderItems.map(item => ({
              productName: item.productName,
              quantity: item.quantity,
              notes: item.notes,
            }))
          }
        }
      });
    }

    return order;
  });
}
```

**Tabla de impacto en flujo existente:**

| Aspecto | Cambio | Complejidad | Rompe algo? |
|---------|--------|-------------|-------------|
| Enum OrderStatus | Agregar 3 estados | Baja | NO (additive) |
| Campo orderType | Nuevo con default RETAIL | Baja | NO |
| Campo tableId | Nullable | Baja | NO |
| Campo notes en OrderItem | Nullable | Baja | NO |
| Crear KitchenTicket | En la accion de crear orden | Media | NO |
| Document generation | Condicional para restaurante | Media | NO (ya RETAIL) |
| CashShift association | Asociar al cobrador, no al creador | Media | Verificar |

---

## 5. Real-Time: Opciones y Recomendacion

### Estado Actual

El codebase NO tiene ninguna capacidad de real-time:
- Sin WebSockets
- Sin Server-Sent Events
- Sin polling
- Inngest: solo background jobs de facturacion, no real-time

### Requerimientos para MVP

| Pantalla | Frecuencia requerida | Latencia maxima aceptable |
|----------|---------------------|--------------------------|
| KDS (cocina) | Cada 10 segundos | 15 segundos |
| Mapa de mesas | Cada 30 segundos | 45 segundos |
| Lista delivery | Cada 60 segundos | 90 segundos |

### Comparativa de Opciones

| Opcion | Latencia | Complejidad | Costo | Recomendacion |
|--------|----------|-------------|-------|---------------|
| **Polling (React Query)** | 10-30s | Baja | S/0 | **MVP** |
| Server-Sent Events (Next.js) | 1-2s | Media | S/0 | V1.5 |
| Pusher | < 100ms | Baja | $40-99/mes | V2 |
| Supabase Realtime | < 100ms | Media | $25/mes | V2 |
| Socket.io | < 100ms | Alta | Server dedicado | No recomendado |

### Implementacion Recomendada (MVP): Polling con React Query

```typescript
// src/kitchen/hooks/use-kitchen-tickets.ts
import { useQuery } from '@tanstack/react-query';

export const useKitchenTickets = (companyId: string) => {
  return useQuery({
    queryKey: ['kitchen-tickets', companyId],
    queryFn: () => fetch(`/api/kitchen-tickets?companyId=${companyId}`)
      .then(r => r.json()),
    refetchInterval: 10_000,      // 10 segundos
    refetchIntervalInBackground: true,
    staleTime: 5_000,
  });
};

// src/table/hooks/use-tables.ts
export const useTables = (companyId: string) => {
  return useQuery({
    queryKey: ['tables', companyId],
    queryFn: () => fetch(`/api/tables?companyId=${companyId}`)
      .then(r => r.json()),
    refetchInterval: 30_000,      // 30 segundos
  });
};
```

Si React Query no esta instalado (`@tanstack/react-query`), alternativa con `useEffect`:

```typescript
// src/lib/use-realtime-kitchen.ts
export const useRealtimeKitchenTickets = (companyId: string) => {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetch = () => getKitchenTickets(companyId).then(setTickets);
    fetch(); // fetch inicial
    const interval = setInterval(fetch, 10_000);
    return () => clearInterval(interval);
  }, [companyId]);

  return tickets;
};
```

---

## 6. Componentes UI Reutilizables

### Ya Instalados (via @radix-ui)

```
@radix-ui/react-dialog        → confirmaciones, modales
@radix-ui/react-dropdown-menu → menus contextuales en mesas
@radix-ui/react-tabs          → categorias del menu, filtros KDS
@radix-ui/react-select        → selector de zona, mozo
@radix-ui/react-popover       → tooltips de mesa
@radix-ui/react-toast         → notificaciones (con Sonner)
@radix-ui/react-checkbox      → items del KDS, division de cuenta
@radix-ui/react-toggle-group  → filtros de estado en mapa
```

### Quick Wins (Reutilizar Directamente)

- `DataTable` (@tanstack/react-table) → lista de deliveries, reportes
- `Dialog` → todos los modales de confirmacion
- `Form` + React Hook Form → formularios de nueva mesa, delivery
- `Toasts` → notificaciones de estado
- `Badge` → estados de mesa

### Componentes Nuevos a Crear

```typescript
// Mapa de mesas
<TableGrid />          // grilla con mapa visual
<TableCard />          // tarjeta individual de mesa
<TableStatusBadge />   // badge de color por estado

// KDS
<KitchenTicketBoard /> // contenedor de comandas
<KitchenTicketCard />  // comanda individual con timer
<TimerBadge />         // tiempo transcurrido con colores

// Toma de pedido
<MenuItemGrid />       // grilla de productos con foto
<ModifierModal />      // modal de modificadores
<OrderItemRow />       // fila editable con +/- y nota

// Cobro
<AccountSummary />     // resumen de cuenta de mesa
<SplitBillModal />     // division de cuenta
<PaymentNumpad />      // numpad tactil (64x64px minimo)
```

---

## 7. Gaps Tecnicos y Riesgos

### Breaking Changes

| Cambio | Severidad | Mitigacion |
|--------|-----------|-----------|
| OrderStatus enum ampliado | BAJA | Additive — no rompe queries existentes |
| Order.orderType nuevo campo | BAJA | Nullable con default RETAIL |
| Order.tableId nullable | BAJA | No afecta ordenes retail |
| User.role nuevo campo | BAJA | Default ADMIN — todos existentes siguen con acceso |
| KitchenTicket en createOrder | MEDIA | Solo si orderType != RETAIL — no afecta retail |

### Riesgos Identificados

**1. Stock reduction timing**
- Actual: stock se reduce al crear la Order
- Restaurante: en ingredientes se reduce cuando se prepara, no al ordenar
- Riesgo: logic conflict para recetas en V2
- **MVP:** ignorar control de insumos (solo stock de productos terminados si aplica)

**2. Document generation**
- Actual: genera PDF/XML para SUNAT inmediatamente al crear Order
- Restaurante: documento se genera al cobrar (horas despues)
- Mitigacion: condicionar document generation en `order/actions.ts` para que solo ocurra en COMPLETED con pago

**3. CashShift association**
- Actual: la orden se asocia al CashShift de quien la crea
- Restaurante: el mozo crea la orden pero el cajero cobra
- Mitigacion: separar cashShiftId en orden de restaurante — se asocia al cobrar, no al crear

**4. Real-time latency en KDS**
- 10 segundos de latencia es perceptible en cocina bajo presion
- Mitigacion: empezar con 10s, reducir a 5s si hay quejas; SSE en V1.5

**5. Multi-tenancy isolation**
- Cada nueva tabla incluye companyId y cada query filtra por el
- Riesgo: si se olvida un filtro, datos de un tenant son visibles a otro
- Mitigacion: code review estricto, tests por companyId obligatorios

**6. Pantalla de cocina sin login completo**
- El KDS debe ser accesible con PIN sin login completo
- Riesgo: exponer URL del KDS sin proteccion
- Mitigacion: URL con token de sesion de solo lectura + PIN de 4 digitos configurable

---

## 8. Plan de Implementacion Recomendado

### Fase 1 — Foundation (Semanas 1-2)

1. Migracion Prisma:
   - Nuevos modelos: Table, Zone, KitchenTicket, KitchenTicketItem, DeliveryOrder
   - Nuevos enums: TableStatus, KitchenStatus, DeliveryStatus, OrderType, UserRole
   - Cambios en: Order (orderType, tableId), OrderItem (notes), User (role), Category (order, station)

2. Sistema de tipos:
   - `/src/table/types.ts`
   - `/src/kitchen-ticket/types.ts`
   - `/src/delivery-order/types.ts`

3. Actualizar auth:
   - Agregar role al JWT callback en `src/lib/auth-config.ts`
   - Crear `src/lib/authorization.ts`

### Fase 2 — Core Restaurant Features (Semanas 3-5)

1. Modulo de mesas:
   - `GET /api/tables` — listar mesas con estado
   - `PATCH /api/tables/[id]` — cambiar estado
   - Pagina `/dashboard/mesas` — mapa visual
   - Configuracion en `/settings/company/mesas`

2. Order v2 (dine-in):
   - Modificar `src/order/actions.ts` para crear KitchenTicket automaticamente
   - Validar tableId si orderType = DINE_IN
   - Nueva pagina de toma de pedido para mesa

3. Kitchen ticket API:
   - `GET /api/kitchen-tickets` — listar con filtros
   - `PATCH /api/kitchen-tickets/[id]` — cambiar estado

### Fase 3 — KDS + Real-time (Semanas 6-7)

1. Pantalla KDS:
   - `/dashboard/cocina/kds` — fullscreen, dark mode
   - Componentes KitchenTicketBoard y KitchenTicketCard
   - Acceso con PIN (sin login completo)

2. Polling hooks:
   - `useKitchenTickets` con refetch cada 10s
   - `useTables` con refetch cada 30s

3. Notificaciones visuales en mapa cuando pedido esta listo

### Fase 4 — Delivery + Reportes (Semanas 8-9)

1. Modulo delivery:
   - `/dashboard/delivery` — lista de pedidos externos
   - CRUD de DeliveryOrder
   - Estados y seguimiento

2. Modificadores:
   - Modelos Modifier y ModifierOption
   - UI de configuracion en admin
   - Integracion en toma de pedido

3. Reportes de restaurante:
   - Extension de reportes existentes con filtro por orderType
   - Ventas por mozo, platos mas vendidos, tiempos de servicio

### Estimacion de Esfuerzo

| Fase | Contenido | Estimacion (2-3 devs) |
|------|-----------|----------------------|
| 1 | Foundation + schema | 2 semanas |
| 2 | Core features | 3 semanas |
| 3 | KDS + real-time | 2 semanas |
| 4 | Delivery + reportes | 2 semanas |
| QA y ajustes | — | 2-3 semanas |
| **TOTAL MVP** | | **11-12 semanas** |

---

## 9. Quick Wins (Implementables en < 1 dia)

Estos cambios son aditivos, no rompen nada y sientan las bases:

1. **Agregar role a User (30 min):**
   ```prisma
   User { role UserRole @default(ADMIN) }
   ```
   Actualizar JWT callback. Todos los usuarios existentes → ADMIN.

2. **Agregar orderType y tableId a Order (30 min):**
   ```prisma
   Order { orderType String @default("RETAIL"); tableId String? }
   ```
   No afecta ningun flujo existente.

3. **Agregar notes a OrderItem (15 min):**
   ```prisma
   OrderItem { notes String? }
   ```
   Campo completamente opcional.

4. **Agregar order y station a Category (15 min):**
   ```prisma
   Category { order Int @default(0); station String @default("ALL") }
   ```

5. **Crear endpoint GET /api/tables (1 hora):**
   Lista vacia al principio. No afecta nada existente.
   Listo para que la UI consuma cuando existan mesas.

**Total: ~3 horas de trabajo = 1 migration + 1 commit solido que prepara el terreno**

---

## 10. Decisiones Tecnicas Criticas

| Decision | Opcion Recomendada | Razon |
|----------|-------------------|-------|
| Real-time V1 | Polling con React Query | Sin dependencias extra, suficiente para MVP |
| KDS auth | PIN de 4 digitos + token URL | Sin friction para cocineros, sin login completo |
| OrderType | Campo en Order (no tabla separada) | Mas simple, consultas directas |
| KitchenTicket | Tabla separada | Permite ver todas las comandas de cocina independientemente |
| Stock en restaurante | Ignorar en MVP | Ingredientes/recetas es V2, no bloquea MVP |
| Document generation | Condicional en COMPLETED | No generar PDF hasta que el cliente pague |
| CashShift en DINE_IN | Asociar al cobrar, no al crear | El mozo no opera caja |
| Roles en DB | Si (no solo en JWT) | Permite cambios sin logout, audit trail |

---

## Checklist de Implementacion

### Antes de empezar:
- [ ] Definir si MVP incluye delivery o solo salon
- [ ] Validar que 10 segundos de latencia en KDS es aceptable
- [ ] Crear branch `feat/restaurant-mvp`
- [ ] Planificar database migration con backward compatibility
- [ ] Configurar test database separada para migraciones

### Migracion de schema:
- [ ] Agregar UserRole enum + campo en User
- [ ] Agregar Table + Zone + TableStatus
- [ ] Agregar KitchenTicket + KitchenTicketItem + KitchenStatus
- [ ] Agregar DeliveryOrder + DeliveryStatus
- [ ] Agregar OrderType enum + campos en Order
- [ ] Agregar notes en OrderItem
- [ ] Agregar order + station en Category
- [ ] Crear indices de performance
- [ ] Correr `npx prisma generate` + `npx prisma migrate dev`

### Auth y roles:
- [ ] Actualizar src/lib/auth-config.ts (JWT + session callbacks)
- [ ] Crear src/lib/authorization.ts
- [ ] Proteger rutas del dashboard por rol
- [ ] Proteger Server Actions con validacion de rol

### Core features:
- [ ] API y UI de gestion de mesas
- [ ] Flujo de orden para DINE_IN
- [ ] Creacion automatica de KitchenTicket
- [ ] Pantalla KDS con polling
- [ ] Sistema de notificaciones visuales mozo-cocina
- [ ] Flujo de cobro para mesa (desacoplado de creacion)
- [ ] Delivery basico
- [ ] Reportes extendidos
