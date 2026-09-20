# DOT-01 — Vincular el equipo y publicar sus impresoras

Estado: pendiente de implementación y pruebas.
Dependencias: vinculación con `companyName` e inventario HTTPS del [diseño](../2026-09-13-cliente-impresion-dotnet-design.md).

## Flujo y resultado

El usuario abre la bandeja, introduce el código generado en la web y ve su empresa vinculada. El servicio conserva el vínculo y publica las colas que puede usar, incluso después de reiniciar o cerrar la sesión del usuario.

## Alcance

Implementar los modos servicio y bandeja del mismo ejecutable, ventana Windows Forms, comunicación por named pipe, cliente HTTPS de vinculación, protección del vínculo, suscripción Realtime e inventario. Incluir el registro del servicio y permisos necesarios para probar el flujo; la entrega por arquitecturas se cierra en DOT-04.

## Criterios de aceptación

1. `--service` ejecuta un único servicio `LoritoPrintGateway` bajo `NT SERVICE\LoritoPrintGateway`; `--tray` y la apertura normal ejecutan una bandeja por sesión. La ventana comienza oculta y cerrarla solo la oculta. Cerrar sesión no detiene el servicio.
2. Sin vínculo se ofrece «Autenticarse». El código se valida como texto de cuatro dígitos y conserva `0047`. La ventana muestra errores de código inválido/vencido y límite de intentos; un error de transporte no reenvía automáticamente el código de un solo uso.
3. El pipe `LoritoPrintGateway.v1` acepta únicamente `GET_STATUS` y `LINK`, JSON UTF-8 con longitud prefijada, versión 1 y máximo 8 KiB. Rechaza longitudes, versiones y operaciones inválidas. Su ACL permite conexiones de usuarios interactivos locales, pero no crear servidores; rechaza red y anónimos. La bandeja verifica la identidad del servidor antes de enviar el código.
4. `LINK` se serializa: dos ventanas no crean vínculos simultáneos ni reemplazan una empresa existente. El servicio guarda el vínculo antes de confirmar éxito; una escritura fallida no muestra vinculación exitosa. `GET_STATUS` solo expone estado de vinculación y empresa; ninguna respuesta del pipe expone credenciales.
5. `binding.dat` conserva identidad, nombre, entorno y credencial mediante DPAPI `LocalMachine`, dentro de `%ProgramData%\Lorito\PrintGateway` con ACL restringida al servicio, SYSTEM y administradores. La escritura usa temporal en el mismo directorio, `Flush(true)` y sustitución; un temporal incompleto no se acepta como vínculo.
6. Tras reiniciar se muestra la empresa guardada; si el nombre es nulo o vacío se usa «Empresa vinculada» y su identificador. La credencial no aparece en bandeja, logs ni argumentos. Se validan las tres variables del diseño y sus URLs; producción usa HTTPS y cambiar el backend de un vínculo existente impide enviarle la credencial.
7. Se publica el inventario completo enumerado bajo la identidad del servicio al arrancar vinculado, vincularse, reconectarse y recibir `REFRESH_PRINTER_INVENTORY` versión 1. Enumeración exitosa sin colas envía `printers: []`; un error de Windows se registra y no publica un vacío engañoso. Se respetan los límites del contrato sin truncar silenciosamente el inventario.
8. La suscripción usa el canal público `print-client:{clientId}` y configuración pública, sin claves administrativas ni Supabase Auth. Ignora avisos desconocidos o malformados. No hay heartbeat, inventario periódico ni descubrimiento o configuración de dispositivos; una cola renombrada no se reasigna por inferencia.

## Prueba del flujo

**Preparación:** equipo Windows con servicio registrado, usuario estándar, backend de prueba con empresa y código, y dos colas accesibles al servicio.

**Recorrido:** abrir la bandeja, vincular con un código que conserve ceros iniciales, verificar empresa e inventario en backend, cerrar sesión y reiniciar. Abrir dos ventanas desde sesiones distintas e intentar volver a vincular. Retirar las colas, solicitar actualización y luego forzar un error de enumeración para distinguir ambos resultados.

**Evidencia:** capturas de la empresa, inventarios recibidos y comprobación de permisos e identidad sin exponer el vínculo.

## Qué probar con tests

- Validación del código, nombre alternativo de empresa y protocolo del pipe: límites, mensajes truncados, versión y operación desconocida.
- Dos solicitudes `LINK` concurrentes, vínculo existente, fallo al guardar y respuesta HTTPS perdida: nunca confirmar persistencia inexistente ni reenviar automáticamente.
- Lectura del vínculo tras reiniciar y rechazo de cambio de entorno antes de enviar credenciales.
- En Windows, usuario estándar sin acceso a datos ni permiso para suplantar el servidor; DPAPI y conexión legítima de la bandeja.
- Inventario completo, vacío, error de enumeración y disparadores de actualización, con HTTP/Realtime controlados.
- Con backend real: código usado/vencido, límite de cinco fallos por IP en diez minutos, credencial revocada y contrato `companyName`; no inferir códigos de protocolo a partir del texto de error.
