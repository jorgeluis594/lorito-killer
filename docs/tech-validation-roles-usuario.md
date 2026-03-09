# Validacion Tecnica: Modulo de Roles de Usuario
## Lorito Killer POS — Analisis de Viabilidad y Plan de Implementacion

**Version:** 1.0
**Fecha:** 2026-03-07
**Estado:** Validacion tecnica completada
**Analisis basado en:** rama `user-roles`, commit `65e0a9b`

---

## 1. Estado Actual del Sistema

### 1.1 Autenticacion (JWT + Session)

**`src/lib/auth-config.ts`** — NextAuth con CredentialsProvider (email/password):

```typescript
// ACTUAL - Sin roles
callbacks: {
  jwt: async ({ token, user }) => {
    if (user?.id) token.userId = user.id;
    return { ...token, user: user };
  },
  session: async ({ session, token, user }) => {
    // Retorna user SIN role
    return {
      ...session,
      user: {
        ...session.user,
        id: persistedUser.data.id,
        name: persistedUser.data.name,
        email: persistedUser.data.email,
        companyId: persistedUser.data.companyId,
        // ← SIN CAMPO "role"
      },
    };
  },
}
```

**`src/lib/auth.ts`** — Tipo Session actual:

```typescript
type Session = {
  user:
    | { name: string; email: string; id: string; companyId: string }
    | undefined;
  // ← SIN role, SIN active
};
```

### 1.2 Modelo User Actual (Prisma)

**`prisma/schema.prisma`** (lineas 290-301):

```prisma
model User {
  id             String          @id @default(uuid())
  companyId      String?
  company        Company?        @relation(fields: [companyId], references: [id])
  email          String          @unique
  password       String
  name           String?
  cashShifts     CashShift[]
  stockTransfers StockTransfer[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  // FALTA: role, active, pin
}
```

### 1.3 Tipo User Actual

**`src/user/types.ts`:**

```typescript
export type User = {
  id: string;
  companyId: string;
  name?: string | null;
  email: string;
  // FALTA: role, active, pin
};
```

### 1.4 Middleware Actual

**`src/middleware.ts`:**
- Lee token JWT con `getToken({ req })`
- Redirige a `/login` si no autenticado
- Reescribe URLs por subdomain
- **NO** valida roles
- **NO** tiene rutas basadas en permisos

### 1.5 Archivos que Usan `getSession`

Todos estos necesitaran proteccion de roles:

| Archivo | Uso Actual | Proteccion Requerida |
|---------|-----------|---------------------|
| `src/user/actions.ts` | createUser, changePassword | ADMIN para create |
| `src/order/actions.ts` | Crear ordenes | CASHIER, WAITER, ADMIN |
| `src/product/actions.ts` | hideProduct | ADMIN |
| `src/category/actions.ts` | CRUD categorias | ADMIN |
| `src/customer/actions.ts` | Manejo clientes | ADMIN, CASHIER |
| `src/cash-shift/components/actions.ts` | Turnos de caja | CASHIER, ADMIN |
| `src/stock-transfer/components/actions.ts` | Stock | ADMIN |
| `src/company/components/actions.ts` | Config empresa | ADMIN |
| `src/app/api/products/route.ts` | GET/POST productos | ADMIN |
| `src/app/api/cash_shifts/route.ts` | Turnos de caja | CASHIER, ADMIN |
| `src/app/api/orders/[id]/documents/route.ts` | Documentos SUNAT | CASHIER, ADMIN |
| `src/app/api/products/export/route.ts` | Exportar productos | ADMIN |
| `src/app/[subdomain]/dashboard/layout.tsx` | Layout principal | Todos (filtrar nav) |

### 1.6 Dependencias Relevantes Instaladas

- `next-auth@4.24.10` — autenticacion
- `@prisma/client@5.19.0` — ORM
- `bcrypt@5.1.1` — hash passwords
- `zod@3.22.4` — validacion de schemas
- `zustand@4.5.2` — state management
- `@tanstack/react-table` — tablas de datos
- `sonner` — toasts/notificaciones
- **NO** tiene `@tanstack/react-query` (relevante para polling)

---

## 2. Cambios Requeridos en Schema (Prisma)

### 2.1 Nuevo Enum UserRole

```prisma
enum UserRole {
  ADMIN       // Dueno/gerente — control total
  CASHIER     // Cajero — ventas, pagos, caja
  WAITER      // Mozo — pedidos, mesas
  KITCHEN     // Cocinero — solo KDS
  BARTENDER   // Bartender — KDS filtrado barra
}
```

### 2.2 Modelo User Actualizado

```prisma
model User {
  id             String          @id @default(uuid())
  companyId      String?
  company        Company?        @relation(fields: [companyId], references: [id])
  email          String          @unique
  password       String
  name           String?
  role           UserRole        @default(ADMIN)   // NUEVO
  active         Boolean         @default(true)    // NUEVO — soft delete
  pin            String?                           // NUEVO — para KITCHEN/BARTENDER
  cashShifts     CashShift[]
  stockTransfers StockTransfer[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@index([companyId, role])
  @@index([companyId, active])
}
```

### 2.3 Migracion SQL

```sql
-- Migracion: add_user_roles

-- 1. Crear enum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CASHIER', 'WAITER', 'KITCHEN', 'BARTENDER');

-- 2. Agregar columnas
ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "pin" TEXT;

-- 3. Todos los usuarios existentes → ADMIN (ya cubierto por default)

-- 4. Indices de performance
CREATE INDEX "idx_user_company_role" ON "User"("companyId", "role");
CREATE INDEX "idx_user_company_active" ON "User"("companyId", "active");
```

### 2.4 Ejecutar Migracion

```bash
npx prisma migrate dev --name add_user_roles
npx prisma generate
```

---

## 3. Cambios en el Sistema de Autenticacion

### 3.1 Actualizar `src/lib/auth-config.ts`

```typescript
// Cambio 1: JWT callback — incluir role en token
jwt: async ({ token, user }) => {
  if (user?.id) {
    token.userId = user.id;
    token.role = (user as any).role;     // NUEVO
    token.active = (user as any).active; // NUEVO
  }
  return { ...token, user: user };
},

// Cambio 2: Session callback — incluir role en session
session: async ({ session, token, user }) => {
  if (!session.user) return session;
  const persistedUser = await getUserByEmail(session.user.email!);
  if (!persistedUser.success) return { ...session, user: undefined };

  // NUEVO: Bloquear usuarios desactivados
  if (!persistedUser.data.active) {
    return { ...session, user: undefined };
  }

  return {
    ...session,
    user: {
      ...session.user,
      id: persistedUser.data.id,
      name: persistedUser.data.name,
      email: persistedUser.data.email,
      companyId: persistedUser.data.companyId,
      role: persistedUser.data.role,       // NUEVO
      active: persistedUser.data.active,   // NUEVO
    },
  };
},
```

**Nota:** `getUserByEmail` en `src/user/db_repository.ts` debe retornar `role` y `active`. Actualmente retorna todos los campos de Prisma, asi que solo hace falta actualizar el tipo `CreateUserParams`.

### 3.2 Actualizar `src/lib/auth.ts`

```typescript
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth-config";

export type UserRole = "ADMIN" | "CASHIER" | "WAITER" | "KITCHEN" | "BARTENDER";

type Session = {
  user:
    | {
        name: string;
        email: string;
        id: string;
        companyId: string;
        role: UserRole;    // NUEVO
        active: boolean;   // NUEVO
      }
    | undefined;
  name: string;
  email: string;
  sub: string;
  iat: number;
  exp: number;
  jti: string;
};

export const getSession = async (): Promise<Session> => {
  return (await getServerSession(authConfig)) as Session;
};
```

### 3.3 Nuevo Archivo: `src/lib/authorization.ts`

```typescript
import { type UserRole } from "@/lib/auth";

// Permisos granulares del sistema
export type Permission =
  // Usuarios
  | "MANAGE_USERS"
  | "VIEW_USERS"
  // Productos
  | "MANAGE_PRODUCTS"
  | "VIEW_PRODUCTS"
  // Categorias
  | "MANAGE_CATEGORIES"
  // Ordenes
  | "CREATE_ORDER"
  | "VIEW_ORDERS"
  | "CANCEL_ORDER"
  // Pagos
  | "PROCESS_PAYMENT"
  // Caja
  | "MANAGE_CASH_SHIFT"
  // Mesas
  | "MANAGE_TABLES"
  | "VIEW_TABLES"
  // Cocina
  | "VIEW_KITCHEN"
  // Reportes
  | "VIEW_REPORTS"
  | "EXPORT_DATA"
  // Empresa
  | "MANAGE_COMPANY"
  // Clientes
  | "MANAGE_CUSTOMERS"
  // Delivery
  | "MANAGE_DELIVERY"
  | "VIEW_DELIVERY";

// Mapa de permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "MANAGE_USERS", "VIEW_USERS",
    "MANAGE_PRODUCTS", "VIEW_PRODUCTS",
    "MANAGE_CATEGORIES",
    "CREATE_ORDER", "VIEW_ORDERS", "CANCEL_ORDER",
    "PROCESS_PAYMENT",
    "MANAGE_CASH_SHIFT",
    "MANAGE_TABLES", "VIEW_TABLES",
    "VIEW_KITCHEN",
    "VIEW_REPORTS", "EXPORT_DATA",
    "MANAGE_COMPANY",
    "MANAGE_CUSTOMERS",
    "MANAGE_DELIVERY", "VIEW_DELIVERY",
  ],
  CASHIER: [
    "VIEW_PRODUCTS",
    "CREATE_ORDER", "VIEW_ORDERS", "CANCEL_ORDER",
    "PROCESS_PAYMENT",
    "MANAGE_CASH_SHIFT",
    "VIEW_TABLES",
    "VIEW_DELIVERY", "MANAGE_DELIVERY",
    "MANAGE_CUSTOMERS",
  ],
  WAITER: [
    "VIEW_PRODUCTS",
    "CREATE_ORDER", "VIEW_ORDERS",
    "VIEW_TABLES", "MANAGE_TABLES",
  ],
  KITCHEN: [
    "VIEW_KITCHEN",
  ],
  BARTENDER: [
    "VIEW_KITCHEN",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Valida que el usuario tenga un permiso especifico.
 * Lanza error si no lo tiene. Usar en server actions.
 */
export async function requirePermission(permission: Permission) {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();

  if (!session?.user) {
    throw new Error("No autenticado");
  }

  if (!session.user.active) {
    throw new Error("Usuario desactivado");
  }

  if (!hasPermission(session.user.role, permission)) {
    throw new Error(`Sin permiso: ${permission}`);
  }

  return session.user;
}

/**
 * Valida que el usuario tenga uno de los roles especificados.
 * Usar en server actions.
 */
export async function requireRole(...roles: UserRole[]) {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();

  if (!session?.user) {
    throw new Error("No autenticado");
  }

  if (!session.user.active) {
    throw new Error("Usuario desactivado");
  }

  if (!roles.includes(session.user.role)) {
    throw new Error(`Rol ${session.user.role} no autorizado`);
  }

  return session.user;
}
```

---

## 4. Cambios en el Middleware

### 4.1 Actualizar `src/middleware.ts`

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).+)",
    "/dashboard/:path*",
  ],
};

// Rutas permitidas por rol (prefijos)
const ROLE_ALLOWED_ROUTES: Record<string, string[]> = {
  ADMIN: ["/dashboard"],  // acceso total
  CASHIER: [
    "/dashboard/orders",
    "/dashboard/cash_shifts",
    "/dashboard/settings", // solo su perfil
  ],
  WAITER: [
    "/dashboard/mesas",
    "/dashboard/orders",
    "/dashboard/settings", // solo su perfil
  ],
  KITCHEN: [
    "/dashboard/cocina",
    "/kitchen",
  ],
  BARTENDER: [
    "/dashboard/cocina",
    "/kitchen",
  ],
};

// Pantalla inicial por rol
const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard",
  CASHIER: "/dashboard/orders/new",
  WAITER: "/dashboard/mesas",
  KITCHEN: "/dashboard/cocina/kds",
  BARTENDER: "/dashboard/cocina/kds?station=bar",
};

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host")!;

  const subdomain =
    process.env.PREVIEW === "true" ? "fantastidog" : hostname.split(".")[0];

  const token = await getToken({ req });

  // Sin token → redirect a login
  if (
    !token &&
    url.pathname.startsWith("/dashboard") &&
    !url.pathname.startsWith("/login")
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // NUEVO: Validacion de usuario activo
  if (token && token.active === false) {
    return NextResponse.redirect(new URL("/login?error=inactive", req.url));
  }

  // NUEVO: Validacion de rutas por rol
  if (token?.role && url.pathname.startsWith("/dashboard")) {
    const role = token.role as string;
    const allowedRoutes = ROLE_ALLOWED_ROUTES[role] || [];

    // ADMIN tiene acceso total a /dashboard
    if (role !== "ADMIN") {
      const hasAccess = allowedRoutes.some((route) =>
        url.pathname.startsWith(route)
      );

      if (!hasAccess) {
        const homeRoute = ROLE_HOME[role] || "/dashboard";
        return NextResponse.redirect(new URL(homeRoute, req.url));
      }
    }
  }

  return NextResponse.rewrite(
    new URL(
      `/${subdomain}${url.pathname}?${url.searchParams.toString()}`,
      req.url,
    ),
  );
}
```

---

## 5. Cambios en Server Actions

### 5.1 Patron Reutilizable

```typescript
// PATRON A: requirePermission
"use server";
import { requirePermission } from "@/lib/authorization";

export const createCategory = async (data: CategoryInput) => {
  try {
    await requirePermission("MANAGE_CATEGORIES");
    // ... logica existente
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
```

```typescript
// PATRON B: requireRole
"use server";
import { requireRole } from "@/lib/authorization";

export const hideProduct = async (productId: string) => {
  try {
    await requireRole("ADMIN");
    // ... logica existente
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
```

### 5.2 Server Actions que Necesitan Proteccion

| Archivo | Accion | Proteccion | Prioridad |
|---------|--------|-----------|-----------|
| `src/user/actions.ts` | createUser | requireRole("ADMIN") | P0 |
| `src/user/actions.ts` | updateUser | requireRole("ADMIN") | P0 |
| `src/user/actions.ts` | changePassword | Autenticado (self) | P1 |
| `src/product/actions.ts` | hideProduct | requireRole("ADMIN") | P1 |
| `src/category/actions.ts` | * | requirePermission("MANAGE_CATEGORIES") | P1 |
| `src/order/actions.ts` | create | requirePermission("CREATE_ORDER") | P0 |
| `src/order/actions.ts` | cancel | requirePermission("CANCEL_ORDER") | P1 |
| `src/cash-shift/components/actions.ts` | * | requirePermission("MANAGE_CASH_SHIFT") | P0 |
| `src/company/components/actions.ts` | * | requirePermission("MANAGE_COMPANY") | P1 |
| `src/stock-transfer/components/actions.ts` | * | requireRole("ADMIN") | P2 |
| `src/customer/actions.ts` | * | requirePermission("MANAGE_CUSTOMERS") | P2 |

### 5.3 Ejemplo Concreto: Proteger `src/user/actions.ts`

```typescript
"use server";

import registerUser from "@/user/use-cases/createUser";
import * as repository from "@/user/db_repository";
import { response } from "@/lib/types";
import { User } from "@/user/types";
import { getSession } from "@/lib/auth";
import { requireRole } from "@/lib/authorization";
import bcrypt from "bcrypt";

export const createUser = async (
  companyId: string,
  email: string,
  password: string,
  role?: string,        // NUEVO: rol opcional
): Promise<response<User>> => {
  try {
    // NUEVO: Solo ADMIN puede crear usuarios
    await requireRole("ADMIN");

    const createdUserResponse = await registerUser(repository, {
      companyId,
      email,
      password,
      // role, // pasar al use case
    });

    if (!createdUserResponse.success) {
      return { success: false, message: createdUserResponse.message };
    }

    return createdUserResponse;
  } catch (error: any) {
    return { success: false, message: error.message || "No autorizado" };
  }
};
```

---

## 6. Nuevos Endpoints/Actions para CRUD de Usuarios

### 6.1 Server Actions — `src/user/admin-actions.ts`

```typescript
"use server";

import { requirePermission, requireRole } from "@/lib/authorization";
import { response } from "@/lib/types";
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { getSession } from "@/lib/auth";

export type UserListItem = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  active: boolean;
  createdAt: Date;
};

export const listUsers = async (): Promise<response<UserListItem[]>> => {
  try {
    const user = await requirePermission("VIEW_USERS");

    const users = await prisma().user.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true, email: true, name: true,
        role: true, active: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: users };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const createUserAdmin = async (data: {
  email: string;
  password: string;
  name: string;
  role: string;
}): Promise<response<UserListItem>> => {
  try {
    const admin = await requireRole("ADMIN");
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await prisma().user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role as any,
        active: true,
        companyId: admin.companyId,
      },
      select: {
        id: true, email: true, name: true,
        role: true, active: true, createdAt: true,
      },
    });

    return { success: true, data: newUser };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const updateUserAdmin = async (
  userId: string,
  data: { name?: string; role?: string; email?: string },
): Promise<response<UserListItem>> => {
  try {
    const admin = await requireRole("ADMIN");

    // No puede cambiar su propio rol
    if (userId === admin.id && data.role) {
      return { success: false, message: "No puedes cambiar tu propio rol" };
    }

    const updated = await prisma().user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.role && { role: data.role as any }),
        ...(data.email && { email: data.email }),
      },
      select: {
        id: true, email: true, name: true,
        role: true, active: true, createdAt: true,
      },
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const toggleUserActive = async (
  userId: string,
): Promise<response<UserListItem>> => {
  try {
    const admin = await requireRole("ADMIN");

    // No puede desactivarse a si mismo
    if (userId === admin.id) {
      return { success: false, message: "No puedes desactivarte a ti mismo" };
    }

    const user = await prisma().user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, message: "Usuario no encontrado" };

    const updated = await prisma().user.update({
      where: { id: userId },
      data: { active: !user.active },
      select: {
        id: true, email: true, name: true,
        role: true, active: true, createdAt: true,
      },
    });

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const resetUserPassword = async (
  userId: string,
  newPassword: string,
): Promise<response<void>> => {
  try {
    await requireRole("ADMIN");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma().user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, data: undefined };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
```

---

## 7. Cambios en Componentes UI

### 7.1 Layout del Dashboard

**`src/app/[subdomain]/dashboard/layout.tsx`** — Debe pasar el rol al sidebar para filtrar navegacion.

### 7.2 Sidebar Condicional

**`src/constants/data.ts`** — Agregar mapa de navItems por rol:

```typescript
import { type UserRole } from "@/lib/auth";

export const navItemsByRole: Record<UserRole, NavItem[]> = {
  ADMIN: navItems,  // acceso completo
  CASHIER: [
    { title: "Nueva venta", href: "/dashboard/orders/new", icon: "shoppingCart" },
    { title: "Comprobantes", href: "/dashboard/orders", icon: "receipt" },
    { title: "Caja chica", href: "/dashboard/cash_shifts", icon: "cashRegister" },
  ],
  WAITER: [
    { title: "Mesas", href: "/dashboard/mesas", icon: "table" },
    { title: "Mis pedidos", href: "/dashboard/orders", icon: "receipt" },
  ],
  KITCHEN: [
    { title: "Cocina", href: "/dashboard/cocina/kds", icon: "kitchen" },
  ],
  BARTENDER: [
    { title: "Barra", href: "/dashboard/cocina/kds?station=bar", icon: "bar" },
  ],
};
```

### 7.3 Nuevas Paginas Necesarias

```
/src/app/[subdomain]/dashboard/(dashboard)/settings/users/page.tsx        — Lista usuarios
/src/app/[subdomain]/dashboard/(dashboard)/settings/users/new/page.tsx    — Crear usuario
/src/app/[subdomain]/dashboard/(dashboard)/settings/users/[id]/page.tsx   — Editar usuario
```

### 7.4 Settings Nav

**`src/shared/settings-nav-items.tsx`** — Agregar item "Usuarios" visible solo para ADMIN.

---

## 8. Impacto en Codigo Existente (Breaking Changes)

### 8.1 Archivos que Necesitan Actualizacion de Tipo User

| Archivo | Cambio | Severidad |
|---------|--------|-----------|
| `src/user/types.ts` | Agregar `role`, `active`, `pin` | BAJA |
| `src/lib/auth.ts` | Agregar `role`, `active` a Session | BAJA |
| `src/user/db_repository.ts` | Retornar `role`, `active` en queries | BAJA |
| `src/user/use-cases/createUser.ts` | Aceptar `role` en params | BAJA |
| `src/lib/use-user-session.ts` | Automatico (usa Session type) | NINGUNA |

### 8.2 Backward Compatibility

| Cambio | Rompe Retail? | Razon |
|--------|--------------|-------|
| User.role con default ADMIN | NO | Todos existentes → ADMIN |
| User.active con default true | NO | Todos existentes → activos |
| User.pin nullable | NO | Campo opcional |
| OrderStatus enum ampliado | NO | Additive |
| Middleware con rutas por rol | NO | ADMIN tiene acceso total |
| requirePermission en actions | NO | ADMIN tiene todos los permisos |

**Conclusion:** Ningun cambio rompe funcionalidad existente para tenants retail. Todos los usuarios existentes se convierten en ADMIN con acceso total.

---

## 9. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|-----------|
| Escalacion de privilegios | MEDIA | ALTO | Validar en CADA server action con requirePermission |
| Token JWT con role desactualizado | BAJA | MEDIO | Session callback consulta DB cada vez |
| Usuario desactivado con sesion activa | MEDIA | MEDIO | Verificar `active` en session callback |
| Olvidar proteger un server action | ALTA | ALTO | Code review checklist + tests |
| Cocinero sin email intenta login | BAJA | BAJO | PIN auth separado para KITCHEN |
| Admin se desactiva a si mismo | BAJA | ALTO | Validacion: no puede desactivarse a si mismo |

### Mitigacion Critica: Session Callback Verifica DB

El session callback en `auth-config.ts` ya consulta `getUserByEmail` en cada request. Al incluir `active` y `role` de DB (no del token), garantizamos que:
- Si un admin desactiva a un usuario, su proxima peticion falla
- Si se cambia el rol, se refleja inmediatamente

---

## 10. Plan de Implementacion por Fases

### Fase 1 — Schema + Auth (3-4 horas)

**Quick wins que no rompen nada:**

1. Agregar `UserRole` enum + campos `role`, `active`, `pin` al schema
2. Ejecutar migracion Prisma
3. Actualizar `src/user/types.ts` con nuevos campos
4. Actualizar `src/lib/auth.ts` con tipo Session extendido
5. Actualizar `src/lib/auth-config.ts` (JWT + session callbacks)
6. Crear `src/lib/authorization.ts`

**Verificacion:**
```bash
npx prisma migrate dev --name add_user_roles
npm run build  # verificar tipos
# Login → verificar que session incluye role: "ADMIN"
```

### Fase 2 — Middleware + Proteccion de Rutas (4 horas)

1. Actualizar `src/middleware.ts` con validacion por rol
2. Actualizar `src/constants/data.ts` con navItems por rol
3. Modificar sidebar para filtrar por rol
4. Agregar pagina de acceso denegado (opcional, puede ser redirect)

### Fase 3 — CRUD de Usuarios UI (8 horas)

1. Crear `src/user/admin-actions.ts`
2. Crear pagina `/dashboard/settings/users` (lista)
3. Crear pagina `/dashboard/settings/users/new` (formulario)
4. Crear pagina `/dashboard/settings/users/[id]` (editar)
5. Agregar "Usuarios" al settings nav (solo ADMIN)

### Fase 4 — Proteccion de Server Actions (4 horas)

1. Agregar `requirePermission` o `requireRole` a cada action
2. Testing: intentar cada action con diferentes roles
3. Verificar que retail sigue funcionando

### Estimacion Total

| Fase | Contenido | Esfuerzo |
|------|-----------|----------|
| 1 | Schema + Auth | 3-4 horas |
| 2 | Middleware + Rutas | 4 horas |
| 3 | CRUD Usuarios UI | 8 horas |
| 4 | Proteccion Actions | 4 horas |
| Testing | E2E por rol | 4 horas |
| **TOTAL** | | **~24 horas (3-4 dias)** |

---

## 11. Archivos a Crear vs Modificar

### Archivos Nuevos

```
src/lib/authorization.ts                                            — Sistema de permisos
src/user/admin-actions.ts                                           — CRUD de usuarios
src/app/[subdomain]/dashboard/(dashboard)/settings/users/page.tsx   — Lista usuarios
src/app/[subdomain]/dashboard/(dashboard)/settings/users/new/page.tsx — Crear usuario
src/app/[subdomain]/dashboard/(dashboard)/settings/users/[id]/page.tsx — Editar usuario
prisma/migrations/XXXXXXXXXX_add_user_roles/migration.sql           — Migracion DB
```

### Archivos a Modificar

```
prisma/schema.prisma              — Agregar UserRole enum + campos
src/lib/auth.ts                   — Tipo Session con role
src/lib/auth-config.ts            — JWT + session callbacks
src/middleware.ts                  — Validacion de rutas por rol
src/user/types.ts                 — User type con role, active, pin
src/user/db_repository.ts         — Retornar nuevos campos
src/user/actions.ts               — Agregar requireRole
src/constants/data.ts             — navItems por rol
src/shared/settings-nav-items.tsx — Agregar item "Usuarios"
src/product/actions.ts            — Agregar requireRole
src/category/actions.ts           — Agregar requirePermission
src/order/actions.ts              — Agregar requirePermission
src/cash-shift/components/actions.ts — Agregar requirePermission
src/company/components/actions.ts — Agregar requirePermission
src/stock-transfer/components/actions.ts — Agregar requireRole
src/customer/actions.ts           — Agregar requirePermission
```

---

## 12. Conclusion

### Viabilidad Tecnica: ALTA

- El stack actual (NextAuth + Prisma + Next.js middleware) soporta roles nativamente
- Los cambios son **aditivos** — no rompen funcionalidad existente
- El patron `requirePermission`/`requireRole` es simple y reutilizable
- La migracion de DB es segura (default ADMIN para existentes)

### Riesgo General: BAJO

- Backward compatible con tenants retail
- Sin dependencias externas nuevas
- Sin breaking changes en la API
- Session callback ya consulta DB (role siempre actualizado)
