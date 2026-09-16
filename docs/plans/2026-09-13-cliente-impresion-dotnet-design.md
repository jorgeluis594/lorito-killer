# Cliente de impresión .NET para Windows

Estado: diseño definido; implementación pendiente. `apps/print-gateway` contiene la base de un Worker .NET 10. El contrato HTTPS descrito se contrastó el 15 de septiembre de 2026; sus ampliaciones pendientes se identifican expresamente. Las pruebas en equipos Windows e impresoras reales quedan pendientes.

## Objetivo y alcance

Implementar una aplicación .NET que vincule un equipo con una única empresa, informe sus impresoras instaladas y ejecute trabajos ESC/POS preparados por el backend. Tendrá un servicio de impresión automático y una interfaz mínima en el área de notificación de Windows.

La app .NET es un cliente de impresión genérico. Su contrato contiene la identidad del trabajo y del intento, la cola destino, los bytes imprimibles, el vencimiento y el resultado. Toda selección de destino, generación del documento y regla de negocio pertenece al backend; el cliente ejecuta cada trabajo autorizado sin interpretar su propósito.

El cliente es responsable de:

- Vincular el equipo desde la ventana local y proteger su credencial.
- Escuchar avisos, reclamar trabajos por HTTPS y reportar resultados.
- Enumerar las colas de Windows accesibles para el servicio.
- Validar y entregar bytes RAW sin modificar su contenido.
- Evitar envíos duplicados mediante un registro local duradero.
- Mantener logs de diagnóstico y aislar fallos por impresora.

No configura impresoras, instala controladores, genera plantillas ni accede a la base de datos del negocio. La impresión de prueba, la autoactualización y el diseño de reinstalación o actualización quedan fuera del alcance.

## Plataforma, distribución y configuración

Se requiere Windows 10 x86 y x64, y Windows 11 x64. Otras plataformas tendrán aplicaciones independientes. La base técnica es .NET 10, con paquetes autocontenidos `win-x86` y `win-x64`; su compatibilidad real está pendiente de validar por edición y versión de Windows. La [matriz de .NET 10](https://github.com/dotnet/core/blob/main/release-notes/10.0/supported-os.md) no garantiza soporte para cualquier instalación de Windows 10.

Se entregará el ejecutable o paquete de su arquitectura. La puesta en marcha inicial incluye registrar el servicio, conceder permisos a las colas y habilitar el inicio de la bandeja; no requiere diseñar un instalador especial. La [publicación de .NET](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview) es específica por arquitectura.

| Variable de entorno | Uso en el servicio |
| --- | --- |
| `PRINT_BACKEND_URL` | URL del backend; HTTPS en producción. |
| `SUPABASE_URL` | URL del proyecto usado para los avisos. |
| `SUPABASE_PUBLISHABLE_KEY` | Clave pública de Supabase; no sustituye la credencial de instalación. |

Estos son los nombres elegidos para implementar la configuración acordada. El servicio valida presencia y URLs antes de operar. No se distribuyen claves administrativas. El vínculo queda asociado al entorno: cambiar la URL del backend no autoriza enviar la credencial al nuevo destino.

## Procesos y comunicación local

- Se distribuirá un mismo ejecutable por arquitectura con dos modos: servicio (`--service`) y bandeja (`--tray`, también al abrirlo normalmente). Serán procesos separados. La ventana usará Windows Forms y su icono de notificación; no requiere un navegador integrado.
- El servicio se registrará como `LoritoPrintGateway`, con cuenta virtual `NT SERVICE\LoritoPrintGateway`. Tendrá permiso sobre su carpeta de datos y las colas instaladas que deba usar. El registro inicial del servicio y estos permisos requieren privilegios de administrador; la ventana cotidiana se ejecutará sin elevación. Las colas de red deberán ser accesibles bajo esa identidad.
- La bandeja iniciará al abrir la sesión mediante un acceso directo en el inicio de Windows. Habrá una instancia por sesión y un único servicio por equipo. Cerrar la ventana solo la oculta; cerrar sesión no detiene el servicio.
- La ventana usará un named pipe local, `LoritoPrintGateway.v1`. El servicio será el único servidor. La ACL permitirá al servicio y administradores crear el servidor y a usuarios interactivos locales conectarse, sin conceder creación de instancias a estos últimos; rechazará acceso por red y anónimo. La ventana comprobará que el servidor pertenece a la identidad del servicio antes de enviar el código. Se usarán las API de Windows y .NET; no se abrirá un puerto HTTP local.
- Solo habrá dos operaciones: `GET_STATUS` y `LINK` con el código de cuatro dígitos. JSON UTF-8 con longitud prefijada, versión 1 y máximo 8 KiB por mensaje. Se validan longitud, versión y operación antes de procesarlo. No admite rutas de archivos, comandos, impresiones ni lectura de credenciales.
- `GET_STATUS` devuelve únicamente estado de vinculación y empresa. `LINK` se serializa: solo puede vincular una instalación aún no vinculada, nunca reemplazar una empresa existente. La autorización de empresa sigue siendo el código generado desde la web. El servicio realiza el HTTPS y guarda la credencial; la ventana recibe solo el resultado y la empresa. Un error de transporte durante la vinculación no causa reenvíos automáticos de códigos de uso único.

Fundamento: [seguridad de named pipes](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipe-security-and-access-rights) y [cuentas de servicio](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/understand-service-accounts). Los mecanismos nativos se reutilizan sin crear un servicio web local.

## Ventana y vinculación

1. El icono aparece al iniciar sesión; la ventana permanece cerrada hasta pulsarlo.
2. Sin vínculo, muestra «Autenticarse». El botón abre un campo para el código de cuatro dígitos generado desde la web; se conservan ceros iniciales, como `0047`.
3. La ventana envía el código al servicio mediante `LINK`. El servicio realiza la vinculación HTTPS y guarda el resultado protegido antes de confirmar éxito.
4. Vinculado, muestra el nombre de la empresa. Si el nombre recibido es nulo o vacío, muestra «Empresa vinculada» y su identificador.
5. Cerrar la ventana la oculta; cerrar sesión no detiene el servicio ni la impresión.

El código tiene vigencia de diez minutos y un solo uso. El cliente muestra los errores de código inválido o vencido y permite corregirlo, respetando el límite de cinco fallos por IP durante diez minutos. No solicita usuario ni contraseña y no reintenta automáticamente un intercambio cuyo resultado se desconoce.

El nombre se conserva con el vínculo para mostrarlo tras reiniciar. Identifica la empresa vinculada, no demuestra conectividad actual. Sincronizar cambios posteriores del nombre queda fuera de esta versión. La credencial no llega a la ventana, logs ni argumentos de proceso.

La ventana se ejecuta en la sesión del usuario y el servicio arranca al encender el equipo, incluso sin sesión. Véase [separación de servicios e interfaces interactivas en Windows](https://learn.microsoft.com/en-us/windows/win32/services/interactive-services).

## Datos locales y protección

La raíz será `%ProgramData%\Lorito\PrintGateway`, independiente de dónde esté el ejecutable. La ACL deshabilitará la herencia amplia y permitirá acceso al servicio, SYSTEM y administradores; los usuarios de la bandeja consultarán la información a través del pipe.

| Ubicación | Contenido |
| --- | --- |
| `binding.dat` | Vínculo completo: identificadores, nombre de empresa, entorno del backend y credencial. Protegido con DPAPI `LocalMachine`. |
| `journal/` | Un archivo JSON por trabajo, con intentos, hash SHA-256 del contenido, destino, fase local, resultado y confirmación del backend. Sin bytes imprimibles. |
| `logs/` | Archivos diarios de diagnóstico; retención de siete días. |

DPAPI con alcance de máquina exige mantener la ACL: otro proceso del equipo que obtenga el archivo podría descifrarlo. La protección efectiva combina ambos mecanismos; no se entrega el archivo a la ventana. Véase [DataProtectionScope](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.dataprotectionscope).

El servicio será el único escritor. Cada actualización usará un temporal en el mismo directorio, `Flush(true)` y sustitución del archivo; un temporal incompleto no se aceptará como registro válido. El nombre físico del registro se derivará de un hash del identificador para no convertir datos externos en rutas. Un bloqueo exclusivo por trabajo y otro por impresora impiden ejecuciones concurrentes. No se incorpora una base de datos local.

Antes de entrar en las operaciones nativas se persiste la fase `SENDING`. Si esa escritura falla, no se imprime. Al finalizar se persiste el resultado antes de reportarlo. Reiniciar con `SENDING` significa resultado incierto, nunca permiso de reenvío. Si el registro está corrupto o falta el directorio de una instalación ya vinculada, se detiene la impresión hasta resolver el almacenamiento; no se reconstruye una cola suponiendo que nada se imprimió. Un registro `RECEIVED` no se ejecuta después de reiniciar sin reclamar nuevamente y comprobar el plazo con el backend.

Los registros confirmados como terminales se conservan 30 días adicionales; los no confirmados no se eliminan por antigüedad. Un HTTP 409 por sí solo no confirma el estado terminal, por lo que no habilita su borrado. La limpieza de logs no toca el journal. Cambiar la URL de backend de una instalación vinculada no enviará la credencial al nuevo destino: el servicio rechazará la discrepancia de entorno.

## Comunicación remota

El servicio inicia conexiones salientes: Supabase Realtime Broadcast para avisos y HTTPS/JSON para vinculación, inventario, claim y resultados. No necesita conexiones entrantes desde el backend.

Realtime utiliza un canal público y la configuración pública de Supabase. La app no usa Supabase Auth ni obtiene JWT privados. Su credencial Bearer autentica únicamente las operaciones HTTPS contra el backend. Recibir un aviso público no autoriza a imprimir; el cliente siempre debe reclamar el trabajo y validar la respuesta. Véase [Supabase Broadcast](https://supabase.com/docs/guides/realtime/broadcast).

El cliente no envía heartbeat ni calcula un estado de conexión para la web. Al reconectar vuelve a suscribirse y actualiza el inventario, sin ejecutar trabajos antiguos por su cuenta ni reiniciar plazos. No existe un endpoint de consulta de trabajos pendientes para el cliente.

### Avisos Realtime

Canal público: `print-client:{clientId}`. El nombre del evento y su payload son:

| Evento | Payload |
| --- | --- |
| `PRINT_JOB_AVAILABLE` | `{ "type": "PRINT_JOB_AVAILABLE", "version": 1, "jobId": "<jobId>" }` |
| `REFRESH_PRINTER_INVENTORY` | `{ "type": "REFRESH_PRINTER_INVENTORY", "version": 1 }` |

El cliente ignora eventos, versiones o payloads desconocidos. Un aviso público solamente dispara una operación HTTPS autenticada. Debe evitar claims concurrentes del mismo trabajo y consultar su registro local antes de enviar bytes; la idempotencia del backend por sí sola no evita dos llamadas locales al spooler.

## Inventario de impresoras

El servicio enumera las colas accesibles bajo su propia identidad mediante [EnumPrinters](https://learn.microsoft.com/en-us/windows/win32/printdocs/enumprinters). Envía el inventario completo al arrancar vinculado, después de vincularse o reconectarse y cuando recibe `REFRESH_PRINTER_INVENTORY`. No hace una actualización periódica cada cinco minutos.

- Una enumeración exitosa sin impresoras se comunica como `printers: []`.
- Si Windows falla al enumerar, se registra el error y no se envía una lista vacía.
- Se informa el nombre de cada cola. El cliente no inventa una identidad física ni reasigna automáticamente una cola renombrada.
- Se admiten USB, red y Bluetooth mediante colas previamente instaladas y accesibles para el servicio. El cliente no descubre todos los dispositivos de red ni empareja Bluetooth.
- Una cola visible no garantiza que la impresora esté disponible ni que acepte ESC/POS. Las impresoras PDF/A4 pueden aparecer en el inventario, pero no son destinos de este flujo.

## Contenido y ejecución de impresión

El cliente recibe `contentBase64`, lo decodifica y entrega los mismos bytes como RAW a `printerLocalName`. El contenido incluye texto, imágenes e instrucciones de formato y corte. No descarga imágenes, genera PDF, interpreta plantillas ni añade comandos. Las imágenes ya llegan ajustadas y convertidas a ESC/POS.

El tamaño máximo es **1 MiB (1 048 576 bytes) de ESC/POS**, incluyendo imágenes, antes de Base64. La respuesta de claim se lee con un máximo de 2 MiB para limitar el transporte; después se valida Base64 y el límite de bytes decodificados. Un exceso o contenido inválido se rechaza antes de imprimir y se reporta como `FAILED`; no se recorta ni se envía parcialmente para cumplir el límite.

Se requieren térmicas ESC/POS de 58 y 80 mm. La compatibilidad se valida por equipo: el cliente no configura perfiles ni supone compatibilidad universal. Cambiar el formato en el backend no requiere actualizar .NET mientras se conserve el contrato y el lenguaje de la impresora.

Flujo de un trabajo:

1. Validar el aviso y evitar claims concurrentes del mismo `jobId`.
2. Reclamarlo por HTTPS. Verificar identificador, intento, destino, contenido y vencimiento; un aviso nunca sustituye esta autorización.
3. Consultar el journal por `jobId + attemptNumber`. Si existe un resultado conocido, reportarlo sin imprimir otra vez. Rechazar el mismo trabajo con contenido distinto.
4. Mantener exclusión por trabajo y por impresora. Registrar duraderamente `SENDING` antes de entrar al spooler; si falla el registro, no enviar bytes.
5. Ejecutar la entrega RAW fuera de los hilos de interfaz y comunicación. Comprobar resultados nativos, bytes aceptados y cierre del documento.
6. Guardar el resultado antes de reportarlo por HTTPS. Un fallo al reportar no autoriza repetir la impresión.

El cliente no cambia de impresora ni genera copias por su cuenta. Cada nuevo `jobId` autorizado se procesa con el mismo mecanismo, independientemente de qué operación del backend lo originó.

## Resultados, plazos y recuperación

| Resultado que envía el cliente | Condición |
| --- | --- |
| `DELIVERED` | Windows aceptó el documento completo en el spooler. No confirma salida física de papel. |
| `RETRYABLE_FAILURE` | Fallo recuperable con certeza de que no se enviaron bytes. El cliente espera una nueva autorización; no programa otro envío. |
| `FAILED` | Resultado incierto, posible entrega de bytes, contenido inválido o error terminal de configuración. No se reimprime automáticamente. |

El backend coordina los intentos; el cliente no replica su planificador. La política de integración vigente usa por defecto 10 segundos para reclamar y para responder, cuatro intentos totales y esperas de 5, 15 y 30 segundos después de fallos seguros. Estos valores no se fijan como temporizadores independientes en .NET. No reclamar o no responder a tiempo puede terminar el trabajo aunque queden intentos; reconectar no lo reactiva.

El claim debe incluir `attemptExpiresAt` y `serverNow` en UTC ISO 8601. El cliente mide la duración total de la petición y calcula `max(0, attemptExpiresAt - serverNow - duración del claim)`. Consume ese tiempo con un reloj monotónico. Repetir el claim del mismo intento nunca amplía su vencimiento local; `timeoutMs` no se interpreta como un nuevo plazo. Si el plazo ya venció, no inicia el spooler. Estos dos campos son una dependencia de contrato todavía pendiente.

Si solo falla la comunicación del resultado, se conserva y se vuelve a informar sin repetir el envío. Un estado terminal recibido no se reactiva. Si tras reiniciar el journal indica `SENDING`, se informa resultado incierto; no se asume que el trabajo no llegó a Windows. Perder el registro exige resolver el vínculo y el almacenamiento sin reanudar trabajos antiguos automáticamente.

No se garantiza impresión física exactamente una vez. La recuperación evita reenvíos automáticos ante incertidumbre y conserva evidencia para que el backend y el operador resuelvan el resultado.

### Llamadas bloqueadas

Cada impresora tendrá como máximo una ejecución nativa simultánea, fuera del hilo de la ventana y de la recepción de avisos. La recepción Realtime, HTTPS y otras impresoras seguirán funcionando. Se comprobarán el resultado de las llamadas, el total de bytes escritos y el cierre del documento; `DELIVERED` requiere aceptación completa por el spooler.

Al vencer el plazo durante una llamada nativa, se persiste el resultado incierto y se intenta informar `FAILED`. No se mata el hilo ni se considera que cancelar una espera canceló la impresión. La exclusión de esa impresora se mantiene hasta que la llamada termine: cualquier otro intento ya autorizado para ella se responde como fallo seguro sin enviar bytes, dejando al backend decidir sus reintentos. No se acumulan envíos locales para ejecutarlos después del vencimiento.

Si la llamada termina tarde, se registra lo observado sin convertirlo en otro envío ni sobrescribir el fallo ya comunicado. Una llamada que nunca retorna requiere intervención del operador sobre Windows o el servicio; no se reinicia automáticamente el spooler de todas las impresoras. La aplicación tampoco elimina trabajos de la cola de Windows. Esto limita únicamente esa impresora y no agrega estados de negocio. El operador deberá revisar la cola física antes de solicitar otro envío porque los bytes aceptados podrían imprimirse posteriormente.

Esta decisión evita agregar procesos auxiliares o un mecanismo de cancelación que no garantiza detener papel ya enviado. La limitación es explícita: no se promete recuperación automática de un controlador bloqueado. [WritePrinter es una llamada síncrona y potencialmente bloqueante](https://learn.microsoft.com/en-us/windows/win32/printdocs/writeprinter).

## Contrato HTTPS que consume la app

### Contrato disponible al revisar la integración

Todas las rutas usan POST. Los cuerpos y respuestas son JSON; salvo vinculación, requieren `Authorization: Bearer <credencial de instalación>`. Los identificadores de empresa y cliente se derivan de esa credencial.

| Ruta | Cuerpo | Respuesta satisfactoria |
| --- | --- | --- |
| `/api/printing/clients/link` | `{ "code": "0047", "machineName": "CAJA-01" }` | HTTP 201: `{ "success": true, "data": { "id": "<clientId>", "companyId": "<companyId>", "credential": "<credencial>" } }` |
| `/api/printing/clients/printers` | `{ "version": 1, "printers": [{ "localName": "IMPRESORA-01" }] }` | HTTP 200: `{ "success": true, "data": { "registered": 1, "lastInventoryAt": "<fecha ISO>" } }` |
| `/api/printing/jobs/{jobId}/claim` | Sin cuerpo | HTTP 200 con los datos del intento indicados debajo. |
| `/api/printing/jobs/{jobId}/result` | `{ "attemptNumber": 1, "result": "DELIVERED" }`; `error` opcional | HTTP 200: `{ "success": true, "data": { "jobId": "<jobId>", "attemptNumber": 1, "status": "DELIVERED", "nextAttemptAt": null } }` |

Respuesta de claim:

```json
{
  "success": true,
  "data": {
    "jobId": "<jobId>",
    "attemptNumber": 1,
    "printerId": "<printerId>",
    "printerLocalName": "IMPRESORA-01",
    "timeoutMs": 10000,
    "contentBase64": "<bytes ESC/POS codificados en Base64>"
  }
}
```

Validaciones actuales: código de cuatro dígitos; nombre del equipo de 1 a 120 caracteres; inventario de hasta 200 impresoras, con nombres de 1 a 260 caracteres; número de intento entero positivo y error opcional de hasta 1000 caracteres. El resultado acepta exclusivamente `DELIVERED`, `RETRYABLE_FAILURE` o `FAILED`. El backend elimina espacios exteriores de los nombres y descarta nombres duplicados del inventario.

Los cuerpos inválidos reciben HTTP 400; la credencial ausente, inválida o revocada recibe 401. Vinculación devuelve 401 para código inválido o vencido y 429 al alcanzar su límite de fallos. Claim y resultado devuelven 409 cuando el trabajo o intento no está disponible para ese cliente. No se debe interpretar el texto del error como un código estable de protocolo.

Un resultado repetido puede recibir HTTP 200 con el estado que el backend ya conservaba. El cliente debe leer `data.status`: ese 200 no significa necesariamente que se haya aplicado el resultado recién enviado. Si el backend ya marcó `FAILED` y localmente consta una entrega al spooler, se conserva la discrepancia para diagnóstico y no se imprime otra vez.

### Ampliaciones requeridas para el cliente

| Operación | Campo o garantía requerida | Uso en .NET |
| --- | --- | --- |
| Vinculación | `companyName: string \| null` en `data`, junto a `id`, `companyId` y `credential`. | Guardar y mostrar la empresa sin consultarla en cada apertura. |
| Claim | `attemptExpiresAt` y `serverNow`, fechas UTC ISO 8601. | Calcular el tiempo restante sin depender de que el reloj del equipo esté sincronizado. |
| Claim repetido | Mismo vencimiento para el mismo intento, incluso si cambia la configuración del servidor. | Nunca reiniciar el plazo local. |
| Contenido | Máximo de 1 MiB de bytes ESC/POS por trabajo. | Validar antes del spooler y rechazar el exceso completo. |

Ejemplo de campos nuevos del claim: `"attemptExpiresAt": "2026-09-16T12:00:10.000Z", "serverNow": "2026-09-16T12:00:00.200Z"`. El contrato disponible anterior todavía no incluye estos campos ni `companyName`; deben incorporarse antes de completar la integración. La persistencia y las migraciones del servidor pertenecen a su propia implementación.

## Diagnóstico local

El servicio escribirá logs diarios en `logs/` de arranque, conexión, reconexión y errores de inventario, claim, spooler y reporte. Incluirán fecha, operación, nivel, motivo y, cuando corresponda, `jobId` y `attemptNumber`.

No se registrarán códigos de vinculación, credenciales, cabeceras de autorización ni contenido imprimible. La retención es de siete días, con limpieza al arrancar y cada 24 horas. Si falla la escritura de logs, se usará Windows Event Log cuando esté disponible. La rotación no borra ni sustituye el journal contra duplicados.

## Trabajo pendiente y criterios de aceptación

Plan de implementación: [tareas por flujos completos, criterios de aceptación y tests](tareas-cliente-impresion-dotnet/README.md).

La base .NET todavía debe implementar los procesos, interfaz, protección local, comunicación y entrega RAW aquí definidos. Las ampliaciones de contrato son dependencias de integración; el detalle interno del servidor no forma parte de este documento.

La implementación se comprobará con los siguientes criterios:

1. Servicio automático sin sesión; bandeja automática por sesión con ventana cerrada hasta pulsar el icono. Cerrar la ventana no interrumpe la impresión.
2. Vinculación por código, empresa visible y vínculo conservado tras reiniciar; dos ventanas no sustituyen el vínculo ni revelan la credencial.
3. Named pipe restringido y almacenamiento inaccesible para usuarios sin permisos. La credencial no sale hacia otro entorno al cambiar la configuración.
4. Inventario completo, vacío válido y fallo de enumeración diferenciados. Colas visibles para la cuenta del servicio.
5. Bytes RAW idénticos a los recibidos, con texto e imágenes. 1 MiB aceptado; 1 MiB más un byte, Base64 inválido o respuesta excesiva rechazados antes de imprimir.
6. Avisos duplicados, resultados repetidos y caídas antes o después de `SENDING` no producen reenvíos inciertos. Un journal corrupto o no escribible impide el envío.
7. Latencia, cambios de configuración y claims repetidos no amplían el plazo del intento. Un resultado tardío no reactiva el trabajo.
8. Una llamada nativa bloqueada no bloquea las demás impresoras ni permite otro envío concurrente sobre la afectada.
9. Logs sin secretos y eliminación después de siete días, independiente de la retención del journal.

**Pruebas en equipos pendientes por decisión del usuario:** registrar edición y versión de Windows, arquitectura, modelo y controlador; validar Windows 10 x86/x64 y Windows 11 x64, USB/red/Bluetooth, 58/80 mm, imágenes, acentos, ñ, corte y arranque sin sesión. No se da por certificada ninguna combinación ni se confunden comprobaciones del backend con pruebas del cliente Windows.
