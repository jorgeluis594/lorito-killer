# Historias de Usuario para QA - Modulo de Roles de Usuario

**Version:** 1.1
**Fecha:** 2026-03-08
**Documento base:** `product-roles-usuario.md`
**Rama:** `user-roles`

---

## Alcance

Este documento cubre unicamente las funcionalidades que pueden ser probadas con la implementacion actual. Las siguientes funcionalidades estan **fuera de alcance** porque las paginas aun no existen:

- `/dashboard/tables` (Mesas) - No implementado
- `/dashboard/kitchen` (KDS Cocina) - No implementado
- `/dashboard/bar` (KDS Barra) - No implementado
- `/dashboard/users` (Gestion de usuarios) - No implementado
- Login con PIN (pantalla de teclado numerico) - No implementado

**Roles que dependen de paginas no implementadas:**
- **WAITER**: Su pantalla de inicio seria `/dashboard/tables` (no existe). Solo se prueban restricciones backend.
- **KITCHEN**: Su pantalla de inicio seria `/dashboard/kitchen` (no existe). Solo se prueban restricciones backend.
- **BARTENDER**: Su pantalla de inicio seria `/dashboard/bar` (no existe). Solo se prueban restricciones backend.

**Rutas existentes del dashboard:**

| Ruta | Descripcion |
|---|---|
| `/dashboard` | Dashboard principal |
| `/dashboard/orders/new` | Nueva venta |
| `/dashboard/orders` | Comprobantes de venta |
| `/dashboard/orders/[id]` | Detalle de orden |
| `/dashboard/sales_reports` | Reporte de ventas |
| `/dashboard/cash_shifts` | Caja chica / Turnos de caja |
| `/dashboard/cash_shifts/[id]/reports` | Reporte de turno |
| `/dashboard/products` | Gestion de productos |
| `/dashboard/stock_adjustments` | Movimientos de stock |
| `/dashboard/settings` | Configuracion |
| `/dashboard/settings/company` | Configuracion de empresa |

**Items de navegacion actuales en el sidebar:**

1. Nueva venta (`/dashboard/orders/new`)
2. Comprobantes de venta (`/dashboard/orders`)
3. Reporte de ventas (`/dashboard/sales_reports`)
4. Caja chica (`/dashboard/cash_shifts`)
5. Productos (`/dashboard/products`)
6. Movimientos de stock (`/dashboard/stock_adjustments`)

---

## Tabla de Contenidos

1. [Autenticacion y Login](#grupo-1-autenticacion-y-login)
2. [Navegacion filtrada por rol (Sidebar)](#grupo-2-navegacion-filtrada-por-rol-sidebar)
3. [Restriccion de acceso a rutas](#grupo-3-restriccion-de-acceso-a-rutas)
4. [Proteccion en Server Actions y API Routes](#grupo-4-proteccion-en-server-actions-y-api-routes)
5. [Permisos especificos por funcionalidad](#grupo-5-permisos-especificos-por-funcionalidad)
6. [Migracion y compatibilidad](#grupo-6-migracion-y-compatibilidad)

---

## Grupo 1: Autenticacion y Login

---

### QA-US01: Login de ADMIN redirige al dashboard principal

**Como** usuario con rol ADMIN
**Quiero** que al iniciar sesion me lleve al dashboard principal
**Para** comenzar a trabajar con la vista general del negocio

**Precondiciones:**
- Existe un usuario con rol ADMIN, activo, con email y contrasena conocidos

**Pasos:**
1. Ir a la pagina de login
2. Ingresar email y contrasena del usuario ADMIN
3. Click en "Iniciar sesion"

**Criterios de aceptacion:**
- [ ] El login es exitoso y no muestra errores
- [ ] El usuario es redirigido a `/dashboard`
- [ ] El sidebar de navegacion es visible con todos los items
- [ ] La sesion del usuario contiene el campo `role` con valor `ADMIN`

**HU relacionada:** HU-07
**Prioridad:** Must Have (M10)

---

### QA-US02: Login de CASHIER redirige a Nueva Venta

**Como** usuario con rol CASHIER
**Quiero** que al iniciar sesion me lleve directamente a la pantalla de nueva venta
**Para** comenzar a operar la caja inmediatamente

**Precondiciones:**
- Existe un usuario con rol CASHIER, activo, con email y contrasena conocidos

**Pasos:**
1. Ir a la pagina de login
2. Ingresar email y contrasena del usuario CASHIER
3. Click en "Iniciar sesion"

**Criterios de aceptacion:**
- [ ] El login es exitoso y no muestra errores
- [ ] El usuario es redirigido a `/dashboard/orders/new`
- [ ] El sidebar de navegacion muestra solo los items permitidos para CASHIER
- [ ] La sesion del usuario contiene el campo `role` con valor `CASHIER`

**HU relacionada:** HU-07
**Prioridad:** Must Have (M10)

---

### QA-US03: Login con cuenta desactivada es denegado

**Como** sistema
**Quiero** impedir el acceso de usuarios con cuenta desactivada
**Para** garantizar que ex-empleados no puedan acceder al sistema

**Precondiciones:**
- Existe un usuario con `active = false` en la base de datos (se puede configurar directamente en BD con Prisma Studio o SQL)

**Pasos:**
1. Ir a la pagina de login
2. Ingresar email y contrasena del usuario desactivado
3. Click en "Iniciar sesion"

**Criterios de aceptacion:**
- [ ] El login es denegado
- [ ] Se muestra el mensaje "Cuenta desactivada. Contacta a tu administrador." (o mensaje equivalente)
- [ ] El usuario NO es redirigido al dashboard
- [ ] No se crea sesion para el usuario desactivado

**HU relacionada:** HU-03
**Prioridad:** Must Have (M12)
**Regla de negocio:** RN-07

---

### QA-US04: La sesion refleja el rol actual del usuario

**Como** sistema
**Quiero** que la sesion siempre refleje el rol actual almacenado en la base de datos
**Para** que los cambios de rol se apliquen sin necesidad de cerrar sesion

**Precondiciones:**
- Un usuario CASHIER con sesion activa en navegador A
- Un usuario ADMIN con sesion activa en navegador B
- Acceso directo a la base de datos (Prisma Studio) como alternativa al panel de usuarios

**Pasos:**
1. En navegador A: login como CASHIER, verificar que ve sidebar de CASHIER
2. Cambiar el rol del usuario de CASHIER a ADMIN directamente en la base de datos (via Prisma Studio o SQL: `UPDATE "User" SET role = 'ADMIN' WHERE email = '...'`)
3. En navegador A: recargar la pagina

**Criterios de aceptacion:**
- [ ] Despues de recargar, el sidebar muestra todos los items (comportamiento de ADMIN)
- [ ] El usuario puede acceder a rutas que antes estaban restringidas (por ejemplo `/dashboard/products`)
- [ ] La sesion muestra el nuevo rol `ADMIN`
- [ ] No se requirio cerrar sesion ni volver a iniciar sesion

**HU relacionada:** HU-06
**Prioridad:** Must Have (M6)
**Regla de negocio:** RN-09

---

## Grupo 2: Navegacion filtrada por rol (Sidebar)

---

### QA-US05: Sidebar del ADMIN muestra todos los items de navegacion

**Como** usuario con rol ADMIN
**Quiero** ver el menu lateral completo con todas las opciones
**Para** poder acceder a cualquier funcionalidad del sistema

**Precondiciones:**
- Login exitoso como ADMIN

**Pasos:**
1. Login como ADMIN
2. Observar el sidebar de navegacion

**Criterios de aceptacion:**
- [ ] El sidebar muestra "Nueva venta"
- [ ] El sidebar muestra "Comprobantes de venta"
- [ ] El sidebar muestra "Reporte de ventas"
- [ ] El sidebar muestra "Caja chica"
- [ ] El sidebar muestra "Productos"
- [ ] El sidebar muestra "Movimientos de stock"
- [ ] Todos los items son clickeables y navegan a su ruta correspondiente

**HU relacionada:** HU-08
**Prioridad:** Must Have (M7)

---

### QA-US06: Sidebar del CASHIER muestra solo opciones operativas

**Como** usuario con rol CASHIER
**Quiero** ver solo las opciones de navegacion relevantes a mi trabajo de caja
**Para** no distraerme con funciones administrativas

**Precondiciones:**
- Login exitoso como CASHIER

**Pasos:**
1. Login como CASHIER
2. Observar el sidebar de navegacion

**Criterios de aceptacion:**
- [ ] El sidebar muestra "Nueva venta"
- [ ] El sidebar muestra "Comprobantes de venta"
- [ ] El sidebar muestra "Caja chica"
- [ ] El sidebar NO muestra "Productos"
- [ ] El sidebar NO muestra "Reporte de ventas"
- [ ] El sidebar NO muestra "Movimientos de stock"

**HU relacionada:** HU-08
**Prioridad:** Must Have (M7)

---

### QA-US07: Sidebar del WAITER no muestra opciones administrativas

**Como** usuario con rol WAITER
**Quiero** no ver opciones de gestion que no me corresponden
**Para** tener una interfaz simplificada

**Precondiciones:**
- Login exitoso como WAITER (nota: la pantalla de inicio `/dashboard/tables` no existe aun, el WAITER podria ser redirigido a `/dashboard` o mostrar un mensaje)

**Pasos:**
1. Login como WAITER
2. Observar el sidebar de navegacion (si se muestra)

**Criterios de aceptacion:**
- [ ] El sidebar NO muestra "Productos"
- [ ] El sidebar NO muestra "Reporte de ventas"
- [ ] El sidebar NO muestra "Caja chica"
- [ ] El sidebar NO muestra "Movimientos de stock"
- [ ] El sidebar NO muestra "Nueva venta"
- [ ] El sidebar NO muestra "Comprobantes de venta"

**Nota:** Con las paginas actuales, el WAITER no tiene items de navegacion en el sidebar (su unico item seria "Mesas" que no existe aun). Se espera sidebar vacio o sin sidebar.

**HU relacionada:** HU-08
**Prioridad:** Must Have (M7)

---

## Grupo 3: Restriccion de acceso a rutas

---

### QA-US08: CASHIER no puede acceder a rutas exclusivas de ADMIN

**Como** sistema
**Quiero** impedir que un CASHIER acceda a rutas restringidas por URL directa
**Para** garantizar la seguridad del control de acceso

**Precondiciones:**
- Login exitoso como CASHIER

**Pasos:**
1. Login como CASHIER
2. Navegar manualmente a `/dashboard/products`
3. Navegar manualmente a `/dashboard/sales_reports`
4. Navegar manualmente a `/dashboard/stock_adjustments`
5. Navegar manualmente a `/dashboard/settings/company`

**Criterios de aceptacion:**
- [ ] Al acceder a `/dashboard/products`, el CASHIER es redirigido a su pantalla de inicio (`/dashboard/orders/new`) o recibe un mensaje de "No tienes permisos"
- [ ] Al acceder a `/dashboard/sales_reports`, ocurre la misma redireccion o bloqueo
- [ ] Al acceder a `/dashboard/stock_adjustments`, ocurre la misma redireccion o bloqueo
- [ ] Al acceder a `/dashboard/settings/company`, ocurre la misma redireccion o bloqueo
- [ ] En ningun caso el CASHIER puede ver el contenido de estas paginas

**HU relacionada:** HU-09, HU-10
**Prioridad:** Must Have (M8)

---

### QA-US09: WAITER no puede acceder a rutas del dashboard

**Como** sistema
**Quiero** impedir que un WAITER acceda a rutas que no le corresponden
**Para** limitar el acceso a solo las funciones de su rol

**Precondiciones:**
- Login exitoso como WAITER

**Pasos:**
1. Login como WAITER
2. Navegar manualmente a `/dashboard/products`
3. Navegar manualmente a `/dashboard/orders/new`
4. Navegar manualmente a `/dashboard/cash_shifts`
5. Navegar manualmente a `/dashboard/sales_reports`
6. Navegar manualmente a `/dashboard/stock_adjustments`

**Criterios de aceptacion:**
- [ ] Al acceder a `/dashboard/products`, el WAITER es redirigido o bloqueado
- [ ] Al acceder a `/dashboard/orders/new`, el WAITER es redirigido o bloqueado
- [ ] Al acceder a `/dashboard/cash_shifts`, el WAITER es redirigido o bloqueado
- [ ] Al acceder a `/dashboard/sales_reports`, el WAITER es redirigido o bloqueado
- [ ] Al acceder a `/dashboard/stock_adjustments`, el WAITER es redirigido o bloqueado
- [ ] En ningun caso el WAITER puede ver el contenido de paginas restringidas

**HU relacionada:** HU-09
**Prioridad:** Must Have (M8)

---

### QA-US10: KITCHEN no puede acceder a ninguna ruta del dashboard

**Como** sistema
**Quiero** impedir que un KITCHEN acceda a cualquier ruta del dashboard existente
**Para** restringirlo exclusivamente a su futura pantalla KDS

**Precondiciones:**
- Login exitoso como KITCHEN

**Pasos:**
1. Login como KITCHEN
2. Navegar manualmente a `/dashboard`
3. Navegar manualmente a `/dashboard/products`
4. Navegar manualmente a `/dashboard/orders/new`
5. Navegar manualmente a `/dashboard/cash_shifts`
6. Navegar manualmente a `/dashboard/sales_reports`

**Criterios de aceptacion:**
- [ ] Al acceder a `/dashboard`, el KITCHEN es redirigido o bloqueado
- [ ] Al acceder a `/dashboard/products`, el KITCHEN es redirigido o bloqueado
- [ ] Al acceder a `/dashboard/orders/new`, el KITCHEN es redirigido o bloqueado
- [ ] Al acceder a `/dashboard/cash_shifts`, el KITCHEN es redirigido o bloqueado
- [ ] Al acceder a `/dashboard/sales_reports`, el KITCHEN es redirigido o bloqueado
- [ ] El KITCHEN no tiene sidebar de navegacion visible
- [ ] En ningun caso puede ver contenido de paginas del dashboard

**HU relacionada:** HU-09
**Prioridad:** Must Have (M8)

---

### QA-US11: BARTENDER no puede acceder a ninguna ruta del dashboard

**Como** sistema
**Quiero** impedir que un BARTENDER acceda a cualquier ruta del dashboard existente
**Para** restringirlo exclusivamente a su futura pantalla KDS

**Precondiciones:**
- Login exitoso como BARTENDER

**Pasos:**
1. Login como BARTENDER
2. Navegar manualmente a `/dashboard`
3. Navegar manualmente a `/dashboard/products`
4. Navegar manualmente a `/dashboard/orders/new`
5. Navegar manualmente a `/dashboard/cash_shifts`

**Criterios de aceptacion:**
- [ ] Al acceder a `/dashboard`, el BARTENDER es redirigido o bloqueado
- [ ] Al acceder a `/dashboard/products`, el BARTENDER es redirigido o bloqueado
- [ ] Al acceder a `/dashboard/orders/new`, el BARTENDER es redirigido o bloqueado
- [ ] Al acceder a `/dashboard/cash_shifts`, el BARTENDER es redirigido o bloqueado
- [ ] El BARTENDER no tiene sidebar de navegacion visible
- [ ] En ningun caso puede ver contenido de paginas del dashboard

**HU relacionada:** HU-09
**Prioridad:** Must Have (M8)

---

## Grupo 4: Proteccion en Server Actions y API Routes

---

### QA-US12: CASHIER no puede crear productos via API

**Como** sistema
**Quiero** que las API routes validen el rol antes de ejecutar operaciones
**Para** impedir que roles no autorizados manipulen datos protegidos

**Precondiciones:**
- Login exitoso como CASHIER
- Cookie de sesion disponible para hacer requests directos

**Pasos:**
1. Login como CASHIER
2. Enviar un request POST a `/api/products` con datos de un producto valido (usando la cookie de sesion del CASHIER, via DevTools o curl)

**Criterios de aceptacion:**
- [ ] La API retorna un error de autorizacion (status HTTP 403 o response con `success: false` y tipo `AuthorizationError`)
- [ ] El producto NO se crea en la base de datos
- [ ] El mensaje de error indica falta de permisos

**HU relacionada:** HU-09
**Prioridad:** Must Have (M9)

---

### QA-US13: CASHIER no puede editar ni eliminar productos via API

**Como** sistema
**Quiero** que las operaciones de modificacion de productos esten protegidas
**Para** garantizar que solo ADMIN pueda gestionar el catalogo

**Precondiciones:**
- Login exitoso como CASHIER
- Existe al menos un producto en la base de datos

**Pasos:**
1. Login como CASHIER
2. Enviar un request PUT a `/api/products/[id]` con datos de edicion
3. Enviar un request DELETE a `/api/products/[id]`

**Criterios de aceptacion:**
- [ ] El PUT retorna error de autorizacion, el producto NO se modifica
- [ ] El DELETE retorna error de autorizacion, el producto NO se elimina
- [ ] Ambos responses indican falta de permisos

**HU relacionada:** HU-09
**Prioridad:** Must Have (M9)

---

### QA-US14: CASHIER no puede crear, editar ni eliminar categorias

**Como** sistema
**Quiero** que las server actions de categorias validen el rol
**Para** que solo ADMIN pueda gestionar categorias

**Precondiciones:**
- Login exitoso como CASHIER

**Pasos:**
1. Login como CASHIER
2. Invocar la server action `createCategory` con datos validos
3. Invocar la server action `updateCategory` con un ID existente
4. Invocar la server action `deleteCategory` con un ID existente

**Criterios de aceptacion:**
- [ ] `createCategory` retorna `{ success: false }` con tipo `AuthorizationError`
- [ ] `updateCategory` retorna `{ success: false }` con tipo `AuthorizationError`
- [ ] `deleteCategory` retorna `{ success: false }` con tipo `AuthorizationError`
- [ ] Ninguna categoria se crea, modifica ni elimina en la base de datos

**HU relacionada:** HU-09
**Prioridad:** Must Have (M9)

---

### QA-US15: WAITER no puede cancelar ordenes

**Como** sistema
**Quiero** impedir que un WAITER cancele ordenes
**Para** que solo ADMIN y CASHIER tengan control sobre cancelaciones

**Precondiciones:**
- Login exitoso como WAITER
- Existe una orden en la base de datos

**Pasos:**
1. Login como WAITER
2. Invocar la server action `cancelOrder` con el ID de una orden existente

**Criterios de aceptacion:**
- [ ] La server action retorna `{ success: false }` con tipo `AuthorizationError`
- [ ] La orden NO cambia de estado en la base de datos
- [ ] El motivo del rechazo indica falta de permisos para la accion

**HU relacionada:** HU-09
**Prioridad:** Must Have (M9)

---

### QA-US16: WAITER no puede exportar productos

**Como** sistema
**Quiero** impedir que un WAITER exporte datos
**Para** que la exportacion sea exclusiva del ADMIN

**Precondiciones:**
- Login exitoso como WAITER
- Cookie de sesion disponible

**Pasos:**
1. Login como WAITER
2. Enviar un request GET a `/api/products/export` con la cookie de sesion

**Criterios de aceptacion:**
- [ ] La API retorna error de autorizacion
- [ ] No se genera ni descarga ningun archivo de exportacion
- [ ] El response indica falta de permisos

**HU relacionada:** HU-09
**Prioridad:** Must Have (M9)

---

### QA-US17: KITCHEN y BARTENDER no pueden crear ordenes

**Como** sistema
**Quiero** impedir que roles de cocina/barra creen ordenes
**Para** que solo ADMIN, CASHIER y WAITER puedan crear pedidos

**Precondiciones:**
- Login exitoso como KITCHEN (y repetir como BARTENDER)

**Pasos:**
1. Login como KITCHEN
2. Invocar la server action de creacion de orden con datos validos
3. Repetir pasos 1-2 con usuario BARTENDER

**Criterios de aceptacion:**
- [ ] Con KITCHEN: la server action retorna `{ success: false }` con tipo `AuthorizationError`
- [ ] Con BARTENDER: la server action retorna `{ success: false }` con tipo `AuthorizationError`
- [ ] Ninguna orden se crea en la base de datos
- [ ] Los mensajes de error indican falta de permisos

**HU relacionada:** HU-09
**Prioridad:** Must Have (M9)

---

### QA-US18: ADMIN puede ejecutar todas las acciones protegidas

**Como** usuario con rol ADMIN
**Quiero** poder ejecutar todas las operaciones del sistema sin restricciones
**Para** tener control total sobre la configuracion y operacion del negocio

**Precondiciones:**
- Login exitoso como ADMIN
- Datos base disponibles (categorias, productos)

**Pasos:**
1. Login como ADMIN
2. Crear un producto desde `/dashboard/products`
3. Editar el producto creado
4. Ocultar/eliminar el producto
5. Crear una categoria
6. Crear una orden desde `/dashboard/orders/new`
7. Cancelar la orden creada
8. Exportar productos desde `/api/products/export`

**Criterios de aceptacion:**
- [ ] Crear producto: exito, el producto aparece en la lista
- [ ] Editar producto: exito, los cambios se reflejan
- [ ] Ocultar producto: exito, el producto cambia de estado
- [ ] Crear categoria: exito, la categoria aparece disponible
- [ ] Crear orden: exito, la orden se registra correctamente
- [ ] Cancelar orden: exito, la orden cambia a estado cancelado
- [ ] Exportar productos: exito, se descarga el archivo de exportacion
- [ ] Ninguna operacion muestra error de autorizacion

**HU relacionada:** HU-09
**Prioridad:** Must Have (M9)

---

## Grupo 5: Permisos especificos por funcionalidad

---

### QA-US19: Permisos de productos - solo ADMIN puede gestionar

**Como** sistema
**Quiero** que solo el ADMIN pueda crear, editar y eliminar productos
**Para** proteger la integridad del catalogo de productos

**Precondiciones:**
- Usuarios de cada rol disponibles para login
- Al menos un producto existente en la base de datos

**Pasos:**
1. Login como ADMIN: crear producto, editar producto, ocultar producto
2. Login como CASHIER: intentar crear producto via API, intentar editar producto via API
3. Login como WAITER: intentar acceder a `/dashboard/products`
4. Login como KITCHEN: intentar acceder a `/dashboard/products`
5. Login como BARTENDER: intentar acceder a `/dashboard/products`

**Criterios de aceptacion:**
- [ ] ADMIN: puede crear, editar y ocultar productos sin restriccion
- [ ] CASHIER: recibe error de autorizacion en las API de productos (POST, PUT, DELETE)
- [ ] WAITER: es redirigido o bloqueado al intentar acceder a `/dashboard/products`
- [ ] KITCHEN: es redirigido o bloqueado al intentar acceder a `/dashboard/products`
- [ ] BARTENDER: es redirigido o bloqueado al intentar acceder a `/dashboard/products`

**Matriz:** 3.1 Gestion de Productos y Carta

---

### QA-US20: Permisos de ordenes - ADMIN y CASHIER pueden crear y cancelar

**Como** sistema
**Quiero** que solo ADMIN y CASHIER puedan crear ordenes y gestionar cancelaciones
**Para** asegurar control adecuado sobre las ventas

**Precondiciones:**
- Usuarios ADMIN, CASHIER, WAITER disponibles
- Productos existentes para crear ordenes

**Pasos:**
1. Login como ADMIN: crear orden, cancelar orden
2. Login como CASHIER: crear orden, cancelar orden
3. Login como WAITER: intentar crear orden via server action
4. Login como KITCHEN: intentar crear orden via server action

**Criterios de aceptacion:**
- [ ] ADMIN: puede crear ordenes desde `/dashboard/orders/new` sin restriccion
- [ ] ADMIN: puede cancelar cualquier orden
- [ ] CASHIER: puede crear ordenes desde `/dashboard/orders/new` sin restriccion
- [ ] CASHIER: puede cancelar ordenes (con motivo obligatorio)
- [ ] WAITER: la server action de crear orden es aceptada (tiene permiso de crear ordenes)
- [ ] KITCHEN: la server action de crear orden retorna error de autorizacion

**Matriz:** 3.4 Toma de Pedidos, 3.11 Cancelacion de Pedidos

---

### QA-US21: Permisos de pagos - solo ADMIN y CASHIER procesan cobros

**Como** sistema
**Quiero** que solo ADMIN y CASHIER puedan procesar pagos y emitir comprobantes
**Para** mantener el control financiero en los roles autorizados

**Precondiciones:**
- Una orden creada y lista para cobrar
- Usuarios ADMIN, CASHIER disponibles

**Pasos:**
1. Login como ADMIN: procesar pago de una orden, emitir comprobante
2. Login como CASHIER: procesar pago de una orden, emitir comprobante
3. Login como WAITER: intentar procesar pago via server action

**Criterios de aceptacion:**
- [ ] ADMIN: puede procesar pagos (efectivo, tarjeta, billetera) y emitir boleta/factura/ticket
- [ ] CASHIER: puede procesar pagos y emitir comprobantes
- [ ] WAITER: recibe error de autorizacion al intentar procesar pagos

**Matriz:** 3.6 Procesamiento de Pagos

---

### QA-US22: Permisos de turnos de caja - solo ADMIN y CASHIER operan caja

**Como** sistema
**Quiero** que solo ADMIN y CASHIER puedan abrir/cerrar turnos de caja
**Para** asegurar responsabilidad en el manejo de efectivo

**Precondiciones:**
- Usuarios ADMIN, CASHIER, WAITER disponibles

**Pasos:**
1. Login como ADMIN: abrir turno de caja, registrar gasto, cerrar turno, ver reportes de todos los turnos
2. Login como CASHIER: abrir turno de caja, registrar gasto, cerrar turno propio, ver reporte de su propio turno
3. Login como WAITER: intentar acceder a `/dashboard/cash_shifts`

**Criterios de aceptacion:**
- [ ] ADMIN: puede abrir turno, cerrar turno propio, cerrar turno de otro usuario, ver todos los reportes
- [ ] CASHIER: puede abrir turno, cerrar su propio turno, registrar gastos, ver solo el reporte de su turno
- [ ] CASHIER: NO puede ver reportes de turnos de otros usuarios
- [ ] WAITER: es redirigido o bloqueado al intentar acceder a `/dashboard/cash_shifts`

**Matriz:** 3.7 Cash Shifts

---

### QA-US23: Permisos de reportes - solo ADMIN ve reportes globales

**Como** sistema
**Quiero** que solo el ADMIN pueda acceder a reportes de ventas globales
**Para** proteger informacion financiera sensible

**Precondiciones:**
- Usuarios ADMIN, CASHIER disponibles
- Datos de ventas existentes

**Pasos:**
1. Login como ADMIN: acceder a `/dashboard/sales_reports`, ver reporte global, verificar que puede exportar
2. Login como CASHIER: intentar acceder a `/dashboard/sales_reports`
3. Login como WAITER: intentar acceder a `/dashboard/sales_reports`

**Criterios de aceptacion:**
- [ ] ADMIN: puede acceder a `/dashboard/sales_reports` y ver reportes globales
- [ ] ADMIN: puede ver reportes por periodo, por producto
- [ ] ADMIN: puede exportar reportes
- [ ] CASHIER: es redirigido o bloqueado al intentar acceder a `/dashboard/sales_reports`
- [ ] WAITER: es redirigido o bloqueado al intentar acceder a `/dashboard/sales_reports`

**Matriz:** 3.8 Reportes de Ventas

---

### QA-US24: Permisos de configuracion - solo ADMIN configura la empresa

**Como** sistema
**Quiero** que solo el ADMIN pueda acceder a la configuracion de la empresa
**Para** proteger datos criticos como RUC, credenciales SUNAT y datos fiscales

**Precondiciones:**
- Usuarios ADMIN, CASHIER disponibles

**Pasos:**
1. Login como ADMIN: acceder a `/dashboard/settings/company`, verificar que puede editar datos
2. Login como CASHIER: intentar acceder a `/dashboard/settings/company`
3. Login como WAITER: intentar acceder a `/dashboard/settings/company`

**Criterios de aceptacion:**
- [ ] ADMIN: puede acceder a `/dashboard/settings/company` y editar datos de la empresa
- [ ] ADMIN: puede modificar RUC, razon social, credenciales de facturacion, logo
- [ ] CASHIER: es redirigido o bloqueado al intentar acceder a configuracion de empresa
- [ ] WAITER: es redirigido o bloqueado al intentar acceder a configuracion de empresa

**Matriz:** 3.10 Configuracion del Sistema

---

### QA-US25: Permisos de stock - solo ADMIN gestiona inventario

**Como** sistema
**Quiero** que solo el ADMIN pueda ver y gestionar movimientos de stock
**Para** mantener el control de inventario en manos del administrador

**Precondiciones:**
- Usuarios ADMIN, CASHIER disponibles

**Pasos:**
1. Login como ADMIN: acceder a `/dashboard/stock_adjustments`, ver movimientos, crear ajuste de inventario
2. Login como CASHIER: intentar acceder a `/dashboard/stock_adjustments`
3. Login como WAITER: intentar acceder a `/dashboard/stock_adjustments`

**Criterios de aceptacion:**
- [ ] ADMIN: puede acceder a `/dashboard/stock_adjustments` y ver movimientos de stock
- [ ] ADMIN: puede crear ajustes de inventario
- [ ] CASHIER: es redirigido o bloqueado al intentar acceder a movimientos de stock
- [ ] WAITER: es redirigido o bloqueado al intentar acceder a movimientos de stock

**Matriz:** 3.15 Gestion de Stock

---

### QA-US26: Permisos de exportacion - solo ADMIN puede exportar datos

**Como** sistema
**Quiero** que solo el ADMIN pueda exportar datos del sistema
**Para** controlar la extraccion de informacion sensible del negocio

**Precondiciones:**
- Usuarios ADMIN, CASHIER, WAITER disponibles
- Datos de productos existentes

**Pasos:**
1. Login como ADMIN: exportar lista de productos via `/api/products/export`
2. Login como CASHIER: intentar exportar productos via `/api/products/export`
3. Login como WAITER: intentar exportar productos via `/api/products/export`

**Criterios de aceptacion:**
- [ ] ADMIN: la exportacion se ejecuta correctamente y se genera el archivo
- [ ] CASHIER: recibe error de autorizacion, no se genera archivo
- [ ] WAITER: recibe error de autorizacion, no se genera archivo

**Matriz:** 3.13 Exportar Datos

---

## Grupo 6: Migracion y compatibilidad

---

### QA-US27: Usuarios existentes fueron migrados como ADMIN

**Como** sistema
**Quiero** que todos los usuarios creados antes del modulo de roles sean ADMIN
**Para** garantizar que ningun usuario existente pierda acceso a funcionalidades

**Precondiciones:**
- La migracion `20260308231415_add_user_roles` ha sido ejecutada
- Existen usuarios que fueron creados antes de la migracion

**Pasos:**
1. Verificar en la base de datos (via Prisma Studio o SQL) que la migracion existe en `_prisma_migrations`
2. Consultar la tabla `User` y verificar los campos `role`, `active` y `pin` de usuarios pre-existentes
3. Login con un usuario pre-existente

**Criterios de aceptacion:**
- [ ] La migracion `20260308231415_add_user_roles` aparece como ejecutada exitosamente
- [ ] Todos los usuarios pre-existentes tienen `role = 'ADMIN'`
- [ ] Todos los usuarios pre-existentes tienen `active = true`
- [ ] El campo `pin` es `null` para todos los usuarios pre-existentes
- [ ] Login con usuario pre-existente funciona exactamente como antes (sin cambios en la experiencia)
- [ ] El usuario pre-existente ve el sidebar completo y puede acceder a todas las rutas

**HU relacionada:** HU-18
**Prioridad:** Must Have (M3)
**Regla de negocio:** RN-03

---

### QA-US28: El primer usuario de una nueva company es ADMIN

**Como** sistema
**Quiero** que al registrar una nueva company, el usuario creador sea automaticamente ADMIN
**Para** garantizar que toda company tenga al menos un administrador desde el inicio

**Precondiciones:**
- Acceso al flujo de registro de nueva company (signup)

**Pasos:**
1. Completar el flujo de registro de una nueva company con un usuario nuevo
2. Login con el usuario recien creado
3. Verificar el rol en la base de datos

**Criterios de aceptacion:**
- [ ] El usuario creador de la company tiene `role = 'ADMIN'` en la base de datos
- [ ] El usuario tiene `active = true`
- [ ] Al hacer login, es redirigido a `/dashboard`
- [ ] Ve el sidebar completo con todos los items de navegacion
- [ ] Puede acceder a todas las rutas del dashboard sin restriccion

**HU relacionada:** HU-18
**Prioridad:** Must Have (M13)
**Regla de negocio:** RN-04

---

## Resumen

### Historias por grupo

| Grupo | Historias | Cantidad |
|---|---|---|
| Autenticacion y Login | QA-US01 a QA-US04 | 4 |
| Navegacion (Sidebar) | QA-US05 a QA-US07 | 3 |
| Restriccion de rutas | QA-US08 a QA-US11 | 4 |
| Server Actions y API | QA-US12 a QA-US18 | 7 |
| Permisos por funcionalidad | QA-US19 a QA-US26 | 8 |
| Migracion | QA-US27 a QA-US28 | 2 |
| **Total** | | **28** |

### Cobertura de reglas de negocio

| Regla | Historias QA |
|---|---|
| RN-03: Migracion a ADMIN | QA-US27 |
| RN-04: Primer usuario = ADMIN | QA-US28 |
| RN-07: Usuario desactivado no puede loguearse | QA-US03 |
| RN-09: Sesion refleja rol actual | QA-US04 |

### Cobertura de matrices de permisos

| Matriz | Historias QA |
|---|---|
| 3.1 Productos | QA-US19 |
| 3.2 Categorias | QA-US14 |
| 3.4 Toma de Pedidos | QA-US20 |
| 3.6 Pagos | QA-US21 |
| 3.7 Cash Shifts | QA-US22 |
| 3.8 Reportes | QA-US23 |
| 3.10 Configuracion | QA-US24 |
| 3.11 Cancelacion | QA-US20 |
| 3.13 Exportar | QA-US26 |
| 3.15 Stock | QA-US25 |

### Historias pendientes (requieren paginas no implementadas)

Las siguientes areas del documento de producto no pueden ser probadas aun y deberan generar historias de QA cuando se implementen:

| Funcionalidad pendiente | Paginas requeridas | HU relacionadas |
|---|---|---|
| Mapa de mesas y flujo de WAITER | `/dashboard/tables` | HU-08 (WAITER sidebar) |
| KDS de cocina | `/dashboard/kitchen` | HU-08 (KITCHEN), HU-09 |
| KDS de barra | `/dashboard/bar` | HU-08 (BARTENDER), HU-09 |
| CRUD de usuarios | `/dashboard/users` | HU-01 a HU-06, HU-12 |
| Login con PIN | Pantalla de teclado numerico | HU-13 |
| Desactivar/reactivar usuarios (UI) | `/dashboard/users` | HU-03 |
| Resetear contrasena (UI) | `/dashboard/users` | HU-04 |
| Cambiar contrasena propia | `/dashboard/settings` (perfil) | HU-11 |
| Autorizacion ADMIN para acciones criticas | Modal de credenciales | HU-14, HU-15 |
| Auditoria visible en UI | Modulo de auditoria | HU-16, HU-17 |
| Validaciones de PIN (unicidad, longitud, hash) | `/dashboard/users` | HU-12 |
