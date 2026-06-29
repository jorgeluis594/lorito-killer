# Sellers en Configuracion de Empresa

## Objetivo

Agregar una seccion `Sellers` dentro de configuracion de empresa para administrar usuarios vendedores. Cada seller es un usuario con rol `SELLER` y un `sellerCode` unico por empresa, usado como codigo operativo de 4 digitos.

## Ya implementado

- El sistema ya maneja usuarios por empresa con roles y permisos.
- Las ordenes ya tienen soporte para asociar un vendedor mediante `sellerId`.
- La configuracion de empresa ya cuenta con navegacion interna y paginas protegidas por permisos.
- El modal generico de usuarios permite crear roles operativos como cajero, mozo, cocina o bartender segun features.

## Implementado en esta mejora

- Se agrego el rol `SELLER` al enum de usuarios.
- Se agrego `sellerCode` al modelo `User`.
- Se agrego unicidad por empresa para `companyId + sellerCode`.
- Se crearon acciones y repositorio para listar sellers, crear sellers y actualizar su codigo.
- La nueva ruta `/dashboard/settings/sellers` permite:
  - Ver sellers de la empresa.
  - Crear un seller con nombre opcional, email y password.
  - Generar automaticamente un codigo de 4 digitos.
  - Editar el codigo si cumple el formato exacto `0000` a `9999`.
- El codigo se guarda como texto para preservar ceros iniciales.
- El rol `SELLER` tiene permisos equivalentes al cajero para operar ventas, pagos, caja, clientes y delivery.
- La validacion de vendedor en ordenes acepta tambien usuarios `SELLER`.
- El modal generico de creacion de usuarios ya no ofrece el rol `SELLER`.
- La ruta de sellers requiere permiso `company:update`, por lo que usuarios no admin no pueden administrarla.

## Validaciones

- `sellerCode` debe tener exactamente 4 digitos.
- No se permiten codigos duplicados dentro de la misma empresa.
- La generacion automatica reintenta cuando encuentra colisiones.
- Emails duplicados no crean nuevos sellers.

## QA realizado

- Login de admin y navegacion a Settings: aprobado.
- Creacion de seller con codigo automatico: aprobado.
- Edicion de codigo, incluyendo cero inicial: aprobado.
- Validacion de codigo corto, duplicado y no numerico: aprobado.
- Exclusion de `SELLER` del modal generico: aprobado.
- Restriccion de acceso para seller no admin: aprobado.

## Pendiente / observaciones

- Mejorar el mensaje visual cuando se intenta crear un seller con email duplicado.
- El email invalido queda bloqueado por validacion HTML5 del navegador, no por un mensaje custom.
- Aun no se integra el `sellerCode` al flujo de creacion de ordenes; por ahora solo se administra en configuracion.
