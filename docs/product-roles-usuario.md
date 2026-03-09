# Documento de Producto: Modulo de Roles de Usuario
## Lorito Killer POS -- Sistema de Control de Acceso por Roles

**Version:** 1.0
**Fecha:** 2026-03-07
**Estado:** Draft para revision de desarrollo
**Rama base:** `user-roles` (desde `main` en commit `65e0a9b`)
**Dependencia:** Este modulo es prerequisito para el MVP de Restaurantes descrito en `product-mvp-restaurante.md`

---

## Tabla de Contenidos

1. [Vision y Problema](#1-vision-y-problema)
2. [Definicion de Roles](#2-definicion-de-roles)
3. [Matriz de Permisos Completa](#3-matriz-de-permisos-completa)
4. [Historias de Usuario](#4-historias-de-usuario)
5. [Reglas de Negocio](#5-reglas-de-negocio)
6. [Metricas de Exito](#6-metricas-de-exito)
7. [Priorizacion MoSCoW](#7-priorizacion-moscow)

---

## 1. Vision y Problema

### Por que se necesitan roles en un restaurante

Un restaurante es un entorno operativo donde multiples personas con funciones muy diferentes comparten el mismo sistema. A diferencia del retail donde un cajero unico maneja la totalidad de la operacion, en un restaurante coexisten simultaneamente:

- Un **mozo** que toma pedidos desde una tablet en sala
- Un **cocinero** que visualiza comandas en una pantalla de cocina
- Un **cajero** que procesa cobros y emite comprobantes
- Un **bartender** que prepara bebidas viendo solo las ordenes de barra
- Un **administrador** que configura el menu, gestiona el equipo y revisa reportes

Sin un sistema de roles, todos estos perfiles tendrian acceso a absolutamente todo: un mozo podria modificar precios de la carta, un cocinero podria cancelar ventas ya cobradas, y cualquier empleado podria ver los reportes financieros del negocio. Esto no solo es un riesgo de seguridad, sino que genera una interfaz sobrecargada que no responde a las necesidades reales de cada perfil.

### Problemas que resuelve

**Seguridad y control de acceso:**
- Evitar que personal no autorizado modifique precios, cancele ordenes o acceda a reportes financieros.
- Proteger acciones criticas (cancelaciones, descuentos elevados) con validacion de un rol superior.
- Registrar quien realizo cada accion para trazabilidad completa.

**Eficiencia operativa:**
- Cada usuario ve solo las pantallas y funciones relevantes a su trabajo diario.
- El cocinero accede directamente al KDS sin navegar menus innecesarios.
- El mozo ve el mapa de mesas y la carta, sin distraerse con reportes o configuracion.
- El cajero accede a la caja y los cobros sin ver la vista de cocina.

**Control del negocio:**
- El dueno/administrador mantiene control total sobre la configuracion, los usuarios y los datos.
- Se puede auditar quien tomo cada pedido, quien aplico cada descuento y quien cancelo cada orden.
- Se reduce el riesgo de fraude interno (un problema frecuente en restaurantes de Peru donde la rotacion de personal es alta).

**Experiencia de usuario simplificada:**
- Cada rol tiene una pantalla de inicio optimizada para su flujo de trabajo principal.
- La navegacion lateral muestra solo los items relevantes al rol del usuario.
- Menos opciones visibles = menos errores = menos capacitacion necesaria.

### Situacion actual vs. objetivo

| Dimension | Hoy (sin roles) | Con el modulo de roles |
|---|---|---|
| Acceso | Todos los usuarios ven todo | Cada usuario ve solo lo que necesita |
| Navegacion | Menu lateral completo para todos | Menu filtrado por rol |
| Acciones criticas | Cualquiera puede cancelar/descontar | Solo roles autorizados, con aprobacion si es necesario |
| Gestion de usuarios | No existe CRUD de usuarios en el dashboard | El admin crea, edita, desactiva usuarios |
| Autenticacion | Solo email + password | Email + password para roles administrativos, PIN para cocina/barra |
| Trazabilidad | Las acciones no se asocian al rol | Cada accion registra usuario, rol y timestamp |
| Primer uso | Registro por signup externo | El primer usuario es ADMIN; el ADMIN crea al resto |

### Estado actual del modelo User

El modelo `User` en Prisma no tiene ningun campo de rol ni sistema de permisos:

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
}
```

No existe:
- Campo `role` en el modelo User
- Enum de roles en el schema de Prisma
- Middleware ni logica de autorizacion por rol en `middleware.ts`
- Pantalla de gestion de usuarios en el dashboard
- Filtrado de items de navegacion por rol (el sidebar muestra todos los items a todos los usuarios)
- Concepto de PIN para acceso simplificado
- Sistema de auditoria de acciones

La autenticacion actual usa NextAuth.js con `CredentialsProvider` (email + password) y la sesion incluye `id`, `name`, `email` y `companyId`, pero no incluye informacion de rol.

---

## 2. Definicion de Roles

### 2.1 ADMIN (Administrador / Dueno)

**Descripcion del perfil:**
Es el propietario del negocio, el gerente general o un encargado de confianza. Es quien configura el sistema, administra al equipo y supervisa toda la operacion. Puede haber mas de un ADMIN por company (por ejemplo, el dueno y su socio), pero es un rol que se asigna con cautela.

**Responsabilidades principales en el sistema:**
- Configurar el menu completo: productos, precios, categorias, disponibilidad, fotos
- Gestionar mesas y zonas del local
- Crear, editar y desactivar cuentas de usuario del equipo
- Asignar roles a cada usuario
- Ver todos los reportes de ventas, cierres de caja y rendimiento
- Configurar datos de la empresa (RUC, razon social, credenciales de facturacion SUNAT)
- Cancelar cualquier pedido, incluyendo los de otros usuarios
- Aplicar descuentos sin limite
- Exportar datos y reportes

**Permisos detallados:**
- CRUD completo sobre productos, categorias, fotos de productos
- CRUD completo sobre mesas y zonas
- CRUD de usuarios (crear, editar, desactivar -- no eliminar datos, solo desactivar)
- Asignar y cambiar roles de otros usuarios
- Abrir y cerrar turnos de caja (cash shifts)
- Ver y operar todas las mesas
- Crear, modificar y cancelar cualquier pedido
- Procesar pagos y emitir comprobantes (boleta, factura, ticket)
- Aplicar descuentos de cualquier porcentaje/monto
- Ver todos los reportes de ventas
- Exportar reportes a Excel/PDF
- Configurar datos de la empresa y credenciales de facturacion
- Ver movimientos de stock y hacer ajustes de inventario
- Gestionar clientes
- Gestionar pedidos de delivery

**Pantalla de inicio al hacer login:** Dashboard principal (`/dashboard`) con resumen de ventas del dia, mesas activas y accesos rapidos.

**Restricciones de navegacion:** Ninguna. Ve el menu lateral completo con todos los items.

**Lo que NO puede hacer:**
- Eliminarse a si mismo como usuario
- Eliminar permanentemente datos de ventas o comprobantes (solo cancelar)
- Cambiar su propio rol a uno inferior si es el unico ADMIN de la company

---

### 2.2 CASHIER (Cajero)

**Descripcion del perfil:**
Es el responsable de la caja. En un restaurante peruano tipico, es quien esta fisicamente en el punto de cobro, recibe a los clientes que pagan, emite los comprobantes SUNAT y controla el flujo de efectivo de su turno. Puede ser el mismo dueno en negocios pequenos.

**Responsabilidades principales en el sistema:**
- Abrir su turno de caja al inicio de la jornada
- Monitorear el estado de todas las mesas y sus cuentas acumuladas
- Procesar el cobro de mesas cuando el mozo solicita la cuenta
- Emitir boletas, facturas y tickets
- Registrar pagos en efectivo, tarjeta, billetera digital
- Cerrar su turno de caja con el arqueo correspondiente
- Registrar gastos menores (caja chica / expenses)

**Permisos detallados:**
- Abrir y cerrar su propio cash shift
- Ver el estado de todas las mesas (lectura)
- Crear ordenes directas (para take away y delivery)
- Cobrar cualquier mesa que tenga cuenta solicitada
- Procesar pagos con cualquier metodo (efectivo, tarjeta, wallet)
- Emitir comprobantes (boleta, factura, ticket)
- Aplicar descuentos de hasta 20% (descuentos mayores requieren aprobacion de ADMIN)
- Cancelar items de un pedido abierto (con motivo obligatorio)
- Cancelar una orden completa (con motivo obligatorio)
- Ver el reporte de su propio turno de caja
- Registrar gastos de caja chica (expenses)
- Gestionar datos basicos de clientes (para facturacion)
- Gestionar pedidos de delivery

**Pantalla de inicio al hacer login:** Vista de mesas / Nueva venta (`/dashboard/orders/new`)

**Restricciones de navegacion:**
- NO ve: Productos (gestion), Configuracion de empresa, Gestion de usuarios, Reportes globales de ventas, Movimientos de stock
- SI ve: Nueva venta, Comprobantes de venta, Caja chica, Mapa de mesas

**Lo que NO puede hacer:**
- Crear, editar o desactivar usuarios
- Modificar precios de productos o la carta
- Configurar datos de la empresa
- Ver reportes de ventas globales (solo los de su turno)
- Aplicar descuentos superiores al 20% sin aprobacion de ADMIN
- Exportar datos
- Hacer ajustes de inventario/stock

---

### 2.3 WAITER (Mozo / Mesero)

**Descripcion del perfil:**
Es el personal de sala que interactua directamente con los comensales. En Peru se le conoce como "mozo" o "mesero". Trabaja con una tablet o celular, tomando pedidos mesa por mesa y comunicandose con cocina a traves del sistema. Es el rol con mas usuarios por restaurant (un local de 20 mesas puede tener 4-8 mozos).

**Responsabilidades principales en el sistema:**
- Ver el mapa de mesas y sus estados
- Tomar pedidos en la mesa seleccionada
- Navegar la carta por categorias para agregar items
- Agregar notas especiales por item ("sin cebolla", "termino medio", etc.)
- Enviar el pedido a cocina/barra
- Agregar rondas adicionales (items extra a un pedido ya enviado)
- Solicitar la cuenta para una mesa (triggerea flujo en caja)
- Recibir notificacion cuando un pedido esta listo en cocina

**Permisos detallados:**
- Ver el mapa de mesas con estado de todas las mesas
- Abrir una mesa (cambiar estado de LIBRE a OCUPADA al crear el primer pedido)
- Crear pedidos y agregar items de la carta
- Modificar pedidos antes de enviarlos a cocina (quitar/cambiar items)
- Enviar pedido a cocina/barra
- Agregar items adicionales a un pedido ya enviado (nueva ronda/comanda)
- Agregar notas especiales por item
- Solicitar la cuenta para una mesa
- Ver el resumen acumulado de una mesa (items y total, sin detalle de pagos)
- Ver la carta/menu (lectura de productos) para tomar pedidos

**Pantalla de inicio al hacer login:** Mapa de mesas (`/dashboard/tables`)

**Restricciones de navegacion:**
- NO ve: Productos (gestion), Categorias (gestion), Caja chica, Reportes de ventas, Configuracion, Gestion de usuarios, Comprobantes de venta, Movimientos de stock
- SI ve: Mapa de mesas, Tomar pedido (dentro del flujo de mesa)

**Lo que NO puede hacer:**
- Cobrar una mesa ni procesar pagos
- Emitir comprobantes
- Cancelar items despues de enviados a cocina (debe pedirlo al cajero o admin)
- Aplicar descuentos
- Ver precios de costo, reportes de ventas ni cierres de caja
- Modificar la carta, precios ni categorias
- Crear o gestionar usuarios
- Abrir o cerrar turnos de caja
- Exportar datos
- Hacer ajustes de inventario

---

### 2.4 KITCHEN (Cocinero)

**Descripcion del perfil:**
Es el personal de cocina. En un restaurante peruano, puede ser el chef principal, un ayudante de cocina o un cocinero de linea. Interactua con el sistema unicamente a traves de la pantalla KDS (Kitchen Display System), una vista simplificada y optimizada para el entorno de cocina. No necesita navegar menus ni usar funciones complejas.

**Responsabilidades principales en el sistema:**
- Ver los pedidos entrantes en tiempo real, ordenados por hora de llegada
- Identificar los items que le corresponden (platos de cocina)
- Marcar comandas individuales como "en preparacion"
- Marcar comandas como "listas" (notifica automaticamente al mozo)
- Ver notas especiales de cada item ("sin sal", "extra picante", etc.)
- Identificar visualmente pedidos que llevan demasiado tiempo en espera

**Permisos detallados:**
- Acceso exclusivo a la vista KDS de cocina
- Ver los pedidos entrantes filtrados por items de cocina (no bebidas de barra)
- Cambiar estado de comandas: `PENDIENTE` -> `EN_PREPARACION` -> `LISTO`
- Ver notas especiales de cada item
- Ver el numero de mesa y el nombre del mozo asociado

**Pantalla de inicio al hacer login:** Vista KDS de cocina (`/dashboard/kitchen`)

**Restricciones de navegacion:**
- Solo accede a la pantalla KDS. No tiene sidebar de navegacion.
- No ve precios, totales, informacion de pago, reportes ni configuracion.

**Autenticacion simplificada:**
- El cocinero puede acceder con un **PIN numerico de 4-6 digitos** en lugar de email y password completos.
- El PIN se configura desde el panel de administracion por el ADMIN.
- La pantalla de login en modo cocina muestra un teclado numerico para ingresar el PIN.
- El email sigue siendo necesario internamente para identificacion unica, pero el ADMIN lo asigna al crear el usuario (puede ser un email generico tipo `cocina1@restaurante.com`).

**Lo que NO puede hacer:**
- Ver precios de venta ni precios de costo
- Ver totales de mesas ni informacion de pagos
- Crear, modificar ni cancelar pedidos
- Acceder a cualquier otra seccion del sistema
- Cobrar ni emitir comprobantes
- Ver reportes de ningún tipo
- Gestionar productos, usuarios ni configuracion

---

### 2.5 BARTENDER (Bartender / Barman)

**Descripcion del perfil:**
Es el personal de barra responsable de preparar bebidas. Funcionalmente es muy similar al cocinero, pero su vista KDS esta filtrada para mostrar unicamente items de categorias de bebidas/barra. En restaurantes pequenos, el bartender puede no existir como rol separado (el cajero o el cocinero cubren esa funcion).

**Responsabilidades principales en el sistema:**
- Ver los pedidos entrantes que contienen items de barra/bebidas
- Preparar los items y marcarlos como listos
- Coordinar con cocina en pedidos mixtos (comida + bebida)

**Permisos detallados:**
- Acceso exclusivo a la vista KDS de barra
- Ver los pedidos entrantes filtrados por items de barra (solo categorias de bebidas)
- Cambiar estado de comandas de barra: `PENDIENTE` -> `EN_PREPARACION` -> `LISTO`
- Ver notas especiales de cada item de barra
- Ver el numero de mesa y el nombre del mozo asociado

**Pantalla de inicio al hacer login:** Vista KDS de barra (`/dashboard/bar`)

**Restricciones de navegacion:**
- Identicas al cocinero: solo accede a la pantalla KDS de barra. No tiene sidebar.

**Autenticacion simplificada:**
- Igual que el cocinero: puede acceder con PIN numerico de 4-6 digitos.

**Lo que NO puede hacer:**
- Todo lo que el cocinero no puede hacer (mismas restricciones)
- Ver items de cocina (solo ve items de barra)

---

## 3. Matriz de Permisos Completa

### Leyenda

| Simbolo | Significado |
|---|---|
| Si | Tiene permiso completo |
| No | No tiene permiso |
| Parcial | Tiene permiso con restricciones (ver nota) |
| Aprobacion | Requiere aprobacion de un rol superior |

### 3.1 Gestion de Productos y Carta

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Ver lista de productos | Si | No | Parcial (1) | No | No |
| Crear producto | Si | No | No | No | No |
| Editar producto (nombre, precio, descripcion) | Si | No | No | No | No |
| Eliminar / ocultar producto | Si | No | No | No | No |
| Gestionar fotos de producto | Si | No | No | No | No |
| Gestionar paquetes (combos) | Si | No | No | No | No |
| Ver precio de costo | Si | No | No | No | No |
| Ver precio de venta | Si | Si | Si | No | No |

> **(1)** El WAITER ve la carta (nombre, precio, foto, categoria) solo dentro del flujo de toma de pedido. No accede al modulo de gestion de productos.

### 3.2 Gestion de Categorias

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Ver categorias | Si | Si | Si (2) | No | No |
| Crear categoria | Si | No | No | No | No |
| Editar categoria | Si | No | No | No | No |
| Eliminar categoria | Si | No | No | No | No |

> **(2)** El WAITER ve las categorias solo como filtro de navegacion al tomar pedidos.

### 3.3 Gestion de Mesas

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Ver mapa de mesas | Si | Si | Si | No | No |
| Crear / configurar mesas y zonas | Si | No | No | No | No |
| Editar mesa (numero, capacidad, zona) | Si | No | No | No | No |
| Eliminar mesa | Si (3) | No | No | No | No |
| Cambiar estado de mesa | Si | Si | Parcial (4) | No | No |

> **(3)** Solo si la mesa no tiene pedido activo.
> **(4)** El WAITER puede abrir una mesa (LIBRE -> OCUPADA) al crear un pedido, y solicitar la cuenta (OCUPADA -> CUENTA_PEDIDA). No puede cambiar a otros estados manualmente.

### 3.4 Toma de Pedidos

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Crear pedido en mesa (dine-in) | Si | Si | Si | No | No |
| Crear pedido take away | Si | Si | No | No | No |
| Crear pedido delivery | Si | Si | No | No | No |
| Agregar items a pedido | Si | Si | Si | No | No |
| Modificar items antes de enviar a cocina | Si | Si | Si | No | No |
| Enviar pedido a cocina/barra | Si | Si | Si | No | No |
| Agregar ronda adicional (items extra) | Si | Si | Si | No | No |
| Agregar notas especiales por item | Si | Si | Si | No | No |
| Solicitar cuenta para mesa | Si | Si | Si | No | No |

### 3.5 Vista KDS (Kitchen Display System)

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Ver pantalla KDS de cocina | Si | No | No | Si | No |
| Ver pantalla KDS de barra | Si | No | No | No | Si |
| Marcar comanda como en preparacion | Si | No | No | Si (5) | Si (5) |
| Marcar comanda como lista | Si | No | No | Si (5) | Si (5) |
| Ver notas especiales | Si | No | No | Si | Si |
| Ver numero de mesa y mozo | Si | No | No | Si | Si |
| Ver precios de items en KDS | Si | No | No | No | No |

> **(5)** Cada rol solo puede cambiar estado de las comandas que le corresponden: KITCHEN para items de cocina, BARTENDER para items de barra.

### 3.6 Procesamiento de Pagos

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Cobrar una mesa | Si | Si | No | No | No |
| Procesar pago en efectivo | Si | Si | No | No | No |
| Procesar pago con tarjeta | Si | Si | No | No | No |
| Procesar pago con billetera digital | Si | Si | No | No | No |
| Dividir cuenta en multiples pagos | Si | Si | No | No | No |
| Emitir boleta | Si | Si | No | No | No |
| Emitir factura | Si | Si | No | No | No |
| Emitir ticket | Si | Si | No | No | No |

### 3.7 Cash Shifts (Turnos de Caja)

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Abrir turno de caja | Si | Si | No | No | No |
| Cerrar turno de caja (propio) | Si | Si | No | No | No |
| Cerrar turno de caja (ajeno) | Si | No | No | No | No |
| Registrar gastos de caja chica | Si | Si | No | No | No |
| Ver reporte de su propio turno | Si | Si | No | No | No |
| Ver reportes de todos los turnos | Si | No | No | No | No |

### 3.8 Reportes de Ventas

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Ver reporte de ventas global | Si | No | No | No | No |
| Ver reporte de ventas por periodo | Si | No | No | No | No |
| Ver reporte de ventas por mozo | Si | No | No | No | No |
| Ver reporte de ventas por producto | Si | No | No | No | No |
| Ver reporte de su propio turno de caja | Si | Si | No | No | No |
| Exportar reportes (Excel/PDF) | Si | No | No | No | No |

### 3.9 Gestion de Usuarios

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Ver lista de usuarios | Si | No | No | No | No |
| Crear usuario | Si | No | No | No | No |
| Editar usuario (nombre, email) | Si | No | No | No | No |
| Asignar/cambiar rol de usuario | Si | No | No | No | No |
| Desactivar usuario | Si (6) | No | No | No | No |
| Reactivar usuario | Si | No | No | No | No |
| Configurar PIN de cocina/barra | Si | No | No | No | No |
| Resetear contrasena de otro usuario | Si | No | No | No | No |
| Cambiar su propia contrasena | Si | Si | Si | No (7) | No (7) |
| Editar su propio perfil (nombre) | Si | Si | Si | No | No |

> **(6)** Un ADMIN no puede desactivarse a si mismo si es el unico ADMIN de la company.
> **(7)** KITCHEN y BARTENDER usan PIN; el ADMIN gestiona su PIN desde el panel de administracion.

### 3.10 Configuracion del Sistema

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Editar datos de la empresa | Si | No | No | No | No |
| Configurar RUC y datos SUNAT | Si | No | No | No | No |
| Configurar credenciales de facturacion | Si | No | No | No | No |
| Subir logo de la empresa | Si | No | No | No | No |
| Configurar series de comprobantes | Si | No | No | No | No |

### 3.11 Cancelacion de Pedidos

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Cancelar item antes de enviar a cocina | Si | Si | Si | No | No |
| Cancelar item despues de enviar a cocina | Si | Si | No | No | No |
| Cancelar orden completa (con motivo) | Si | Si | No | No | No |
| Cancelar orden ya cobrada (anulacion) | Si | Aprobacion (8) | No | No | No |

> **(8)** La anulacion de una orden ya cobrada (que implica anular comprobante SUNAT) requiere aprobacion de un ADMIN. El CASHIER puede iniciar el proceso pero necesita que un ADMIN lo confirme ingresando su contrasena o PIN.

### 3.12 Descuentos

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Aplicar descuento por item (hasta 20%) | Si | Si | No | No | No |
| Aplicar descuento por item (mayor a 20%) | Si | Aprobacion (9) | No | No | No |
| Aplicar descuento global a la orden (hasta 20%) | Si | Si | No | No | No |
| Aplicar descuento global a la orden (mayor a 20%) | Si | Aprobacion (9) | No | No | No |

> **(9)** Para descuentos superiores al 20%, el CASHIER debe solicitar aprobacion de un ADMIN. El sistema muestra un modal donde el ADMIN ingresa su contrasena o PIN para autorizar el descuento.

### 3.13 Exportar Datos

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Exportar lista de productos | Si | No | No | No | No |
| Exportar reportes de ventas | Si | No | No | No | No |
| Exportar cierre de caja | Si | No | No | No | No |
| Exportar lista de clientes | Si | No | No | No | No |

### 3.14 Delivery

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Crear pedido de delivery | Si | Si | No | No | No |
| Ver lista de pedidos delivery | Si | Si | No | No | No |
| Asignar repartidor | Si | Si | No | No | No |
| Marcar delivery como entregado | Si | Si | No | No | No |
| Ver items de delivery en KDS | Si | No | No | Si | Si |

### 3.15 Gestion de Stock

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Ver movimientos de stock | Si | No | No | No | No |
| Crear ajuste de inventario | Si | No | No | No | No |
| Ver stock actual de productos | Si | No | No | No | No |

### 3.16 Gestion de Clientes

| Funcionalidad | ADMIN | CASHIER | WAITER | KITCHEN | BARTENDER |
|---|---|---|---|---|---|
| Ver lista de clientes | Si | Parcial (10) | No | No | No |
| Crear cliente | Si | Si | No | No | No |
| Editar cliente | Si | Si | No | No | No |

> **(10)** El CASHIER puede buscar y crear clientes durante el flujo de cobro/facturacion, pero no accede a un modulo dedicado de gestion de clientes.

---

## 4. Historias de Usuario

### Gestion de Usuarios

---

**HU-01:** Como ADMIN, quiero crear nuevos usuarios para mi restaurante, para que cada miembro del equipo tenga su propia cuenta con el rol adecuado.

**Criterios de aceptacion:**
- Desde el dashboard, en la seccion "Usuarios" (solo visible para ADMIN), existe un boton "Nuevo usuario".
- El formulario solicita: nombre completo (obligatorio), email (obligatorio, unico por company), contrasena temporal (obligatoria, minimo 8 caracteres), y rol (obligatorio, seleccion de ADMIN, CASHIER, WAITER, KITCHEN, BARTENDER).
- Si el rol es KITCHEN o BARTENDER, se muestra un campo adicional para configurar un PIN de 4-6 digitos.
- Al guardar, el usuario queda activo y puede iniciar sesion inmediatamente.
- Si el email ya existe en la misma company, se muestra un error descriptivo.
- El nuevo usuario se asocia automaticamente a la misma `companyId` del ADMIN que lo crea.

---

**HU-02:** Como ADMIN, quiero editar los datos de un usuario existente, para corregir informacion o actualizar su rol cuando cambie de funcion en el restaurante.

**Criterios de aceptacion:**
- Desde la lista de usuarios, cada fila tiene un boton de editar.
- Se pueden modificar: nombre, email y rol.
- Al cambiar el rol de un usuario, sus permisos se actualizan inmediatamente en su proxima carga de pagina.
- Si se cambia el rol a KITCHEN o BARTENDER, se solicita configurar un PIN.
- Si se cambia el rol desde KITCHEN o BARTENDER a otro, se limpia el PIN y se requiere configurar contrasena completa.
- No se puede cambiar el email a uno que ya exista en la misma company.

---

**HU-03:** Como ADMIN, quiero desactivar la cuenta de un usuario que ya no trabaja en el restaurante, para que no pueda seguir accediendo al sistema sin perder el historial de sus acciones.

**Criterios de aceptacion:**
- Desde la lista de usuarios, cada fila tiene un boton de desactivar (no eliminar).
- Al desactivar, se muestra un dialogo de confirmacion indicando que el usuario no podra iniciar sesion.
- El usuario desactivado no puede iniciar sesion (el sistema muestra "Cuenta desactivada, contacta a tu administrador").
- Los datos historicos del usuario (pedidos tomados, turnos de caja, acciones) se mantienen intactos.
- La lista de usuarios muestra un indicador visual de estado (activo/inactivo) y permite filtrar.
- Un usuario desactivado puede ser reactivado en cualquier momento.
- Un ADMIN no puede desactivarse a si mismo.
- Un ADMIN no puede desactivar al unico otro ADMIN de la company (debe haber al menos un ADMIN activo).

---

**HU-04:** Como ADMIN, quiero resetear la contrasena de un usuario, para ayudar a un empleado que olvido su contrasena sin que necesite acceso a email.

**Criterios de aceptacion:**
- Desde la vista de edicion de usuario, existe un boton "Resetear contrasena".
- El ADMIN ingresa una nueva contrasena temporal para el usuario.
- El usuario puede iniciar sesion con la nueva contrasena inmediatamente.
- No se requiere la contrasena anterior del usuario.
- Se recomienda (pero no se fuerza) que el usuario cambie su contrasena al siguiente login (v2).

---

### Asignacion de Roles

---

**HU-05:** Como ADMIN, quiero asignar un rol a cada usuario al momento de crearlo, para que desde su primer login tenga acceso solo a las funciones que le corresponden.

**Criterios de aceptacion:**
- El campo de rol es obligatorio al crear un usuario.
- Los roles disponibles son: ADMIN, CASHIER, WAITER, KITCHEN, BARTENDER.
- El rol seleccionado determina la pantalla de inicio y los items de navegacion visibles.
- Solo un ADMIN puede asignar el rol ADMIN a otro usuario.

---

**HU-06:** Como ADMIN, quiero cambiar el rol de un usuario existente, para adaptarme cuando un mozo pasa a ser cajero o viceversa.

**Criterios de aceptacion:**
- El cambio de rol se realiza desde la pantalla de edicion del usuario.
- Al cambiar el rol, los permisos se aplican inmediatamente en la proxima carga de pagina del usuario afectado.
- Si el usuario tiene una sesion activa, el cambio se refleja al recargar o navegar.
- El historial de acciones previas del usuario (cuando tenia el rol anterior) se mantiene sin modificaciones.
- Si se cambia a un rol que usa PIN (KITCHEN/BARTENDER), se solicita configurar el PIN.

---

### Login y Redireccion por Rol

---

**HU-07:** Como usuario del sistema, quiero que al iniciar sesion me lleve directamente a la pantalla mas relevante para mi rol, para comenzar a trabajar inmediatamente sin navegar menus.

**Criterios de aceptacion:**
- Despues de un login exitoso, la redireccion depende del rol:
  - ADMIN -> `/dashboard` (dashboard principal)
  - CASHIER -> `/dashboard/orders/new` (nueva venta / mapa de mesas)
  - WAITER -> `/dashboard/tables` (mapa de mesas)
  - KITCHEN -> `/dashboard/kitchen` (KDS de cocina)
  - BARTENDER -> `/dashboard/bar` (KDS de barra)
- Si la ruta de destino no existe aun, se redirige a `/dashboard` con un mensaje informativo.
- La sesion incluye el rol del usuario para que el frontend pueda filtrar la navegacion.

---

**HU-08:** Como usuario, quiero que el menu de navegacion lateral muestre solo las opciones relevantes a mi rol, para no distraerme con funciones que no me corresponden.

**Criterios de aceptacion:**
- El sidebar se renderiza dinamicamente basado en el rol del usuario autenticado.
- Cada rol ve un subconjunto especifico de items de navegacion (segun la seccion 2).
- KITCHEN y BARTENDER no ven sidebar: su pantalla es la vista KDS a pantalla completa.
- Si un usuario intenta acceder a una ruta no autorizada para su rol (por ejemplo, escribiendo la URL manualmente), se redirige a su pantalla de inicio con un mensaje "No tienes permisos para acceder a esta seccion".

---

### Restriccion de Acceso a Funcionalidades

---

**HU-09:** Como sistema, quiero impedir que un usuario acceda a funcionalidades fuera de su rol, para garantizar la seguridad y la integridad de la operacion.

**Criterios de aceptacion:**
- Existe un middleware de autorizacion que verifica el rol del usuario en cada request a rutas protegidas.
- Las rutas del dashboard estan mapeadas a los roles que pueden acceder a ellas.
- Si un usuario sin permiso accede a una ruta protegida (via URL directa o manipulacion del frontend), recibe una redireccion a su pantalla de inicio.
- Las acciones del servidor (server actions) validan el rol del usuario antes de ejecutar operaciones sensibles (crear producto, cancelar orden, etc.).
- Los botones y enlaces a funciones no permitidas no se renderizan en el frontend (defensa en profundidad: frontend + backend).

---

**HU-10:** Como CASHIER, quiero ver el estado de las mesas pero no poder modificar la carta, para que pueda consultar informacion de pedidos sin riesgo de alterar la configuracion.

**Criterios de aceptacion:**
- El CASHIER puede ver el mapa de mesas con estado actual (libre, ocupada, cuenta pedida).
- El CASHIER puede hacer click en una mesa para ver el detalle de la cuenta acumulada.
- El menu de navegacion del CASHIER no muestra "Productos" ni "Configuracion".
- Si el CASHIER accede a `/dashboard/products` por URL directa, se le redirige a su pantalla de inicio.

---

### Cambio de Contrasena

---

**HU-11:** Como usuario con rol ADMIN, CASHIER o WAITER, quiero poder cambiar mi propia contrasena desde mi perfil, para mantener la seguridad de mi cuenta.

**Criterios de aceptacion:**
- En la seccion de configuracion/perfil (accesible para ADMIN, CASHIER, WAITER), existe la opcion "Cambiar contrasena".
- Se solicita: contrasena actual (para verificacion), nueva contrasena (minimo 8 caracteres), confirmacion de nueva contrasena.
- Si la contrasena actual es incorrecta, se muestra un error.
- Si la nueva contrasena no cumple requisitos minimos, se muestra un error descriptivo.
- Al cambiar exitosamente, se muestra un mensaje de confirmacion.
- La sesion actual se mantiene activa despues del cambio.

---

### PIN de Cocina (Acceso Simplificado)

---

**HU-12:** Como ADMIN, quiero configurar un PIN numerico de acceso para los cocineros y bartenders, para que puedan acceder a la pantalla KDS sin necesidad de recordar un email y contrasena.

**Criterios de aceptacion:**
- Al crear o editar un usuario con rol KITCHEN o BARTENDER, aparece un campo "PIN de acceso".
- El PIN es numerico de 4 a 6 digitos.
- El PIN debe ser unico dentro de la company (no pueden haber dos usuarios con el mismo PIN).
- El PIN se almacena hasheado en la base de datos (no en texto plano).
- El ADMIN puede ver un indicador de "PIN configurado: Si/No" pero no puede ver el PIN en texto claro.
- El ADMIN puede regenerar/cambiar el PIN en cualquier momento.

---

**HU-13:** Como cocinero, quiero iniciar sesion con un PIN numerico en una pantalla simplificada, para acceder rapidamente al KDS sin necesidad de teclado completo.

**Criterios de aceptacion:**
- La pantalla de login tiene un modo alternativo "Acceso con PIN" (un enlace o boton debajo del formulario principal).
- Al activar el modo PIN, se muestra un teclado numerico en pantalla (optimizado para pantalla tactil).
- El usuario ingresa su PIN y presiona "Entrar".
- Si el PIN es valido y corresponde a un usuario activo de la company actual (determinada por subdominio), se inicia sesion y se redirige a la pantalla KDS correspondiente al rol.
- Si el PIN es incorrecto, se muestra un error generico "PIN incorrecto" (sin revelar si el PIN existe o no).
- Despues de 5 intentos fallidos consecutivos, se bloquea el acceso por PIN durante 5 minutos.

---

### Proteccion de Acciones Criticas

---

**HU-14:** Como ADMIN, quiero que las acciones criticas como cancelar una orden ya cobrada requieran mi autorizacion, para evitar perdidas economicas por cancelaciones no supervisadas.

**Criterios de aceptacion:**
- Cuando un CASHIER intenta cancelar/anular una orden que ya fue cobrada y tiene comprobante emitido, el sistema muestra un modal de "Autorizacion requerida".
- El modal solicita las credenciales de un ADMIN (email + contrasena, o PIN si tiene uno configurado).
- El ADMIN puede ingresar sus credenciales en el dispositivo del CASHIER para autorizar la accion.
- Si las credenciales son validas y corresponden a un ADMIN activo de la misma company, la accion se ejecuta.
- Si las credenciales son invalidas, se muestra un error y la accion no se ejecuta.
- La accion autorizada queda registrada con el ID del CASHIER que la solicito y el ID del ADMIN que la autorizo.

---

**HU-15:** Como sistema, quiero impedir que un CASHIER aplique descuentos superiores al 20% sin aprobacion de un ADMIN, para proteger el margen del negocio.

**Criterios de aceptacion:**
- Cuando un CASHIER intenta aplicar un descuento (por item o global) que supera el 20% del subtotal, el sistema muestra un modal de "Autorizacion requerida".
- El flujo de autorizacion es identico al de HU-14 (credenciales de ADMIN).
- El porcentaje limite (20%) es un valor por defecto. En una version futura podra ser configurable por el ADMIN.
- La autorizacion queda registrada con los detalles: monto del descuento, porcentaje, CASHIER que lo solicito y ADMIN que lo autorizo.
- Si el ADMIN aplica el descuento directamente (no como autorizacion de un CASHIER), no se requiere autorizacion adicional.

---

### Auditoria

---

**HU-16:** Como ADMIN, quiero saber quien realizo cada accion critica en el sistema, para tener trazabilidad completa y detectar irregularidades.

**Criterios de aceptacion:**
- Las siguientes acciones registran automaticamente `userId`, `userRole` y `timestamp`:
  - Creacion de un pedido (quien lo creo)
  - Cancelacion de un pedido (quien lo cancelo, motivo)
  - Aplicacion de un descuento (quien lo aplico, monto/porcentaje, quien lo autorizo si aplica)
  - Apertura y cierre de turno de caja (quien lo abrio/cerro)
  - Creacion, edicion y desactivacion de usuarios (quien ejecuto la accion)
  - Cambio de rol de un usuario (quien lo cambio, rol anterior, rol nuevo)
  - Anulacion de comprobante SUNAT (quien la solicito, quien la autorizo)
- El ADMIN puede ver este log de auditoria desde un modulo dedicado o como parte de los detalles de cada entidad (por ejemplo, al ver un pedido, puede ver "Creado por: Juan (WAITER), Cancelado por: Maria (CASHIER), Autorizado por: Pedro (ADMIN)").

---

**HU-17:** Como ADMIN, quiero ver que mozo tomo cada pedido y que cajero lo cobro, para evaluar el rendimiento de mi equipo.

**Criterios de aceptacion:**
- Cada pedido almacena el `userId` del usuario que lo creo (mozo o cajero).
- Cada pago almacena el `userId` del usuario que lo proceso (cajero).
- En la vista de detalle de un pedido, se muestra el nombre y rol del creador y del cobrador.
- En los reportes de ventas, se puede filtrar por mozo/cajero.

---

### Migracion de Usuarios Existentes

---

**HU-18:** Como sistema, al desplegar el modulo de roles, quiero que todos los usuarios existentes se conviertan automaticamente en ADMIN, para que no pierdan acceso a ninguna funcionalidad.

**Criterios de aceptacion:**
- Se crea una migracion de base de datos que:
  - Agrega el campo `role` al modelo User con tipo enum (`ADMIN`, `CASHIER`, `WAITER`, `KITCHEN`, `BARTENDER`).
  - Establece `role = ADMIN` para todos los registros existentes.
  - Agrega el campo `active` al modelo User con valor por defecto `true`.
  - Agrega el campo `pin` al modelo User (nullable, para KITCHEN/BARTENDER).
- Despues de la migracion, todos los usuarios existentes pueden seguir operando exactamente como antes.
- No se requiere accion manual de ningun usuario existente.

---

## 5. Reglas de Negocio

### RN-01: Un usuario solo puede tener un rol

Un usuario tiene exactamente un rol asignado. No existen roles multiples ni jerarquias compuestas. El campo `role` es un enum, no una relacion many-to-many. Si una persona necesita operar con dos roles distintos (por ejemplo, es mozo y tambien cajero en turnos diferentes), se recomienda crear dos cuentas separadas, o asignarle el rol de mayor nivel (CASHIER, que incluye la capacidad de tomar pedidos).

**Justificacion:** La simpleza de un rol unico reduce la complejidad del sistema de permisos, facilita la auditoria y se alinea con la realidad operativa de restaurantes en Peru, donde cada persona cumple una funcion principal por turno.

### RN-02: El ADMIN puede crear usuarios pero no puede eliminarse a si mismo

- Un ADMIN puede desactivar (no eliminar) a cualquier usuario excepto a si mismo.
- Un ADMIN no puede cambiar su propio rol a uno inferior si es el unico ADMIN activo de la company.
- Siempre debe existir al menos un usuario ADMIN activo por company.
- Si hay multiples ADMIN, uno puede desactivar a otro, pero no al ultimo ADMIN restante.

**Justificacion:** Esto previene el escenario de "bloqueo total" donde ningun usuario tendria permisos para gestionar el sistema.

### RN-03: Todos los usuarios existentes se convierten en ADMIN

Al desplegarse el modulo de roles por primera vez:
- Se ejecuta una migracion que agrega el campo `role` con valor por defecto `ADMIN` a todos los registros existentes de la tabla `User`.
- Esto garantiza que ningun usuario pierde acceso a funcionalidades que ya utilizaba.
- Los ADMIN podran luego crear nuevos usuarios con los roles apropiados.

**Justificacion:** Compatibilidad retroactiva. Los clientes existentes de Lorito Killer no deben experimentar ninguna disrupcion al actualizarse el sistema.

### RN-04: El primer usuario de una company siempre es ADMIN

- Cuando se registra una nueva company (flujo de signup), el usuario creador se asigna automaticamente como ADMIN.
- Este comportamiento no puede modificarse.
- Este ADMIN inicial es quien crea al resto del equipo.

**Justificacion:** Toda company necesita al menos un administrador desde el momento de su creacion para poder configurar el sistema.

### RN-05: Cocineros y bartenders no necesitan email/password completo (PIN)

- Los usuarios con rol KITCHEN o BARTENDER pueden autenticarse con un PIN numerico de 4-6 digitos.
- El PIN es configurado por un ADMIN y es unico dentro de la company.
- El email del usuario KITCHEN/BARTENDER es asignado por el ADMIN y puede ser generico (e.g., `cocina1@mirestaurante.com`).
- El PIN se almacena hasheado (bcrypt) en la base de datos.
- El PIN no reemplaza el password en el modelo de datos; son campos complementarios. El KITCHEN/BARTENDER puede tener ambos, pero en la practica usa solo el PIN.

**Justificacion:** En un entorno de cocina, los empleados trabajan con las manos mojadas/sucias y no tienen un teclado fisico disponible. Un PIN numerico ingresado en pantalla tactil es la forma mas practica de autenticarse. Ademas, la alta rotacion de personal en cocinas peruanas hace impráctico gestionar contrasenas complejas para estos roles.

### RN-06: Acciones criticas requieren validacion de rol superior

Las siguientes acciones requieren autorizacion de un ADMIN cuando son ejecutadas por un CASHIER:

| Accion critica | Requiere aprobacion ADMIN | Motivo |
|---|---|---|
| Cancelar orden ya cobrada (anulacion de comprobante) | Si | Impacto fiscal y financiero |
| Descuento superior al 20% | Si | Proteccion de margen |
| Cerrar turno de caja de otro usuario | Si (solo ADMIN puede) | Control de responsabilidad |

**Mecanismo de aprobacion:**
1. El CASHIER inicia la accion.
2. El sistema muestra un modal de "Autorizacion requerida".
3. Un ADMIN ingresa sus credenciales (email + password, o PIN) en el mismo dispositivo.
4. El sistema valida que las credenciales pertenecen a un ADMIN activo de la misma company.
5. Si es valido, la accion se ejecuta y se registra con ambos IDs (solicitante y autorizador).
6. Si es invalido, la accion se rechaza.

Un ADMIN ejecutando estas acciones directamente no requiere autorizacion adicional.

### RN-07: Un usuario desactivado no puede iniciar sesion

- Al desactivar un usuario, su campo `active` cambia a `false`.
- El flujo de autenticacion (NextAuth `authorize`) verifica el campo `active`. Si es `false`, retorna `null` (login denegado).
- El mensaje de error al intentar loguearse con una cuenta desactivada es generico: "Cuenta desactivada. Contacta a tu administrador."
- La desactivacion no elimina datos historicos ni relaciones existentes (pedidos, turnos de caja, etc.).

### RN-08: Scope de permisos limitado a la company

- Un usuario solo puede ver y operar datos de su propia company (determinada por `companyId`).
- Esta regla ya existe en el sistema actual (multi-tenancy por subdominio) y se mantiene intacta.
- La autorizacion por rol se aplica **dentro** del scope de la company, no entre companies.
- Un ADMIN de la company A no tiene ningun acceso a los datos de la company B.

### RN-09: Las sesiones reflejan el rol actual

- La sesion de NextAuth debe incluir el campo `role` del usuario.
- Si un ADMIN cambia el rol de un usuario que tiene sesion activa, el cambio se refleja en la proxima carga de pagina (el callback `session` de NextAuth consulta la base de datos en cada request).
- No se requiere forzar el cierre de sesion; el comportamiento actual del callback `session` (que ya hace un query a la DB en cada request) garantiza datos actualizados.

### RN-10: Los comprobantes SUNAT no se pueden eliminar, solo anular

- Esta regla ya existe en el sistema y no cambia con el modulo de roles.
- La unica adicion es que la anulacion de comprobantes ahora requiere autorizacion de un ADMIN cuando la realiza un CASHIER.
- La anulacion queda registrada con el motivo, el solicitante y el autorizador.

---

## 6. Metricas de Exito

### Metricas de Adopcion

| Metrica | Objetivo (60 dias post-lanzamiento) | Como se mide |
|---|---|---|
| % de companies activas con mas de 1 rol configurado | > 60% | Query: companies con al menos 2 usuarios con roles distintos |
| Promedio de usuarios por company | > 3 | Total usuarios activos / Total companies activas |
| % de companies usando rol KITCHEN o BARTENDER | > 30% | Query: companies con al menos 1 usuario KITCHEN o BARTENDER |
| % de companies usando autenticacion por PIN | > 25% | Query: usuarios con campo `pin` no nulo |

### Metricas de Seguridad

| Metrica | Objetivo | Como se mide |
|---|---|---|
| Intentos de acceso a rutas no autorizadas (bloqueados por middleware) | Tendencia a la baja mes a mes | Logs del middleware de autorizacion |
| Acciones criticas con autorizacion de ADMIN | 100% requieren autorizacion | Log de auditoria: cancelaciones y descuentos > 20% |
| Usuarios desactivados que intentan login | 0 accesos exitosos | Logs de autenticacion |

### Metricas de Operacion

| Metrica | Objetivo | Como se mide |
|---|---|---|
| Tiempo promedio de login (email + password) | < 15 segundos | Timestamp desde carga de login hasta redireccion exitosa |
| Tiempo promedio de login (PIN) | < 5 segundos | Timestamp desde carga de login-pin hasta redireccion a KDS |
| % de pedidos con mozo identificado | > 95% | Pedidos con `userId` asociado / Total pedidos |
| Errores de autorizacion (falsos positivos: usuario bloqueado incorrectamente) | 0 | Reporte de soporte / bugs |

### Metricas de Satisfaccion

| Metrica | Objetivo | Como se mide |
|---|---|---|
| Tasa de uso del modulo de usuarios (ADMIN accede al menos 1 vez/semana) | > 70% | Analytics de navegacion |
| NPS del administrador respecto al control de acceso | > 40 | Encuesta post-onboarding |
| Reduccion de tickets de soporte relacionados con "acceso no deseado" | Reduccion del 80% | Comparacion pre/post lanzamiento |

---

## 7. Priorizacion MoSCoW

### Must Have (Imprescindible para el lanzamiento)

Estas funcionalidades son bloqueantes. Sin ellas, el modulo de roles no puede salir a produccion.

| ID | Funcionalidad | Justificacion |
|---|---|---|
| M1 | Agregar campo `role` (enum) al modelo User | Base de todo el sistema de permisos |
| M2 | Agregar campo `active` (boolean) al modelo User | Permite desactivar usuarios sin perder datos |
| M3 | Migracion automatica: usuarios existentes como ADMIN | Compatibilidad retroactiva; sin esto, los clientes actuales pierden acceso |
| M4 | CRUD de usuarios desde el dashboard (solo ADMIN) | Sin esto, no se pueden crear usuarios con roles distintos |
| M5 | Asignar rol al crear/editar usuario | Funcionalidad core del modulo |
| M6 | Incluir `role` en la sesion de NextAuth | Sin esto, el frontend no puede filtrar navegacion ni el backend validar permisos |
| M7 | Filtrado de items de navegacion (sidebar) por rol | UX basica: cada rol ve solo sus opciones |
| M8 | Middleware de autorizacion por rol en rutas del dashboard | Seguridad basica: impedir acceso a rutas no autorizadas |
| M9 | Validacion de rol en server actions criticas | Seguridad backend: que el frontend no sea la unica barrera |
| M10 | Redireccion post-login segun rol | UX basica: cada rol llega a su pantalla principal |
| M11 | Desactivar usuario (sin eliminarlo) | Control de acceso cuando un empleado deja el restaurante |
| M12 | Verificacion de `active` en el flujo de autenticacion | Sin esto, usuarios desactivados pueden seguir entrando |
| M13 | Primer usuario de company = ADMIN automaticamente | Garantiza que toda company tiene al menos un administrador |

### Should Have (Importante, pero el lanzamiento puede ocurrir sin ellas)

Estas funcionalidades son altamente deseables y deben implementarse lo antes posible despues del lanzamiento, idealmente en la misma iteracion.

| ID | Funcionalidad | Justificacion |
|---|---|---|
| S1 | Autenticacion por PIN para KITCHEN/BARTENDER | Critico para la usabilidad en cocina, pero el sistema funciona con email+password como fallback |
| S2 | Pantalla de login con teclado numerico (modo PIN) | Complemento de S1 |
| S3 | Autorizacion de ADMIN para acciones criticas (modal de credenciales) | Importante para seguridad, pero sin ella el CASHIER simplemente no puede ejecutar esas acciones (en lugar de pedir aprobacion) |
| S4 | Cambio de contrasena propia desde perfil | Los usuarios pueden pedirle al ADMIN que resetee la contrasena como workaround |
| S5 | Registro de `userId` y `role` en pedidos y acciones | Auditable, pero no bloquea la operacion diaria |
| S6 | Resetear contrasena de otro usuario (ADMIN) | Workaround: el ADMIN puede editar el usuario y poner una nueva contrasena |
| S7 | Bloqueo por intentos fallidos de PIN | Seguridad adicional, no critica para el lanzamiento |

### Could Have (Deseable si hay tiempo)

Funcionalidades que agregan valor pero que pueden esperarse a una version posterior.

| ID | Funcionalidad | Justificacion |
|---|---|---|
| C1 | Log de auditoria visible en el dashboard (modulo dedicado) | La data se puede registrar en DB/logs, pero la UI para verla puede esperar |
| C2 | Porcentaje limite de descuento configurable por ADMIN | El 20% por defecto es un valor razonable; la configurabilidad puede esperar |
| C3 | Reportes de ventas filtrados por mozo/cajero | Utiles para evaluacion de rendimiento, pero no bloquean la operacion |
| C4 | Notificacion al usuario cuando su rol cambia | Nice-to-have; el usuario se entera al recargar la pagina |
| C5 | Forzar cambio de contrasena en primer login | Mejora de seguridad, no critica |
| C6 | Indicador visual en la lista de usuarios de quien esta "online" | Interesante pero no prioritario |
| C7 | Historial de cambios de rol por usuario | Trazabilidad detallada, puede construirse sobre el log de auditoria |

### Won't Have (Fuera de alcance para esta version)

Funcionalidades que se han discutido pero que explicitamente NO se implementaran en esta version.

| ID | Funcionalidad | Motivo de exclusion |
|---|---|---|
| W1 | Roles personalizados / permisos granulares configurables | La complejidad de un sistema de permisos configurable no se justifica para el tamano de los restaurantes objetivo. Los 5 roles fijos cubren el 95% de los casos de uso. |
| W2 | Multiples roles por usuario | Agrega complejidad significativa al sistema de permisos y a la UX. Un solo rol por usuario es suficiente. |
| W3 | Autenticacion biometrica (huella digital) | Requiere hardware especifico que no esta en el scope del POS. |
| W4 | Single Sign-On (SSO) con Google/Facebook | Los restaurantes peruanos no lo necesitan; email + password y PIN cubren todos los escenarios. |
| W5 | Permisos a nivel de mesa individual (mozo X solo puede ver mesas 1-5) | Demasiado granular para el MVP. Todos los mozos ven todas las mesas. |
| W6 | Rol de "Supervisor" o "Gerente de turno" (intermedio entre ADMIN y CASHIER) | Se puede cubrir con un segundo ADMIN o con el ADMIN principal. No justifica un rol adicional en esta version. |
| W7 | App movil nativa para mozos con autenticacion biometrica | El sistema funciona como PWA responsive; una app nativa es un proyecto separado. |
| W8 | Integracion con sistemas de RRHH / planilla | Fuera del alcance del POS. |

---

## Apendice A: Modelo de Datos Propuesto

```prisma
enum UserRole {
  ADMIN
  CASHIER
  WAITER
  KITCHEN
  BARTENDER
}

model User {
  id             String          @id @default(uuid())
  companyId      String?
  company        Company?        @relation(fields: [companyId], references: [id])
  email          String          @unique
  password       String
  name           String?
  role           UserRole        @default(ADMIN)
  active         Boolean         @default(true)
  pin            String?         // Hashed PIN for KITCHEN/BARTENDER
  cashShifts     CashShift[]
  stockTransfers StockTransfer[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}
```

### Cambios respecto al modelo actual:

| Campo | Tipo | Descripcion |
|---|---|---|
| `role` | `UserRole` (enum) | Rol del usuario. Default: `ADMIN` (para migracion de datos existentes) |
| `active` | `Boolean` | Si el usuario puede iniciar sesion. Default: `true` |
| `pin` | `String?` | PIN hasheado para autenticacion simplificada de KITCHEN/BARTENDER. Nullable. |

### Sesion de NextAuth (extension propuesta):

```typescript
// En el callback session de auth-config.ts
session: async ({ session, token }) => {
  if (!session.user) return session;

  const persistedUser = await getUserByEmail(session.user.email!);
  if (!persistedUser.success) return { ...session, user: undefined };

  return {
    ...session,
    user: {
      ...session.user,
      id: persistedUser.data.id,
      name: persistedUser.data.name,
      email: persistedUser.data.email,
      companyId: persistedUser.data.companyId,
      role: persistedUser.data.role,     // NUEVO
      active: persistedUser.data.active, // NUEVO
    },
  };
};
```

---

## Apendice B: Mapeo de Rutas por Rol

```
/dashboard                        -> ADMIN
/dashboard/orders/new             -> ADMIN, CASHIER
/dashboard/orders                 -> ADMIN, CASHIER
/dashboard/orders/[id]            -> ADMIN, CASHIER
/dashboard/sales_reports          -> ADMIN
/dashboard/cash_shifts            -> ADMIN, CASHIER
/dashboard/cash_shifts/[id]       -> ADMIN, CASHIER (solo su propio turno, ADMIN ve todos)
/dashboard/products               -> ADMIN
/dashboard/stock_adjustments      -> ADMIN
/dashboard/settings               -> ADMIN, CASHIER, WAITER (solo perfil propio)
/dashboard/settings/company       -> ADMIN
/dashboard/users                  -> ADMIN
/dashboard/tables                 -> ADMIN, CASHIER, WAITER
/dashboard/kitchen                -> ADMIN, KITCHEN
/dashboard/bar                    -> ADMIN, BARTENDER
```

---

## Apendice C: Items de Navegacion por Rol

### ADMIN (ve todo)
- Nueva venta
- Comprobantes de venta
- Reporte de ventas
- Caja chica
- Productos
- Movimientos de stock
- Mesas
- Cocina (KDS)
- Barra (KDS)
- Usuarios
- Configuracion

### CASHIER
- Nueva venta
- Comprobantes de venta
- Caja chica
- Mesas

### WAITER
- Mesas

### KITCHEN
- Sin sidebar (pantalla KDS a pantalla completa)

### BARTENDER
- Sin sidebar (pantalla KDS a pantalla completa)
