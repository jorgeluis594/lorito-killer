# UX / Flujos de Usuario y Wireframes — Modulo de Roles de Usuario
## Lorito Killer POS — Sistema de Roles y Permisos

**Version:** 1.0
**Fecha:** 2026-03-07
**Branch:** `user-roles`
**Base de codigo:** Next.js App Router + shadcn/ui + Tailwind CSS + NextAuth

---

## Tabla de Contenido

1. [Contexto y Principios](#1-contexto-y-principios)
2. [Flujo de Login y Redireccion por Rol](#2-flujo-de-login-y-redireccion-por-rol)
3. [Flujo del Admin: Gestion de Usuarios](#3-flujo-del-admin-gestion-de-usuarios)
4. [Navegacion Condicional por Rol](#4-navegacion-condicional-por-rol)
5. [Flujo del Cocinero: Acceso Simplificado con PIN](#5-flujo-del-cocinero-acceso-simplificado-con-pin)
6. [Wireframes de Pantallas Clave](#6-wireframes-de-pantallas-clave)
7. [Estados y Feedback Visual](#7-estados-y-feedback-visual)
8. [Responsividad](#8-responsividad)

---

## 1. Contexto y Principios

### Modelo de datos actual (referencia)

El modelo `User` en Prisma actualmente no tiene campo de rol ni PIN.
Se requiere agregar los siguientes campos:

```
model User {
  id             String          @id @default(uuid())
  companyId      String?
  company        Company?        @relation(fields: [companyId], references: [id])
  email          String          @unique
  password       String
  name           String?
  role           UserRole        @default(ADMIN)      // NUEVO
  pin            String?                               // NUEVO (hash 4 digitos)
  active         Boolean         @default(true)        // NUEVO
  lastActivityAt DateTime?                             // NUEVO
  cashShifts     CashShift[]
  stockTransfers StockTransfer[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

enum UserRole {
  ADMIN
  CASHIER
  WAITER
  KITCHEN
  BARTENDER
}
```

### Principios UX aplicados a este modulo

```
PRINCIPIO                APLICACION EN ROLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
P1. Max 3 toques      →  Login: 2 campos + boton = 3 toques
                          PIN cocina: 4 toques (digitos) + 0 (auto-submit)
                          Crear usuario: abrir modal + llenar + guardar = 3 pasos

P2. Botones gorila    →  Boton login: 56px alto, ancho completo
                          Teclado PIN: botones 80x80px (monitor cocina)
                          Acciones en tabla usuarios: iconos 44px

P3. Feedback rapido   →  Toast al crear/editar/desactivar usuario
                          Badge de color por rol siempre visible
                          Shake animation en PIN incorrecto

P4. Confirmaciones    →  SIN confirmacion: cambiar rol, editar nombre
                          CON confirmacion: desactivar usuario, resetear password

P5. Recuperacion      →  Reactivar usuario desactivado con un toque
                          Acceso denegado con boton directo a pantalla de inicio

P6. Vistas por rol    →  Sidebar filtrado, rutas protegidas, redirecciones
                          Cocina: sin sidebar, fullscreen KDS

P7. Landscape tablet  →  Tabla de usuarios: columnas completas en landscape
                          PIN cocina: teclado centrado en landscape
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Mapa de rutas por rol

```
RUTA                                    ADMIN  CASHIER  WAITER  KITCHEN  BARTENDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/login                                    ●       ●       ●       -        -
/login/kitchen                            -       -       -       ●        ●
/dashboard                                ●       -       -       -        -
/dashboard/mesas                          ●       ●       ●       -        -
/dashboard/orders/new                     ●       ●       ●       -        -
/dashboard/orders                         ●       ●       -       -        -
/dashboard/cash_shifts                    ●       ●       -       -        -
/dashboard/products                       ●       -       -       -        -
/dashboard/stock_adjustments              ●       -       -       -        -
/dashboard/sales_reports                  ●       -       -       -        -
/dashboard/cocina/kds                     ●       -       -       ●        ●
/dashboard/settings                       ●       -       -       -        -
/dashboard/settings/company               ●       -       -       -        -
/dashboard/settings/users                 ●       -       -       -        -
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● = acceso permitido     - = acceso denegado
```

### Pantalla inicial por rol

```
ROL          PANTALLA INICIAL              JUSTIFICACION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMIN        /dashboard                    KPIs y vision global
CASHIER      /dashboard/mesas              Mapa de mesas (vista cobro)
WAITER       /dashboard/mesas              Mapa de mesas (su zona)
KITCHEN      /dashboard/cocina/kds          KDS comandas activas
BARTENDER    /dashboard/cocina/kds?bar=1    KDS filtrado por barra
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 2. Flujo de Login y Redireccion por Rol

### 2.1 Diagrama de flujo completo

```
                          ┌─────────────────────┐
                          │   USUARIO ABRE APP   │
                          │  [subdomain].lorito  │
                          └──────────┬──────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │  ¿Tiene sesion       │
                          │   activa (token)?    │
                          └──────────┬──────────┘
                                     │
                          ┌──────────┴──────────┐
                          │                     │
                       SI ▼                  NO ▼
              ┌─────────────────┐    ┌─────────────────────┐
              │  Obtener rol    │    │  ¿Es ruta /login     │
              │  del usuario    │    │   /kitchen?           │
              └────────┬────────┘    └──────────┬──────────┘
                       │                        │
                       ▼               ┌────────┴────────┐
              ┌─────────────────┐      │                 │
              │  Redirigir a    │   SI ▼              NO ▼
              │  pantalla       │  ┌────────────┐  ┌────────────────┐
              │  inicial del    │  │ Mostrar    │  │ Redirigir a    │
              │  rol            │  │ pantalla   │  │ /login         │
              └─────────────────┘  │ de selec-  │  │ (con callbackUrl)│
                                   │ cion PIN   │  └────────┬───────┘
                                   └──────┬─────┘           │
                                          │                 ▼
                                          │       ┌─────────────────────┐
                                          │       │   PANTALLA LOGIN    │
                                          │       │   Email + Password  │
                                          │       └──────────┬──────────┘
                                          │                  │
                                          │                  ▼
                                          │       ┌─────────────────────┐
                                          │       │  Validar campos     │
                                          │       │  (Zod client-side)  │
                                          │       └──────────┬──────────┘
                                          │                  │
                                          │         ┌────────┴────────┐
                                          │         │                 │
                                          │      VALIDO          INVALIDO
                                          │         │                 │
                                          │         ▼                 ▼
                                          │  ┌──────────────┐  ┌──────────────┐
                                          │  │ signIn()     │  │ Mostrar      │
                                          │  │ NextAuth     │  │ error en     │
                                          │  │ credentials  │  │ campo        │
                                          │  └──────┬───────┘  │ especifico   │
                                          │         │          └──────────────┘
                                          │    ┌────┴────────┐
                                          │    │             │
                                          │  OK           ERROR
                                          │    │             │
                                          │    ▼             ▼
                                          │ ┌───────────┐ ┌──────────────────┐
                                          │ │ Obtener   │ │ ¿Tipo de error?  │
                                          │ │ user.role │ └────────┬─────────┘
                                          │ │ del token │     ┌────┴────────┐
                                          │ └─────┬─────┘     │             │
                                          │       │       CREDENCIALES  CUENTA
                                          │       │       INVALIDAS    INACTIVA
                                          │       │           │             │
                                          │       │           ▼             ▼
                                          │       │    ┌────────────┐ ┌────────────┐
                                          │       │    │"Email o    │ │"Tu cuenta  │
                                          │       │    │ contrasena │ │ esta       │
                                          │       │    │ incorrectos│ │ desactivada│
                                          │       │    │"           │ │ Contacta   │
                                          │       │    │            │ │ al admin"  │
                                          │       │    │[Reintentar]│ │            │
                                          │       │    └────────────┘ └────────────┘
                                          │       │
                                          │       ▼
                                          │  ┌──────────────────────────────┐
                                          │  │       SWITCH (user.role)     │
                                          │  └──────────────┬───────────────┘
                                          │                 │
                          ┌───────────────┼─────────────────┼─────────────────┐
                          │               │                 │                 │
                       ADMIN          CASHIER           WAITER         (KITCHEN/
                          │               │                 │          BARTENDER
                          ▼               ▼                 ▼          no usan
                   ┌────────────┐  ┌────────────┐  ┌────────────┐    este flujo)
                   │ /dashboard │  │ /dashboard │  │ /dashboard │
                   │ (KPIs)     │  │ /mesas     │  │ /mesas     │
                   └────────────┘  └────────────┘  └────────────┘
```

### 2.2 Wireframe: Pantalla de Login (Email + Password)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                                                                          │
│    ┌─────────────────────────────┐    ┌────────────────────────────────┐  │
│    │                             │    │                                │  │
│    │                             │    │     Iniciar sesion             │  │
│    │                             │    │                                │  │
│    │        ┌───────────┐        │    │     Ingresa tu email y         │  │
│    │        │           │        │    │     contrasena para            │  │
│    │        │   LOGO    │        │    │     iniciar sesion             │  │
│    │        │  KOGOZ    │        │    │                                │  │
│    │        │           │        │    │  ┌──────────────────────────┐  │  │
│    │        └───────────┘        │    │  │ Email                   │  │  │
│    │                             │    │  │ ┌──────────────────────┐ │  │  │
│    │                             │    │  │ │ ejemplo@gmail.com    │ │  │  │
│    │                             │    │  │ └──────────────────────┘ │  │  │
│    │                             │    │  └──────────────────────────┘  │  │
│    │                             │    │                                │  │
│    │                             │    │  ┌──────────────────────────┐  │  │
│    │                             │    │  │ Contrasena              │  │  │
│    │                             │    │  │ ┌──────────────────────┐ │  │  │
│    │                             │    │  │ │ ••••••••         [o] │ │  │  │
│    │                             │    │  │ └──────────────────────┘ │  │  │
│    │                             │    │  └──────────────────────────┘  │  │
│    │                             │    │                                │  │
│    │                             │    │  ┌──────────────────────────┐  │  │
│    │                             │    │  │                          │  │  │
│    │                             │    │  │    INICIAR SESION        │  │  │
│    │                             │    │  │    [56px alto]           │  │  │
│    │                             │    │  │                          │  │  │
│    │                             │    │  └──────────────────────────┘  │  │
│    │                             │    │                                │  │
│    │                             │    │  ┌──────────────────────────┐  │  │
│    │                             │    │  │ ¿Eres de cocina?        │  │  │
│    │                             │    │  │ Ingresa con tu PIN →    │  │  │
│    │                             │    │  └──────────────────────────┘  │  │
│    │                             │    │                                │  │
│    └─────────────────────────────┘    └────────────────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
  Layout: 2 columnas en desktop (lg:grid-cols-2)
  Columna izquierda: Logo centrado con fondo muted
  Columna derecha: Formulario centrado (max-w: 350px)
```

### 2.3 Wireframe: Estado de error — Credenciales invalidas

```
┌────────────────────────────────────┐
│                                    │
│     Iniciar sesion                 │
│                                    │
│     Ingresa tu email y             │
│     contrasena para                │
│     iniciar sesion                 │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Email                        │  │
│  │ ┌──────────────────────────┐ │  │
│  │ │ juan@restaurante.com     │ │  │
│  │ └──────────────────────────┘ │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Contrasena                   │  │
│  │ ┌──────────────────────────┐ │  │
│  │ │ ••••••                   │ │  │
│  │ └──────────────────────────┘ │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ ⚠ Email o contrasena        │  │
│  │   incorrectos               │  │
│  └──────────────────────────────┘  │
│  (texto rojo, text-destructive)    │
│                                    │
│  ┌──────────────────────────────┐  │
│  │    INICIAR SESION            │  │
│  └──────────────────────────────┘  │
│                                    │
└────────────────────────────────────┘
```

### 2.4 Wireframe: Estado de error — Cuenta desactivada

```
┌────────────────────────────────────┐
│                                    │
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │  ┌────┐                      │  │
│  │  │ !  │  Tu cuenta esta      │  │
│  │  └────┘  desactivada         │  │
│  │                              │  │
│  │  Contacta al administrador   │  │
│  │  del restaurante para        │  │
│  │  reactivar tu acceso.        │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│  (Alert variant="destructive")     │
│  (Reemplaza el formulario          │
│   despues de detectar active=false │
│   en la respuesta de authorize)    │
│                                    │
│  ┌──────────────────────────────┐  │
│  │    VOLVER A INTENTAR         │  │
│  └──────────────────────────────┘  │
│                                    │
└────────────────────────────────────┘
```

### 2.5 Logica de redireccion (pseudocodigo para middleware)

```
// middleware.ts — logica ampliada

function getHomeRoute(role: UserRole): string {
  switch (role) {
    case "ADMIN":      return "/dashboard";
    case "CASHIER":    return "/dashboard/mesas";
    case "WAITER":     return "/dashboard/mesas";
    case "KITCHEN":    return "/dashboard/cocina/kds";
    case "BARTENDER":  return "/dashboard/cocina/kds?bar=1";
    default:           return "/dashboard";
  }
}

// En el callback de session de NextAuth:
// Se agrega user.role y user.active al token JWT
// El middleware lee el token y valida:
//   1. Si no hay token y ruta protegida → redirect /login
//   2. Si hay token y user.active === false → redirect /login?error=inactive
//   3. Si hay token y ruta no permitida para el rol → redirect a pantalla de acceso denegado
//   4. Si hay token y ruta es /login → redirect a home del rol
```

---

## 3. Flujo del Admin: Gestion de Usuarios

### 3.1 Diagrama de flujo: Gestion completa de usuarios

```
                    ┌─────────────────────────┐
                    │  ADMIN en /dashboard     │
                    │  (ya autenticado)        │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Click "Configuraciones" │
                    │  en sidebar              │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  /dashboard/settings     │
                    │  (submenu lateral)       │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Click "Usuarios" en     │
                    │  submenu de settings     │
                    └────────────┬────────────┘
                                 │
                                 ▼
           ┌─────────────────────────────────────────┐
           │                                         │
           │   PAGINA: GESTION DE USUARIOS           │
           │   /dashboard/settings/users              │
           │                                         │
           │   ┌──────────┐  ┌─────────┐  ┌───────┐ │
           │   │Filtro rol│  │ Estado  │  │+Nuevo │ │
           │   └──────────┘  └─────────┘  │Usuario│ │
           │                              └───────┘ │
           │   ┌─────────────────────────────────┐   │
           │   │         DATA TABLE              │   │
           │   │  Nombre | Email | Rol | Estado  │   │
           │   │  Ultima actividad | Acciones    │   │
           │   └─────────────────────────────────┘   │
           │                                         │
           └──────────────┬──────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    [+Nuevo Usuario] [Editar]        [Desactivar]
          │               │               │
          ▼               ▼               ▼
   ┌──────────────┐┌──────────────┐┌──────────────────┐
   │ MODAL:       ││ MODAL:       ││ DIALOG:          │
   │ Crear usuario││ Editar       ││ Confirmar        │
   │              ││ usuario      ││ desactivacion    │
   │ - Nombre     ││              ││                  │
   │ - Email      ││ - Nombre     ││ "¿Desactivar a   │
   │ - Password   ││ - Email      ││  Juan Perez?"    │
   │ - Rol        ││ - Rol        ││                  │
   │ - PIN (*)    ││ - Estado     ││ [Cancelar]       │
   │              ││ - PIN (*)    ││ [Desactivar]     │
   │ [Cancelar]   ││              ││                  │
   │ [Guardar]    ││ [Cancelar]   │└──────────────────┘
   │              ││ [Guardar]    │
   └──────────────┘└──────────────┘
                          │
      (*) PIN solo visible cuando        ┌──────────────────┐
          rol = KITCHEN o BARTENDER       │ ACCION EXTRA:    │
                                          │ Resetear password│
                                          │ (menu acciones)  │
                                          │                  │
                                          │ → Genera pass    │
                                          │   temporal y     │
                                          │   muestra en     │
                                          │   modal          │
                                          └──────────────────┘
```

### 3.2 Diagrama de flujo: Crear nuevo usuario

```
┌────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│ Admin clickea  │────▶│ Se abre modal       │────▶│ Admin llena campos  │
│ "+ Nuevo       │     │ "Crear usuario"     │     │ del formulario      │
│   usuario"     │     │                     │     │                     │
└────────────────┘     └─────────────────────┘     └──────────┬──────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │ ¿Selecciono rol     │
                                                   │  KITCHEN o          │
                                                   │  BARTENDER?         │
                                                   └──────────┬──────────┘
                                                              │
                                                    ┌─────────┴─────────┐
                                                    │                   │
                                                 SI ▼                NO ▼
                                          ┌──────────────┐    ┌──────────────┐
                                          │ Ocultar campo│    │ Mantener     │
                                          │ Email.       │    │ campos Email │
                                          │ Mostrar campo│    │ y Password   │
                                          │ PIN (4 dig)  │    │ visibles     │
                                          └──────┬───────┘    └──────┬───────┘
                                                 │                   │
                                                 └─────────┬─────────┘
                                                           │
                                                           ▼
                                                ┌─────────────────────┐
                                                │ Click "Guardar"     │
                                                └──────────┬──────────┘
                                                           │
                                                           ▼
                                                ┌─────────────────────┐
                                                │ Validacion Zod      │
                                                │ client-side         │
                                                └──────────┬──────────┘
                                                           │
                                                  ┌────────┴────────┐
                                                  │                 │
                                               VALIDO          INVALIDO
                                                  │                 │
                                                  ▼                 ▼
                                        ┌──────────────┐  ┌──────────────────┐
                                        │ Boton pasa a │  │ Mostrar errores  │
                                        │ estado       │  │ en campos        │
                                        │ "loading"    │  │ correspondientes │
                                        │ (spinner)    │  │ (FormMessage)    │
                                        └──────┬───────┘  └──────────────────┘
                                               │
                                               ▼
                                     ┌─────────────────────┐
                                     │ Server action:       │
                                     │ createUser()         │
                                     └──────────┬──────────┘
                                                │
                                       ┌────────┴────────┐
                                       │                 │
                                    SUCCESS           ERROR
                                       │                 │
                                       ▼                 ▼
                              ┌──────────────┐  ┌──────────────────┐
                              │ 1. Cerrar    │  │ Mostrar error:   │
                              │    modal     │  │ "Email ya existe"│
                              │ 2. Toast     │  │ o error generico │
                              │    "Usuario  │  │ en el formulario │
                              │    creado"   │  └──────────────────┘
                              │ 3. Refresh   │
                              │    tabla     │
                              └──────────────┘
```

### 3.3 Diagrama de flujo: Desactivar / Reactivar usuario

```
┌─────────────────┐     ┌──────────────────────────────────────────┐
│ Admin clickea   │────▶│ DIALOG DE CONFIRMACION                   │
│ icono "Desact." │     │                                          │
│ en fila de      │     │  ┌────────────────────────────────────┐  │
│ la tabla        │     │  │ ¿Desactivar a Juan Perez?          │  │
│                 │     │  │                                    │  │
│                 │     │  │ El usuario no podra acceder al     │  │
│                 │     │  │ sistema hasta que lo reactives.    │  │
│                 │     │  │                                    │  │
│                 │     │  │ ┌──────────┐  ┌─────────────────┐ │  │
│                 │     │  │ │ Cancelar │  │  Desactivar     │ │  │
│                 │     │  │ │ (ghost)  │  │  (destructive)  │ │  │
│                 │     │  │ └──────────┘  └─────────────────┘ │  │
│                 │     │  └────────────────────────────────────┘  │
│                 │     │                                          │
└─────────────────┘     └──────────────────────────────────────────┘
                                         │
                               ┌─────────┴─────────┐
                               │                   │
                         [Cancelar]          [Desactivar]
                               │                   │
                               ▼                   ▼
                        ┌────────────┐    ┌──────────────────┐
                        │ Cerrar     │    │ 1. user.active   │
                        │ dialog     │    │    = false       │
                        │ (sin       │    │ 2. Cerrar sesion │
                        │ cambios)   │    │    activa del    │
                        └────────────┘    │    usuario       │
                                          │ 3. Toast         │
                                          │    "Usuario      │
                                          │    desactivado"  │
                                          │ 4. Fila en tabla │
                                          │    pasa a gris   │
                                          │    con badge     │
                                          │    "Inactivo"    │
                                          └──────────────────┘

REACTIVAR (flujo inverso):
┌─────────────────┐     ┌──────────────────────────────────────────┐
│ Admin clickea   │────▶│ SIN CONFIRMACION (P4: no destructivo)    │
│ "Reactivar" en  │     │                                          │
│ fila inactiva   │     │ 1. user.active = true                    │
│                 │     │ 2. Toast: "Usuario reactivado"           │
│                 │     │ 3. Badge cambia a color de rol            │
│                 │     │ 4. Acciones se habilitan                  │
└─────────────────┘     └──────────────────────────────────────────┘
```

### 3.4 Diagrama de flujo: Resetear contrasena

```
┌─────────────────┐     ┌──────────────────────────────────────────┐
│ Admin clickea   │────▶│ DIALOG DE CONFIRMACION                   │
│ "Resetear       │     │                                          │
│  contrasena"    │     │  ┌────────────────────────────────────┐  │
│ desde menu de   │     │  │ ¿Resetear contrasena de            │  │
│ acciones (...)  │     │  │ Juan Perez?                        │  │
│                 │     │  │                                    │  │
│                 │     │  │ Se generara una contrasena          │  │
│                 │     │  │ temporal. El usuario debera         │  │
│                 │     │  │ cambiarla en su proximo login.      │  │
│                 │     │  │                                    │  │
│                 │     │  │ ┌──────────┐  ┌─────────────────┐ │  │
│                 │     │  │ │ Cancelar │  │  Resetear       │ │  │
│                 │     │  │ │          │  │  (primary)      │ │  │
│                 │     │  │ └──────────┘  └─────────────────┘ │  │
│                 │     │  └────────────────────────────────────┘  │
└─────────────────┘     └──────────────────────────────────────────┘
                                         │
                                    [Resetear]
                                         │
                                         ▼
                        ┌──────────────────────────────────────┐
                        │  MODAL: Contrasena temporal           │
                        │                                      │
                        │  Nueva contrasena para Juan Perez:   │
                        │                                      │
                        │  ┌────────────────────────────────┐  │
                        │  │  Xk9#mP2w                      │  │
                        │  │                         [copy]  │  │
                        │  └────────────────────────────────┘  │
                        │                                      │
                        │  (!) Comparte esta contrasena de     │
                        │  forma segura. El usuario debera     │
                        │  cambiarla al iniciar sesion.        │
                        │                                      │
                        │  ┌────────────────────────────────┐  │
                        │  │         ENTENDIDO              │  │
                        │  └────────────────────────────────┘  │
                        │                                      │
                        └──────────────────────────────────────┘
```

---

## 4. Navegacion Condicional por Rol

### 4.1 Items de sidebar por rol

```
ITEM DE NAVEGACION           ICONO            ADMIN  CASHIER  WAITER  KITCHEN  BARTENDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dashboard (KPIs)             layoutDashboard    ●       -       -       -        -
Mapa de mesas                mapPin             ●       ●       ●       -        -
Nueva venta                  shoppingCart        ●       ●       ●       -        -
Comprobantes de venta        receipt            ●       ●       -       -        -
Caja chica                   cashRegister       ●       ●       -       -        -
Reporte de ventas            salesReports       ●       -       -       -        -
Productos                    blocks             ●       -       -       -        -
Movimientos de stock         stock_adjustments  ●       -       -       -        -
Cocina (KDS)                 chefHat            ●       -       -       ●        ●
Configuraciones              settings           ●       -       -       -        -
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
● = visible en sidebar    - = oculto

KITCHEN y BARTENDER: NO tienen sidebar (pantalla fullscreen KDS)
```

### 4.2 Wireframe: Sidebar del ADMIN (acceso completo)

```
┌────────────────────────────────┐
│                                │
│  Administrador                 │
│  ─────────────────────────     │
│                                │
│  ┌──────────────────────────┐  │
│  │ [#] Dashboard            │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [M] Mapa de mesas        │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [C] Nueva venta          │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [R] Comprobantes         │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [V] Reporte de ventas    │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [$] Caja chica           │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [P] Productos            │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [S] Movimientos de stock │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [K] Cocina (KDS)         │  │
│  └──────────────────────────┘  │
│                                │
│  ─────────────────────────     │
│                                │
│  ┌──────────────────────────┐  │
│  │ [*] Configuraciones      │  │
│  └──────────────────────────┘  │
│                                │
└────────────────────────────────┘
  w-72 (288px)
  hidden lg:block
  border-r, pt-16
```

### 4.3 Wireframe: Sidebar del CAJERO

```
┌────────────────────────────────┐
│                                │
│  Cajero                        │
│  ─────────────────────────     │
│                                │
│  ┌──────────────────────────┐  │
│  │ [M] Mapa de mesas        │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [C] Nueva venta          │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [R] Comprobantes         │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [$] Caja chica           │  │
│  └──────────────────────────┘  │
│                                │
│                                │
│  (4 items — interfaz limpia,   │
│   sin opciones que no puede    │
│   usar)                        │
│                                │
└────────────────────────────────┘
```

### 4.4 Wireframe: Sidebar del MOZO

```
┌────────────────────────────────┐
│                                │
│  Mozo                          │
│  ─────────────────────────     │
│                                │
│  ┌──────────────────────────┐  │
│  │ [M] Mapa de mesas        │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │ [C] Nueva venta          │  │
│  └──────────────────────────┘  │
│                                │
│                                │
│  (2 items — minimalista,       │
│   enfocado en su flujo de      │
│   trabajo)                     │
│                                │
└────────────────────────────────┘
```

### 4.5 Vista del COCINERO y BARTENDER: Sin sidebar

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │  COCINA - KDS                               Juan  [Chef] [Salir] │   │
│ └────────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ MESA 3   │  │ MESA 7   │  │ MESA 1   │  │ DELIVERY │  │ MESA 12  │  │
│  │ 5:32     │  │ 3:15     │  │ 2:44     │  │ #047     │  │ 1:02     │  │
│  │          │  │          │  │          │  │          │  │          │  │
│  │ 2x Lomo  │  │ 1x Cevi- │  │ 3x Arroz │  │ 2x Pollo │  │ 1x Sopa  │  │
│  │   saltado│  │   che    │  │   chaufa │  │   brasa  │  │   criolla│  │
│  │ 1x Aji   │  │ 2x Arroz │  │ *sin     │  │ 1x Papa  │  │ 2x Lomo  │  │
│  │   gallina│  │   marino │  │  tamarind│  │   huanc  │  │   fino   │  │
│  │          │  │          │  │          │  │          │  │          │  │
│  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │  │
│  │ │LISTO │ │  │ │LISTO │ │  │ │LISTO │ │  │ │LISTO │ │  │ │LISTO │ │  │
│  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │  │ └──────┘ │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                                          │
│  SIN SIDEBAR — Pantalla completa para maximizar espacio de comandas      │
│  Header minimo: titulo + nombre usuario + badge rol + boton salir        │
│  Sin logo, sin navegacion — solo KDS                                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 4.6 Implementacion: Filtrado de navItems por rol

```
// Pseudocodigo para constants/data.ts ampliado

type NavItemWithRoles = NavItem & {
  allowedRoles: UserRole[];
};

const allNavItems: NavItemWithRoles[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "layoutDashboard",
    allowedRoles: ["ADMIN"],
  },
  {
    title: "Mapa de mesas",
    href: "/dashboard/mesas",
    icon: "mapPin",
    allowedRoles: ["ADMIN", "CASHIER", "WAITER"],
  },
  {
    title: "Nueva venta",
    href: "/dashboard/orders/new",
    icon: "shoppingCart",
    allowedRoles: ["ADMIN", "CASHIER", "WAITER"],
  },
  {
    title: "Comprobantes de venta",
    href: "/dashboard/orders",
    icon: "receipt",
    allowedRoles: ["ADMIN", "CASHIER"],
  },
  {
    title: "Caja chica",
    href: "/dashboard/cash_shifts",
    icon: "cashRegister",
    allowedRoles: ["ADMIN", "CASHIER"],
  },
  {
    title: "Reporte de ventas",
    href: "/dashboard/sales_reports",
    icon: "salesReports",
    allowedRoles: ["ADMIN"],
  },
  {
    title: "Productos",
    href: "/dashboard/products",
    icon: "blocks",
    allowedRoles: ["ADMIN"],
  },
  {
    title: "Movimientos de stock",
    href: "/dashboard/stock_adjustments",
    icon: "stock_adjustments",
    allowedRoles: ["ADMIN"],
  },
  {
    title: "Cocina (KDS)",
    href: "/dashboard/cocina/kds",
    icon: "chefHat",
    allowedRoles: ["ADMIN", "KITCHEN", "BARTENDER"],
  },
];

// Funcion de filtrado
function getNavItemsForRole(role: UserRole): NavItem[] {
  return allNavItems.filter(item => item.allowedRoles.includes(role));
}
```

### 4.7 Acceso denegado: Comportamiento cuando se intenta acceder a ruta no permitida

```
FLUJO DE ACCESO DENEGADO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. El middleware intercepta ANTES de renderizar la pagina
2. Verifica: ¿la ruta esta en las rutas permitidas del rol?
3. Si NO → redirige a pagina de acceso denegado
4. La pagina de acceso denegado muestra boton para volver al inicio

IMPORTANTE: No se usa un 403 HTTP raw. Se muestra una pagina
amigable dentro del layout del dashboard (con sidebar del usuario).
```

---

## 5. Flujo del Cocinero: Acceso Simplificado con PIN

### 5.1 Justificacion del flujo con PIN

```
¿POR QUE PIN EN VEZ DE EMAIL + PASSWORD PARA COCINA?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. MANOS SUCIAS: El cocinero tiene las manos mojadas, con harina,
   aceite. Escribir un email es impractico.

2. DISPOSITIVO COMPARTIDO: El monitor/tablet de cocina es un
   dispositivo fijo compartido entre turnos. No hay "cuenta personal"
   en el sentido tradicional.

3. VELOCIDAD: El cocinero necesita acceder al KDS en segundos,
   no en minutos. 4 toques > 20+ toques (email + password).

4. SEGURIDAD ADECUADA: El KDS solo muestra comandas, no tiene
   acceso a dinero, reportes ni configuracion. Un PIN de 4 digitos
   es seguridad suficiente para este nivel de acceso.

5. CAMBIO DE TURNO: Al cambiar turno, el cocinero saliente toca
   "Salir" y el entrante selecciona su perfil e ingresa su PIN.
   Flujo completo: < 10 segundos.
```

### 5.2 Diagrama de flujo: Acceso con PIN

```
                    ┌───────────────────────────┐
                    │  Monitor/Tablet de cocina  │
                    │  (dispositivo compartido)  │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  ¿Sesion de cocina activa? │
                    └─────────────┬─────────────┘
                                  │
                        ┌─────────┴─────────┐
                        │                   │
                     SI ▼                NO ▼
              ┌──────────────┐   ┌───────────────────────┐
              │ Mostrar KDS  │   │ PANTALLA: Seleccion   │
              │ directamente │   │ de perfil de cocina   │
              └──────────────┘   └───────────┬───────────┘
                                             │
                                             ▼
                    ┌──────────────────────────────────────────┐
                    │                                          │
                    │  Selecciona tu perfil                    │
                    │                                          │
                    │  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
                    │  │  👨‍🍳     │  │  👨‍🍳     │  │  🍸     │ │
                    │  │         │  │         │  │         │ │
                    │  │  Pedro  │  │  Maria  │  │  Carlos │ │
                    │  │ Cocina  │  │ Cocina  │  │  Barra  │ │
                    │  └─────────┘  └─────────┘  └─────────┘ │
                    │                                          │
                    │  (Avatares grandes, 120x120px)           │
                    │  (Solo usuarios con rol KITCHEN o        │
                    │   BARTENDER activos de esta company)     │
                    │                                          │
                    │  ┌────────────────────────────────────┐  │
                    │  │ ¿No eres de cocina?                │  │
                    │  │ Inicia sesion con email →          │  │
                    │  └────────────────────────────────────┘  │
                    │                                          │
                    └──────────────────┬───────────────────────┘
                                       │
                                  [Selecciona perfil]
                                       │
                                       ▼
                    ┌──────────────────────────────────────────┐
                    │                                          │
                    │  Ingresa tu PIN                          │
                    │                                          │
                    │  Hola, Pedro                             │
                    │                                          │
                    │         ┌───┐ ┌───┐ ┌───┐ ┌───┐         │
                    │         │ ● │ │ ● │ │ ○ │ │ ○ │         │
                    │         └───┘ └───┘ └───┘ └───┘         │
                    │                                          │
                    │    ┌──────┐  ┌──────┐  ┌──────┐         │
                    │    │      │  │      │  │      │         │
                    │    │  1   │  │  2   │  │  3   │         │
                    │    │      │  │      │  │      │         │
                    │    └──────┘  └──────┘  └──────┘         │
                    │                                          │
                    │    ┌──────┐  ┌──────┐  ┌──────┐         │
                    │    │      │  │      │  │      │         │
                    │    │  4   │  │  5   │  │  6   │         │
                    │    │      │  │      │  │      │         │
                    │    └──────┘  └──────┘  └──────┘         │
                    │                                          │
                    │    ┌──────┐  ┌──────┐  ┌──────┐         │
                    │    │      │  │      │  │      │         │
                    │    │  7   │  │  8   │  │  9   │         │
                    │    │      │  │      │  │      │         │
                    │    └──────┘  └──────┘  └──────┘         │
                    │                                          │
                    │    ┌──────┐  ┌──────┐  ┌──────┐         │
                    │    │      │  │      │  │      │         │
                    │    │ ←    │  │  0   │  │ Borr │         │
                    │    │Atras │  │      │  │      │         │
                    │    │      │  │      │  │      │         │
                    │    └──────┘  └──────┘  └──────┘         │
                    │                                          │
                    │  (Auto-submit al ingresar 4to digito)   │
                    │  (Botones: min 80x80px para pantalla    │
                    │   de cocina)                             │
                    │                                          │
                    └──────────────────┬───────────────────────┘
                                       │
                                  [4to digito]
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Validar PIN     │
                              │ bcrypt.compare  │
                              └────────┬────────┘
                                       │
                              ┌────────┴────────┐
                              │                 │
                           VALIDO          INVALIDO
                              │                 │
                              ▼                 ▼
                     ┌──────────────┐  ┌──────────────────────┐
                     │ Crear sesion │  │ 1. Shake animation    │
                     │ JWT con      │  │    en los 4 circulos  │
                     │ role=KITCHEN │  │ 2. Circulos pasan a   │
                     │              │  │    rojo, luego reset  │
                     │ Redirigir a  │  │ 3. Limpiar PIN        │
                     │ /dashboard/  │  │ 4. Si 3 intentos      │
                     │ cocina/kds   │  │    fallidos: bloquear  │
                     │              │  │    30 seg + mensaje    │
                     └──────────────┘  └──────────────────────┘
```

### 5.3 Timeout de sesion de cocina

```
TIMEOUT DE SESION — COCINA / BARRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POLITICA:
- La sesion de cocina expira despues de 8 horas de inactividad
  (equivalente a un turno completo).
- "Inactividad" = sin interaccion con la pantalla (touch/click).
- El KDS sigue actualizandose en background (polling), pero
  despues del timeout se muestra la pantalla de seleccion de perfil.

FLUJO DE TIMEOUT:
┌────────────────┐     ┌─────────────────────┐     ┌────────────────────┐
│ 8 horas sin    │────▶│ Overlay semi-        │────▶│ Pantalla de        │
│ interaccion    │     │ transparente:        │     │ seleccion de       │
│ detectadas     │     │ "Sesion expirada"    │     │ perfil de cocina   │
│                │     │ (fade in 2 seg)      │     │ (igual que login   │
│                │     │                      │     │  inicial)          │
└────────────────┘     └─────────────────────┘     └────────────────────┘

CONSIDERACIONES:
- NO se muestra countdown (distrae al cocinero)
- NO hay sonido (cocina ya es ruidosa)
- El overlay permite ver las comandas debajo (semi-transparente)
  por si el cocinero necesita referencia antes de re-autenticarse
```

### 5.4 Ruta de acceso: /login/kitchen

```
URL: [subdomain].lorito.app/login/kitchen

Esta ruta es independiente de /login.
Puede ser accedida directamente desde el navegador del dispositivo de cocina.
Tip: Guardar como bookmark o pantalla de inicio en el tablet de cocina.

Desde /login estandar hay un link: "¿Eres de cocina? Ingresa con tu PIN →"
Desde /login/kitchen hay un link inverso: "¿No eres de cocina? Inicia sesion con email →"
```

---

## 6. Wireframes de Pantallas Clave

### 6A. Pagina de Gestion de Usuarios — /dashboard/settings/users

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│ │  LOGO KOGOZ                                              [J] Juan Admin  ▾     │ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                      │
│ ┌────────────┐ ┌─────────────────────────────────────────────────────────────────┐   │
│ │            │ │                                                                 │   │
│ │ Sidebar    │ │  Inicio / Configuraciones / Usuarios                            │   │
│ │            │ │                                                                 │   │
│ │ [#] Dash.. │ │  Configuraciones                                                │   │
│ │ [M] Mesas  │ │  Edita tu perfil y configura tu empresa.                        │   │
│ │ [C] Ventas │ │  ─────────────────────────────────────────────────────────────   │   │
│ │ [R] Comprob│ │                                                                 │   │
│ │ [V] Report.│ │  ┌────────────┐  ┌───────────────────────────────────────────┐  │   │
│ │ [$] Caja   │ │  │            │  │                                           │  │   │
│ │ [P] Product│ │  │  Empresa   │  │  Usuarios del restaurante (5)             │  │   │
│ │ [S] Stock  │ │  │            │  │                                           │  │   │
│ │ [K] Cocina │ │  │  Usuarios  │  │  ┌─────────────┐ ┌────────┐ ┌──────────┐ │  │   │
│ │            │ │  │  ← activo  │  │  │ Filtrar rol ▾│ │Estado ▾│ │+ NUEVO   │ │  │   │
│ │ ──────     │ │  │            │  │  │ Todos       │ │ Todos  │ │ USUARIO  │ │  │   │
│ │ [*] Config │ │  │  Mi perfil │  │  └─────────────┘ └────────┘ └──────────┘ │  │   │
│ │            │ │  │            │  │                                           │  │   │
│ │            │ │  └────────────┘  │  ┌───────────────────────────────────────┐│  │   │
│ │            │ │                  │  │ Nombre      │ Email        │ Rol      ││  │   │
│ │            │ │                  │  │─────────────┼──────────────┼──────────││  │   │
│ │            │ │                  │  │ Juan Perez  │ juan@rest.pe │ ADMIN    ││  │   │
│ │            │ │                  │  │             │              │ [purple] ││  │   │
│ │            │ │                  │  │─────────────┼──────────────┼──────────││  │   │
│ │            │ │                  │  │ Maria Lopez │ maria@rest.pe│ CASHIER  ││  │   │
│ │            │ │                  │  │             │              │ [blue]   ││  │   │
│ │            │ │                  │  │─────────────┼──────────────┼──────────││  │   │
│ │            │ │                  │  │ Carlos Ruiz │ carlos@rest  │ WAITER   ││  │   │
│ │            │ │                  │  │             │              │ [green]  ││  │   │
│ │            │ │                  │  │─────────────┼──────────────┼──────────││  │   │
│ │            │ │                  │  │ Pedro Chef  │ —            │ KITCHEN  ││  │   │
│ │            │ │                  │  │             │ (acceso PIN) │ [orange] ││  │   │
│ │            │ │                  │  │─────────────┼──────────────┼──────────││  │   │
│ │            │ │                  │  │ Ana Torres  │ ana@rest.pe  │ WAITER   ││  │   │
│ │            │ │                  │  │             │              │ [green]  ││  │   │
│ │            │ │                  │  └───────────────────────────────────────┘│  │   │
│ │            │ │                  │                                           │  │   │
│ └────────────┘ │                  └───────────────────────────────────────────┘  │   │
│                │                                                                 │   │
│                └─────────────────────────────────────────────────────────────────┘   │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 6A (continuacion). DataTable completa con todas las columnas

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  ┌─────────────┐ ┌──────────┐                                    ┌────────────┐ │
│  │ Filtrar rol ▾│ │Estado  ▾ │                                    │ + NUEVO    │ │
│  │             │ │          │                                    │   USUARIO  │ │
│  └─────────────┘ └──────────┘                                    └────────────┘ │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                             │ │
│  │ NOMBRE        EMAIL            ROL       ESTADO    ULT. ACTIVIDAD  ACCIONES │ │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │                                                                             │ │
│  │ Juan Perez    juan@rest.pe     [ADMIN]   ● Activo   Hace 2 min     [...]   │ │
│  │                                 purple    verde                             │ │
│  │ ─────────────────────────────────────────────────────────────────────────── │ │
│  │                                                                             │ │
│  │ Maria Lopez   maria@rest.pe    [CAJERO]  ● Activo   Hace 1 hora    [...]   │ │
│  │                                 blue      verde                             │ │
│  │ ─────────────────────────────────────────────────────────────────────────── │ │
│  │                                                                             │ │
│  │ Carlos Ruiz   carlos@rest.pe   [MOZO]    ● Activo   Hace 30 min    [...]   │ │
│  │                                 green     verde                             │ │
│  │ ─────────────────────────────────────────────────────────────────────────── │ │
│  │                                                                             │ │
│  │ Pedro Chef    (acceso PIN)     [COCINA]  ● Activo   Hace 5 min     [...]   │ │
│  │                                 orange    verde                             │ │
│  │ ─────────────────────────────────────────────────────────────────────────── │ │
│  │                                                                             │ │
│  │ Luis Gomez    luis@rest.pe     [MOZO]    ○ Inactivo  15 Mar 2026   [...]   │ │
│  │               opacity-60       green     gris                               │ │
│  │ ─────────────────────────────────────────────────────────────────────────── │ │
│  │                                                                             │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  Menu de acciones [...] (DropdownMenu):                                          │
│  ┌──────────────────────┐                                                        │
│  │ Editar usuario       │                                                        │
│  │ Cambiar rol          │                                                        │
│  │ Resetear contrasena  │                                                        │
│  │ ──────────────────── │                                                        │
│  │ Desactivar usuario   │  ← text-destructive                                   │
│  └──────────────────────┘                                                        │
│                                                                                  │
│  Menu de acciones para usuario INACTIVO:                                         │
│  ┌──────────────────────┐                                                        │
│  │ Reactivar usuario    │  ← unica opcion                                       │
│  └──────────────────────┘                                                        │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘

Filtro de rol (Select):              Filtro de estado (Select):
┌──────────────────────┐             ┌──────────────────┐
│ Todos los roles      │             │ Todos            │
│ ──────────────────── │             │ ──────────────── │
│ [●] Admin            │             │ Activos          │
│ [●] Cajero           │             │ Inactivos        │
│ [●] Mozo             │             └──────────────────┘
│ [●] Cocina           │
│ [●] Bartender        │
└──────────────────────┘
```

### 6B. Modal de Crear/Editar Usuario

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │                                            [X] │  │
│  │                                                │  │
│  │  Crear nuevo usuario                           │  │
│  │  Agrega un miembro del equipo al restaurante.  │  │
│  │                                                │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │ Nombre completo                          │  │  │
│  │  │ ┌──────────────────────────────────────┐ │  │  │
│  │  │ │                                      │ │  │  │
│  │  │ └──────────────────────────────────────┘ │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │                                                │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │ Rol *                                    │  │  │
│  │  │ ┌──────────────────────────────────────┐ │  │  │
│  │  │ │ Seleccionar rol...               ▾  │ │  │  │
│  │  │ └──────────────────────────────────────┘ │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │                                                │  │
│  │  ── Cuando rol = ADMIN, CASHIER o WAITER: ──   │  │
│  │                                                │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │ Email *                                  │  │  │
│  │  │ ┌──────────────────────────────────────┐ │  │  │
│  │  │ │ usuario@restaurante.com              │ │  │  │
│  │  │ └──────────────────────────────────────┘ │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │                                                │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │ Contrasena *                             │  │  │
│  │  │ ┌──────────────────────────────────────┐ │  │  │
│  │  │ │ ••••••••                         [o] │ │  │  │
│  │  │ └──────────────────────────────────────┘ │  │  │
│  │  │ Min. 6 caracteres                        │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │                                                │  │
│  │  ── Cuando rol = KITCHEN o BARTENDER: ──       │  │
│  │                                                │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │ PIN de acceso * (4 digitos)              │  │  │
│  │  │ ┌────┐ ┌────┐ ┌────┐ ┌────┐             │  │  │
│  │  │ │    │ │    │ │    │ │    │             │  │  │
│  │  │ └────┘ └────┘ └────┘ └────┘             │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  │                                                │  │
│  │  (El campo email no aparece para KITCHEN       │  │
│  │   ni BARTENDER. Se genera un email interno     │  │
│  │   automatico: pedro-kitchen@[company].local)   │  │
│  │                                                │  │
│  │  ┌────────────────────────────────────────┐    │  │
│  │  │                                        │    │  │
│  │  │           GUARDAR USUARIO              │    │  │
│  │  │           [56px alto, primary]         │    │  │
│  │  │                                        │    │  │
│  │  └────────────────────────────────────────┘    │  │
│  │                                                │  │
│  │  ┌────────────────────────────────────────┐    │  │
│  │  │           CANCELAR                     │    │  │
│  │  │           [ghost]                      │    │  │
│  │  └────────────────────────────────────────┘    │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘

  Componente: Dialog de shadcn/ui (no Sheet)
  Se usa Dialog porque el formulario es corto (4-5 campos)
  y se debe poder cerrar con click fuera.
```

### 6B (variante). Modal de Editar Usuario

```
┌────────────────────────────────────────────────────┐
│                                                [X] │
│                                                    │
│  Editar usuario                                    │
│  Modifica los datos de Juan Perez.                 │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ Nombre completo                              │  │
│  │ ┌──────────────────────────────────────────┐ │  │
│  │ │ Juan Perez                               │ │  │
│  │ └──────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ Email                                        │  │
│  │ ┌──────────────────────────────────────────┐ │  │
│  │ │ juan@restaurante.pe                      │ │  │
│  │ └──────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ Rol                                          │  │
│  │ ┌──────────────────────────────────────────┐ │  │
│  │ │ Admin                                 ▾ │ │  │
│  │ └──────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ Estado                                       │  │
│  │                                              │  │
│  │  Activo  ┌──────────┐                        │  │
│  │          │ ●━━━━━━━ │  ← Switch/toggle       │  │
│  │          └──────────┘    (44px alto tactil)   │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  (!) La contrasena no es editable desde aqui.      │
│  Usa "Resetear contrasena" desde la tabla.         │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │           GUARDAR CAMBIOS                    │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │           CANCELAR                           │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
└────────────────────────────────────────────────────┘

REGLA IMPORTANTE:
- Un admin NO puede desactivarse a si mismo desde el modal
  de edicion. El switch de estado esta deshabilitado para
  el usuario logueado actualmente.
- Un admin NO puede cambiar su propio rol.
  Esto previene bloqueos accidentales.
```

### 6B (selector de rol). Dropdown de seleccion de rol

```
┌──────────────────────────────────────────────────┐
│ Seleccionar rol...                           ▾   │
└──────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────┐
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  [●] Admin                               │    │
│  │  Acceso total. Dashboard, reportes,      │    │
│  │  gestion de usuarios y configuracion.    │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  [●] Cajero                              │    │
│  │  Cobra, gestiona caja y emite            │    │
│  │  comprobantes.                           │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  [●] Mozo                                │    │
│  │  Toma pedidos y gestiona mesas.          │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  [●] Cocina                              │    │
│  │  Solo ve pantalla KDS. Accede con PIN.   │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  [●] Bartender                           │    │
│  │  KDS filtrado por bebidas. Accede con    │    │
│  │  PIN.                                    │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘

  Cada opcion tiene:
  - Nombre del rol (bold)
  - Descripcion breve (text-muted-foreground, text-sm)
  Esto ayuda al admin a entender que hace cada rol sin
  salir del formulario.
```

### 6C. Validaciones del formulario

```
VALIDACIONES ZOD POR CAMPO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CAMPO          REGLAS                              MENSAJE DE ERROR
─────────────  ──────────────────────────────────  ─────────────────────────
Nombre         string, min(2), max(100)            "El nombre debe tener al
                                                    menos 2 caracteres"

Email          string, email(), unique en company  "Ingresa un email valido"
               Requerido si rol != KITCHEN/BART    "Este email ya esta en uso"

Password       string, min(6)                      "La contrasena debe tener
               Requerido solo en creacion           al menos 6 caracteres"
               Requerido si rol != KITCHEN/BART

PIN            string, regex(/^\d{4}$/)            "El PIN debe ser de 4
               Requerido si rol = KITCHEN/BART      digitos"
               unique en company                    "Este PIN ya esta en uso"

Rol            enum UserRole, requerido             "Selecciona un rol"

Estado         boolean, default true                (sin validacion, es switch)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VALIDACION VISUAL:
- Los campos con error muestran borde rojo (border-destructive)
- El mensaje de error aparece debajo del campo (FormMessage de shadcn)
- Los campos validos no muestran indicador (no green border — P3 aplicado
  solo a errores, no a estados correctos, para evitar ruido visual)
```

### 6D. Header con info de rol

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  ┌─────────────────┐                              ┌───────────────────────────┐  │
│  │  LOGO KOGOZ     │                              │  [ADMIN]  Juan P.   [▾]  │  │
│  │  (150x56px)     │                              │  purple   nombre  avatar │  │
│  └─────────────────┘                              └───────────────────────────┘  │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘

  Detalle del area de usuario en el header:

  ┌──────────────────────────────────────┐
  │                                      │
  │  ┌────────┐  Juan Perez  ┌────┐     │
  │  │ ADMIN  │              │ JP │     │
  │  │ badge  │              │ av │     │
  │  └────────┘              └────┘     │
  │                                      │
  └──────────────────────────────────────┘
       │                        │
       Badge con color          Avatar con
       segun rol                iniciales
       (ver seccion 7)

  Click en avatar despliega DropdownMenu:

  ┌──────────────────────────────┐
  │                              │
  │  Juan Perez                  │
  │  juan@restaurante.pe         │
  │  [ADMIN] ← badge de color   │
  │                              │
  │  ──────────────────────────  │
  │                              │
  │  Cambiar contrasena          │
  │  Configuraciones   ← solo   │
  │                      ADMIN   │
  │                              │
  │  ──────────────────────────  │
  │                              │
  │  Cerrar sesion               │
  │                              │
  └──────────────────────────────┘

  Para KITCHEN/BARTENDER (header simplificado):

  ┌──────────────────────────────────────────────────────────────────┐
  │                                                                  │
  │  COCINA - KDS                       Pedro  [COCINA]  [SALIR]    │
  │                                     nombre  orange    boton     │
  │                                                       44px      │
  └──────────────────────────────────────────────────────────────────┘

  Sin dropdown, sin "Configuraciones", sin "Cambiar contrasena".
  Solo nombre + badge + boton SALIR directo (visible, no escondido
  en dropdown — P1: menos toques para cambio de turno).
```

### 6E. Pantalla de acceso denegado

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │  LOGO KOGOZ                                          [MOZO] Carlos  [▾]    │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│ ┌────────────┐ ┌─────────────────────────────────────────────────────────────┐   │
│ │            │ │                                                             │   │
│ │ Sidebar    │ │                                                             │   │
│ │ (del mozo) │ │                                                             │   │
│ │            │ │                                                             │   │
│ │ [M] Mesas  │ │         ┌──────────────────────────────────┐                │   │
│ │ [C] Ventas │ │         │                                  │                │   │
│ │            │ │         │         ┌────────────┐           │                │   │
│ │            │ │         │         │            │           │                │   │
│ │            │ │         │         │    🔒      │           │                │   │
│ │            │ │         │         │            │           │                │   │
│ │            │ │         │         └────────────┘           │                │   │
│ │            │ │         │                                  │                │   │
│ │            │ │         │   No tienes acceso a             │                │   │
│ │            │ │         │   esta pagina                    │                │   │
│ │            │ │         │                                  │                │   │
│ │            │ │         │   Tu rol de Mozo no tiene        │                │   │
│ │            │ │         │   permisos para ver esta          │                │   │
│ │            │ │         │   seccion. Si crees que es        │                │   │
│ │            │ │         │   un error, contacta al           │                │   │
│ │            │ │         │   administrador.                  │                │   │
│ │            │ │         │                                  │                │   │
│ │            │ │         │   ┌────────────────────────────┐ │                │   │
│ │            │ │         │   │                            │ │                │   │
│ │            │ │         │   │    VOLVER A MI INICIO      │ │                │   │
│ │            │ │         │   │    [56px, primary]         │ │                │   │
│ │            │ │         │   │                            │ │                │   │
│ │            │ │         │   └────────────────────────────┘ │                │   │
│ │            │ │         │                                  │                │   │
│ │            │ │         └──────────────────────────────────┘                │   │
│ │            │ │                                                             │   │
│ └────────────┘ └─────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘

  DISENO:
  - Centrado vertical y horizontalmente en el content area
  - Icono de candado (Lock de lucide-react), no un triangulo de warning
  - Tono amigable, no intimidante
  - "VOLVER A MI INICIO" redirige a la pantalla inicial del rol del usuario
  - El sidebar sigue visible y funcional (el usuario puede navegar a sus rutas)
  - No se usa codigo de error HTTP (no "403 Forbidden")
  - Color del icono: text-muted-foreground (gris suave, no rojo)
```

---

## 7. Estados y Feedback Visual

### 7.1 Colores de badge por rol

```
SISTEMA DE COLORES POR ROL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ROL          COLOR        TAILWIND CLASS                    HEX
─────────    ──────────   ─────────────────────────────     ─────────
ADMIN        Purple       bg-purple-100 text-purple-800     #F3E8FF / #6B21A8
                          dark:bg-purple-900/30
                          dark:text-purple-300

CASHIER      Blue         bg-blue-100 text-blue-800         #DBEAFE / #1E40AF
                          dark:bg-blue-900/30
                          dark:text-blue-300

WAITER       Green        bg-green-100 text-green-800       #DCFCE7 / #166534
                          dark:bg-green-900/30
                          dark:text-green-300

KITCHEN      Orange       bg-orange-100 text-orange-800     #FFEDD5 / #9A3412
                          dark:bg-orange-900/30
                          dark:text-orange-300

BARTENDER    Cyan         bg-cyan-100 text-cyan-800         #CFFAFE / #155E75
                          dark:bg-cyan-900/30
                          dark:text-cyan-300

INACTIVO     Gray         bg-gray-100 text-gray-500         #F3F4F6 / #6B7280
(override)                dark:bg-gray-800
                          dark:text-gray-400

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPLEMENTACION (componente Badge):

  <Badge className={cn(
    "text-xs font-medium px-2.5 py-0.5 rounded-full",
    roleColorMap[user.role]
  )}>
    {roleLabelMap[user.role]}
  </Badge>

  const roleLabelMap = {
    ADMIN: "Admin",
    CASHIER: "Cajero",
    WAITER: "Mozo",
    KITCHEN: "Cocina",
    BARTENDER: "Bartender",
  };
```

### 7.2 Feedback: Toast de confirmacion

```
TOASTS POR ACCION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACCION                      TOAST                          VARIANTE
──────────────────────────  ───────────────────────────    ──────────
Crear usuario exitoso       "Usuario creado                success
                             correctamente"                (verde)

Editar usuario exitoso      "Cambios guardados"            success

Desactivar usuario          "Usuario desactivado.          default
                             Ya no puede acceder           (gris)
                             al sistema."

Reactivar usuario           "Usuario reactivado            success
                             correctamente"                (verde)

Resetear contrasena         "Contrasena reseteada"         success

Error al guardar            "No se pudo guardar.           destructive
                             Intenta nuevamente."          (rojo)

PIN incorrecto (cocina)     (No toast — solo shake          —
                             animation en los circulos)

Login exitoso               (No toast — redireccion         —
                             directa es suficiente)

Login fallido               (No toast — error inline        —
                             en el formulario)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POSICION: bottom-right (default de shadcn toast)
DURACION: 4 segundos (auto-dismiss)
INTERACCION: swipe para cerrar
```

### 7.3 Animaciones y transiciones

```
ANIMACIONES DEL MODULO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DESACTIVAR USUARIO (en la tabla)
   - La fila hace transition de opacity: 1 → 0.6 (300ms ease)
   - El badge de estado cambia con fade: verde → gris
   - Clase Tailwind: transition-opacity duration-300

2. REACTIVAR USUARIO (en la tabla)
   - La fila hace transition de opacity: 0.6 → 1 (300ms ease)
   - El badge de estado cambia con fade: gris → color del rol

3. PIN INCORRECTO (pantalla cocina)
   - Los 4 circulos hacen shake horizontal (150ms, 3 ciclos)
   - Los circulos pasan de relleno a borde rojo (200ms)
   - Despues de 500ms: reset a circulos vacios
   - CSS: @keyframes shake {
       0%, 100% { transform: translateX(0); }
       25% { transform: translateX(-8px); }
       75% { transform: translateX(8px); }
     }

4. PIN CORRECTO (pantalla cocina)
   - Los 4 circulos pasan a verde breve (200ms)
   - Fade out de la pantalla completa (300ms)
   - Fade in del KDS

5. LOADING EN FORMULARIOS
   - Boton de submit muestra spinner (Loader2 de lucide, animate-spin)
   - Todos los campos se deshabilitan (disabled)
   - Texto del boton cambia: "Guardar" → "Guardando..."

6. MODAL OPEN/CLOSE
   - Usa las animaciones por defecto de Dialog de shadcn/ui
   - Fade in + scale de 95% a 100% (150ms)
   - Overlay: fade in de bg-black/50

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 7.4 Estado vacio: Sin usuarios creados (solo el admin)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  Usuarios del restaurante (1)                            │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │          ┌────────────────────┐                    │  │
│  │          │                    │                    │  │
│  │          │    [icon users]    │                    │  │
│  │          │                    │                    │  │
│  │          └────────────────────┘                    │  │
│  │                                                    │  │
│  │    Solo estas tu por aqui                          │  │
│  │                                                    │  │
│  │    Agrega a tu equipo: cajeros, mozos y            │  │
│  │    cocineros para que todos puedan trabajar        │  │
│  │    con Lorito.                                     │  │
│  │                                                    │  │
│  │    ┌──────────────────────────────────────────┐    │  │
│  │    │          + AGREGAR PRIMER USUARIO         │    │  │
│  │    │            [56px, primary]                │    │  │
│  │    └──────────────────────────────────────────┘    │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Responsividad

### 8.1 Gestion de usuarios: Tablet vs Desktop

```
DESKTOP (>= 1024px, lg)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────┐ ┌──────────────────────────────────────┐
│  Sidebar   │ │  Settings submenu + DataTable         │
│  visible   │ │  Todas las columnas visibles          │
│  w-72      │ │  Filtros en linea                     │
│            │ │  Acciones con dropdown [...]           │
└────────────┘ └──────────────────────────────────────┘

  - Layout: sidebar fijo + content flex
  - DataTable: 6 columnas completas
  - Settings submenu: aside lateral lg:w-1/5
  - Formulario de crear/editar: Dialog centrado


TABLET (768px - 1023px, md)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────────────────┐
│ [≡] LOGO                              [Badge] [Av]  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Settings submenu (tabs horizontales)                │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐            │
│  │ Empresa │ │ Usuarios │ │ Mi perfil  │            │
│  └─────────┘ └──────────┘ └────────────┘            │
│                                                      │
│  DataTable (columnas reducidas):                     │
│  Nombre | Rol | Estado | Acciones                    │
│  (Email y Ultima actividad ocultas)                  │
│                                                      │
│  Boton "+ Nuevo usuario" ocupa ancho completo        │
│  encima de la tabla (sticky top)                     │
│                                                      │
└──────────────────────────────────────────────────────┘

  - Sidebar: oculto, accesible via hamburger menu (Sheet)
  - Settings submenu: Tabs horizontales en vez de aside
  - DataTable: 4 columnas (Nombre, Rol, Estado, Acciones)
  - Email visible al expandir la fila (click en row)
  - Formulario: Dialog de ancho completo (w-[90vw])


MOVIL (< 768px, sm)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────┐
│ [≡] LOGO               [Av]   │
├────────────────────────────────┤
│                                │
│ ┌────────────────────────────┐ │
│ │ + NUEVO USUARIO            │ │
│ │ [boton full-width, 56px]   │ │
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ Juan Perez        [ADMIN]  │ │
│ │ juan@rest.pe       Activo  │ │
│ │                      [>]   │ │
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ Maria Lopez      [CAJERO]  │ │
│ │ maria@rest.pe      Activo  │ │
│ │                      [>]   │ │
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ Pedro Chef       [COCINA]  │ │
│ │ (acceso PIN)       Activo  │ │
│ │                      [>]   │ │
│ └────────────────────────────┘ │
│                                │
└────────────────────────────────┘

  - Sin DataTable: lista de cards
  - Cada card muestra: nombre, rol badge, estado
  - Click en card → Sheet lateral con detalle + acciones
  - Formulario: Sheet full-height desde bottom
  - Settings submenu: Select dropdown en vez de tabs
```

### 8.2 Pagina de login: Responsividad

```
DESKTOP (>= 1024px)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌───────────────────┬───────────────┐
│                   │               │
│    LOGO GRANDE    │  Formulario   │
│    (fondo muted)  │  centrado     │
│                   │  max-w-350px  │
│                   │               │
└───────────────────┴───────────────┘
  Layout: grid-cols-2


TABLET (768px - 1023px)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────┐
│                                  │
│  ┌──────────┐                    │
│  │   LOGO   │ (mas pequeno)      │
│  └──────────┘                    │
│                                  │
│  ┌────────────────────────────┐  │
│  │  Formulario centrado       │  │
│  │  max-w-400px               │  │
│  │  padding: 32px             │  │
│  └────────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
  Layout: single column, logo arriba


MOVIL (< 768px)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────┐
│                            │
│      ┌──────────┐          │
│      │   LOGO   │          │
│      │  (small) │          │
│      └──────────┘          │
│                            │
│   Iniciar sesion           │
│                            │
│   ┌──────────────────────┐ │
│   │ Email                │ │
│   │ ┌──────────────────┐ │ │
│   │ │                  │ │ │
│   │ └──────────────────┘ │ │
│   └──────────────────────┘ │
│                            │
│   ┌──────────────────────┐ │
│   │ Contrasena           │ │
│   │ ┌──────────────────┐ │ │
│   │ │ ••••         [o] │ │ │
│   │ └──────────────────┘ │ │
│   └──────────────────────┘ │
│                            │
│   ┌──────────────────────┐ │
│   │   INICIAR SESION     │ │
│   │   [56px, full-width] │ │
│   └──────────────────────┘ │
│                            │
│   ¿Eres de cocina?         │
│   Ingresa con tu PIN →     │
│                            │
└────────────────────────────┘
  Layout: single column
  Padding: 16px
  Sin imagen de fondo
  Boton y campos full-width
  Input height: 48px (touch friendly)
```

### 8.3 Flujo de PIN en monitor de cocina

```
MONITOR DE COCINA (15-24", montado en pared, landscape)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PANTALLA DE SELECCION DE PERFIL:

┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                                                                          │
│                     Selecciona tu perfil                                  │
│                                                                          │
│                                                                          │
│     ┌────────────────┐    ┌────────────────┐    ┌────────────────┐       │
│     │                │    │                │    │                │       │
│     │                │    │                │    │                │       │
│     │    PEDRO       │    │    MARIA       │    │    CARLOS      │       │
│     │    ┌──────┐    │    │    ┌──────┐    │    │    ┌──────┐    │       │
│     │    │ INIT │    │    │    │ INIT │    │    │    │ INIT │    │       │
│     │    └──────┘    │    │    └──────┘    │    │    └──────┘    │       │
│     │                │    │                │    │                │       │
│     │   [COCINA]     │    │   [COCINA]     │    │   [BARRA]     │       │
│     │   orange       │    │   orange       │    │   cyan         │       │
│     │                │    │                │    │                │       │
│     └────────────────┘    └────────────────┘    └────────────────┘       │
│                                                                          │
│     Cards: 200x240px cada una                                            │
│     Avatar grande: 80x80px                                               │
│     Nombre: text-2xl (24px)                                              │
│     Badge: text-lg (18px)                                                │
│     Espaciado: gap-8 (32px)                                              │
│                                                                          │
│                                                                          │
│     ┌──────────────────────────────────────────────────────────────┐     │
│     │  ¿No eres de cocina? Inicia sesion con email →              │     │
│     └──────────────────────────────────────────────────────────────┘     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘


PANTALLA DE PIN (en monitor de cocina):

┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                                                                          │
│                       Ingresa tu PIN                                     │
│                                                                          │
│                       Hola, Pedro                                        │
│                                                                          │
│                 ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                      │
│                 │  ●  │  │  ○  │  │  ○  │  │  ○  │                      │
│                 └─────┘  └─────┘  └─────┘  └─────┘                      │
│                 Circulos: 24px diametro                                   │
│                                                                          │
│                                                                          │
│          ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│          │          │  │          │  │          │                        │
│          │    1     │  │    2     │  │    3     │                        │
│          │          │  │          │  │          │                        │
│          │  (80px)  │  │  (80px)  │  │  (80px)  │                        │
│          └──────────┘  └──────────┘  └──────────┘                        │
│                                                                          │
│          ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│          │          │  │          │  │          │                        │
│          │    4     │  │    5     │  │    6     │                        │
│          │          │  │          │  │          │                        │
│          └──────────┘  └──────────┘  └──────────┘                        │
│                                                                          │
│          ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│          │          │  │          │  │          │                        │
│          │    7     │  │    8     │  │    9     │                        │
│          │          │  │          │  │          │                        │
│          └──────────┘  └──────────┘  └──────────┘                        │
│                                                                          │
│          ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│          │          │  │          │  │          │                        │
│          │ ← Atras  │  │    0     │  │  Borrar  │                        │
│          │          │  │          │  │          │                        │
│          └──────────┘  └──────────┘  └──────────┘                        │
│                                                                          │
│                                                                          │
│  Botones: 80x80px minimo (P2: botones gorila)                            │
│  Font-size: text-3xl (30px) en los numeros                               │
│  Gap entre botones: 12px                                                 │
│  Todo centrado en pantalla                                               │
│  Texto "Hola, Pedro": text-2xl                                          │
│  Texto "Ingresa tu PIN": text-3xl, font-bold                            │
│                                                                          │
│  El boton "← Atras" vuelve a la pantalla de seleccion de perfil         │
│  El boton "Borrar" elimina el ultimo digito ingresado                    │
│  Auto-submit al 4to digito (sin boton "Entrar")                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 8.4 Breakpoints y reglas generales

```
BREAKPOINTS TAILWIND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BREAKPOINT    PIXELS      DISPOSITIVO
─────────     ──────      ──────────────────────────
sm            640px       Movil grande (landscape)
md            768px       Tablet portrait
lg            1024px      Tablet landscape / desktop
xl            1280px      Desktop grande
2xl           1536px      Monitor de cocina grande

REGLAS DE ADAPTACION:

1. SIDEBAR
   - < md: oculto, Sheet hamburger
   - >= md pero < lg: oculto, Sheet hamburger
   - >= lg: visible fijo w-72
   - KITCHEN/BARTENDER: nunca sidebar

2. DATATABLE → CARDS
   - >= lg: DataTable completa (6 columnas)
   - md a lg: DataTable reducida (4 columnas)
   - < md: Lista de cards (sin tabla)

3. MODALES → SHEETS
   - >= md: Dialog centrado
   - < md: Sheet full-width desde bottom

4. FILTROS
   - >= md: en linea (row)
   - < md: colapsables (Accordion o Sheet de filtros)

5. TECLADO PIN (cocina)
   - Siempre centrado
   - Botones se escalan:
     Monitor grande (>= xl): 100x100px, text-4xl
     Tablet (md-lg): 80x80px, text-3xl
     Movil: 64x64px, text-2xl
```

---

## Apendice A: Resumen de componentes shadcn/ui utilizados

```
COMPONENTE           USO EN ESTE MODULO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dialog               Modal crear/editar usuario, reset password
AlertDialog          Confirmacion desactivar usuario
Button               Acciones primarias, secundarias, destructivas
Input                Campos de texto (nombre, email, password)
Select               Selector de rol, filtros
Badge                Rol del usuario (colores por rol)
Toast/Toaster        Feedback de acciones exitosas/fallidas
Table (DataTable)    Lista de usuarios
DropdownMenu         Menu de acciones por usuario, user nav
Sheet                Sidebar mobile, formularios en movil
Avatar               Icono de usuario en header y perfiles cocina
Switch               Toggle activo/inactivo
Form (RHF)           Formularios con validacion Zod
Separator            Divisores en layout de settings
ScrollArea           Scroll de la tabla si muchos usuarios
Tabs                 Submenu de settings en tablet
```

## Apendice B: Mapa de archivos a crear/modificar

```
ARCHIVOS NUEVOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

src/app/[subdomain]/dashboard/(dashboard)/settings/users/page.tsx
  → Pagina de gestion de usuarios

src/app/[subdomain]/login/kitchen/page.tsx
  → Pagina de login con PIN para cocina

src/user/components/users-data-table.tsx
  → DataTable de usuarios

src/user/components/user-form-modal.tsx
  → Modal de crear/editar usuario

src/user/components/role-badge.tsx
  → Componente Badge de rol con colores

src/user/components/pin-input.tsx
  → Componente de teclado PIN

src/user/components/kitchen-profile-selector.tsx
  → Selector de perfiles de cocina

src/user/schemas/user-management-schema.ts
  → Schemas Zod para crear/editar usuario

src/app/[subdomain]/dashboard/access-denied/page.tsx
  → Pagina de acceso denegado

ARCHIVOS A MODIFICAR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

prisma/schema.prisma
  → Agregar enum UserRole, campos role/pin/active/lastActivityAt a User

src/middleware.ts
  → Agregar validacion de rol y rutas permitidas

src/lib/auth-config.ts
  → Agregar role y active al token JWT y session

src/lib/auth.ts
  → Ampliar tipo Session con role y active

src/user/types.ts
  → Agregar role, pin, active, lastActivityAt

src/user/actions.ts
  → Agregar acciones de gestion (CRUD, desactivar, resetear pass)

src/user/db_repository.ts
  → Agregar queries de listado, filtrado, actualizacion

src/constants/data.ts
  → Agregar allowedRoles a navItems

src/shared/components/layout/sidebar.tsx
  → Filtrar navItems segun rol del usuario en sesion

src/shared/components/layout/header.tsx
  → Agregar badge de rol y adaptar para cocina

src/shared/components/layout/user-nav.tsx
  → Agregar badge de rol, condicionar opciones por rol

src/app/[subdomain]/dashboard/(dashboard)/layout.tsx
  → Ocultar sidebar para KITCHEN/BARTENDER
```

## Apendice C: Esquema de validacion Zod propuesto

```typescript
// src/user/schemas/user-management-schema.ts

import { z } from "zod";

const baseUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres")
                   .max(100, "El nombre no puede exceder 100 caracteres"),
  role: z.enum(["ADMIN", "CASHIER", "WAITER", "KITCHEN", "BARTENDER"], {
    required_error: "Selecciona un rol",
  }),
});

// Para ADMIN, CASHIER, WAITER
const emailUserSchema = baseUserSchema.extend({
  email: z.string().email("Ingresa un email valido"),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
});

// Para KITCHEN, BARTENDER
const pinUserSchema = baseUserSchema.extend({
  pin: z.string().regex(/^\d{4}$/, "El PIN debe ser de 4 digitos"),
});

// Schema dinamico segun rol seleccionado
export const createUserSchema = z.discriminatedUnion("role", [
  emailUserSchema.extend({ role: z.literal("ADMIN") }),
  emailUserSchema.extend({ role: z.literal("CASHIER") }),
  emailUserSchema.extend({ role: z.literal("WAITER") }),
  pinUserSchema.extend({ role: z.literal("KITCHEN") }),
  pinUserSchema.extend({ role: z.literal("BARTENDER") }),
]);

// Schema para editar (password opcional)
export const editUserSchema = baseUserSchema.extend({
  email: z.string().email("Ingresa un email valido").optional(),
  active: z.boolean(),
});
```

---

*Documento generado para el branch `user-roles` del proyecto Lorito Killer POS.*
*Referencia: docs/product-mvp-restaurante.md (roles de usuario, seccion 2)*
*Referencia: docs/ux-flows-restaurante.md (principios UX, arquitectura de informacion)*
