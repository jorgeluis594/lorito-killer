# Casos de Uso: Seller por Codigo en Ordenes

## Objetivo

Permitir que cada venta quede asociada a un seller mediante un codigo operativo de 4 digitos. El usuario ingresa el codigo durante el pago, el sistema valida el seller para habilitar el cierre de venta y el servidor resuelve el `sellerId` antes de crear la orden.

## Actores

- Administrador: configura y mantiene sellers desde la seccion de configuracion.
- Cajero u operador de venta: registra una venta e ingresa el codigo del seller durante el pago.
- Seller: persona asociada a la venta mediante su codigo de 4 digitos.
- Sistema: valida codigos, resuelve sellers activos y persiste la asociacion en la orden.

## Reglas Generales

- El codigo de seller es obligatorio para cerrar una venta.
- El codigo debe tener exactamente 4 digitos numericos.
- El codigo se guarda como texto para preservar ceros iniciales.
- El codigo debe ser unico por empresa.
- Solo usuarios con rol `SELLER` y estado activo pueden asociarse a una venta por codigo.
- La validacion visual del modal mejora la experiencia, pero la garantia real ocurre en el server action de creacion de orden.
- Si el seller no existe, esta inactivo, pertenece a otra empresa o no tiene rol `SELLER`, la orden no debe crearse.

## Caso de Uso 1: Crear Seller

**Actor principal:** Administrador

**Precondiciones:**
- El administrador inicio sesion.
- El administrador tiene permiso para actualizar configuracion de empresa.

**Flujo principal:**
1. El administrador abre `Configuracion > Sellers`.
2. El administrador ingresa email, password y opcionalmente nombre.
3. El sistema genera automaticamente un codigo de 4 digitos unico dentro de la empresa.
4. El sistema crea un usuario con rol `SELLER`.
5. El sistema muestra el seller en la lista con su codigo asignado.

**Errores esperados:**
- Si el email ya existe, el sistema no crea el seller.
- Si no puede generar un codigo unico tras varios intentos, el sistema muestra error.

## Caso de Uso 2: Editar Codigo de Seller

**Actor principal:** Administrador

**Precondiciones:**
- Existe al menos un seller en la empresa.

**Flujo principal:**
1. El administrador abre la lista de sellers.
2. El administrador modifica el codigo de un seller.
3. El sistema normaliza el valor para aceptar solo numeros y maximo 4 digitos.
4. El administrador guarda el cambio.
5. El sistema valida formato y unicidad.
6. El sistema actualiza el codigo del seller.

**Errores esperados:**
- Si el codigo tiene menos de 4 digitos, el sistema rechaza el cambio.
- Si el codigo ya esta asignado a otro seller de la misma empresa, el sistema rechaza el cambio.

## Caso de Uso 3: Validar Codigo en el Pago

**Actor principal:** Cajero u operador de venta

**Precondiciones:**
- Hay una orden en proceso.
- El usuario selecciono un metodo de pago.

**Flujo principal:**
1. El usuario abre el modal de pago.
2. El sistema muestra el campo `Codigo de seller`.
3. El usuario ingresa 4 digitos.
4. El sistema busca un seller activo de la misma empresa con ese codigo.
5. Si existe, el sistema muestra el nombre o email del seller.
6. El boton `Realiza pago` queda habilitado solo si el monto pagado es valido y el seller fue validado.

**Errores esperados:**
- Si el codigo esta incompleto, el boton de pago permanece deshabilitado.
- Si el codigo no existe, el sistema muestra error y el boton permanece deshabilitado.
- Si el usuario cambia el codigo luego de validarlo, el seller validado se limpia hasta completar una nueva validacion.

## Caso de Uso 4: Crear Orden con Seller Resuelto en Servidor

**Actor principal:** Sistema

**Precondiciones:**
- El usuario confirmo el pago.
- El cliente envio un `sellerCode` validado visualmente.

**Flujo principal:**
1. El server action `order/actions.create` recibe el codigo de seller.
2. El servidor valida que el codigo tenga exactamente 4 digitos.
3. El servidor busca un usuario `SELLER`, activo y de la misma empresa.
4. El servidor usa el `id` encontrado como `sellerId` de la orden.
5. El servidor crea la orden, pagos, movimientos de stock y documento asociado dentro del flujo existente.

**Errores esperados:**
- Si no se envia codigo, la creacion falla antes de crear la orden.
- Si el codigo tiene formato invalido, la creacion falla antes de crear la orden.
- Si el codigo no corresponde a un seller activo de la empresa, la creacion falla antes de crear la orden.
- Si el seller fue desactivado o cambio de codigo entre la validacion del modal y la confirmacion, la creacion falla.

## Caso de Uso 5: Acceso Operativo del Rol Seller

**Actor principal:** Seller

**Precondiciones:**
- Existe un usuario con rol `SELLER`.

**Flujo principal:**
1. El seller inicia sesion.
2. El sistema lo redirige al flujo operativo de nueva orden.
3. El seller puede operar ventas segun sus permisos.
4. El seller no puede administrarse desde el modal generico de usuarios.

**Errores esperados:**
- Si un usuario intenta crear un `SELLER` desde el modal generico, el sistema lo bloquea.
- Si un seller intenta acceder a configuracion de sellers sin permiso, el sistema bloquea el acceso.

## Criterios de Aceptacion

- Un codigo valido muestra el seller y habilita el pago cuando el monto coincide con el total.
- Un codigo incompleto o inexistente bloquea el pago.
- Una llamada directa al server action sin codigo no crea orden.
- Una llamada directa con codigo invalido no crea orden.
- Una llamada directa con codigo de usuario que no sea `SELLER` no crea orden.
- Una orden creada correctamente queda persistida con `sellerId`.
- La unicidad de `sellerCode` se respeta por empresa.

## Riesgos y Controles

- **Riesgo:** el cliente envia un `sellerId` manipulado.
  **Control:** el cliente ya no envia `sellerId`; envia `sellerCode` y el servidor resuelve el seller.

- **Riesgo:** el seller cambia despues de la validacion visual.
  **Control:** el servidor vuelve a validar antes de crear la orden.

- **Riesgo:** codigos con ceros iniciales se pierden.
  **Control:** el codigo se guarda y procesa como texto.

- **Riesgo:** codigos duplicados dentro de una empresa.
  **Control:** hay validacion en acciones/repositorio e indice unico por `companyId + sellerCode`.
