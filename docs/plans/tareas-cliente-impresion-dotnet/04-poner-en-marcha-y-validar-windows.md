# DOT-04 — Poner en marcha el cliente y validar operación desatendida

Estado: implementado; pruebas físicas pendientes por decisión del usuario.
Dependencias: DOT-01, DOT-02 y DOT-03.
Fuente: [diseño](../2026-09-13-cliente-impresion-dotnet-design.md).

## Flujo y resultado

Un operador recibe el paquete de su arquitectura, registra el servicio y habilita la bandeja. El equipo arranca y procesa trabajos sin sesión; al iniciar sesión muestra el vínculo. Ante un fallo, el operador encuentra diagnóstico suficiente para actuar sin exponer credenciales.

## Alcance

Publicaciones autocontenidas .NET 10 `win-x86` y `win-x64`, instrucciones reproducibles de puesta en marcha inicial, permisos, acceso directo de inicio, diagnóstico y validación de compatibilidad. No incluye un instalador especial ni diseño de actualización o reinstalación.

## Criterios de aceptación

1. Cada paquete contiene el mismo ejecutable con modos servicio y bandeja, y funciona sin instalar el runtime de .NET por separado en las combinaciones validadas. Las instrucciones identifican arquitectura, configuración y pasos que requieren administrador.
2. La puesta en marcha registra `LoritoPrintGateway` con cuenta virtual y arranque automático, aplica ACL de datos, concede acceso a las colas necesarias y habilita la bandeja mediante acceso directo al inicio de sesión. La ventana cotidiana no requiere elevación.
3. Tras reiniciar sin abrir sesión, el servicio usa el vínculo conservado, publica inventario y procesa un trabajo autorizado. Al iniciar sesión aparece solo el icono y la ventana se abre al pulsarlo; varias sesiones no duplican el servicio. Cerrar ventana o sesión no interrumpe trabajos.
4. Los logs diarios registran arranque, conexión, reconexión y errores de inventario, claim, spooler y reporte, con fecha, operación, nivel, motivo e identidad de trabajo/intento cuando corresponda. No registran código, credencial, autorización ni contenido imprimible.
5. La limpieza se ejecuta al arrancar y cada 24 horas, con retención de siete días. Si no se pueden escribir logs se usa Windows Event Log cuando esté disponible. La rotación no altera el journal ni el vínculo.
6. Existe una guía de diagnóstico para servicio detenido, cola inaccesible bajo su cuenta, credencial revocada, discrepancia de entorno, almacenamiento inválido y llamada nativa bloqueada. Ante incertidumbre indica revisar la cola física antes de solicitar otro envío, sin prometer cancelación o recuperación automática.
7. Cada prueba de compatibilidad registra edición y versión de Windows, arquitectura, modelo, controlador, conexión y ancho de impresora. Se distinguen aprobado, fallido y no probado; ninguna matriz vacía se presenta como certificación. Las limitaciones de soporte de .NET 10 sobre Windows 10 quedan explícitas.

## Prueba del flujo

**Preparación:** equipo Windows de la arquitectura correspondiente, permisos administrativos para puesta en marcha, usuario estándar para operación, backend y térmica ESC/POS accesible a la cuenta del servicio.

**Recorrido:** desplegar siguiendo la guía, vincular, reiniciar sin iniciar sesión y enviar un trabajo desde el backend. Iniciar sesión, comprobar bandeja y empresa, cerrar sesión y enviar otro. Provocar un fallo de cola y revisar logs; comprobar retención usando fechas controladas en un entorno de prueba.

**Evidencia:** paquete y arquitectura utilizados, pasos reproducidos, registro de arranque sin sesión, capturas de bandeja, resultado del spooler y observación física por separado. Si no se dispone de equipo, registrar el caso como pendiente; no sustituir esta evidencia por tests del backend.

## Qué probar con tests

- Comprobación de publicación de ambos paquetes y arranque de ambos modos en Windows compatible.
- En Windows, registro y arranque bajo la cuenta prevista, acceso real a colas locales/de red y bandeja sin elevación por sesión.
- Retención de siete días, limpieza al arrancar/cada 24 horas y fallo de escritura con Event Log disponible; verificar que no se borran registros del journal.
- Ausencia de secretos y contenido imprimible en logs y errores, incluidos errores HTTP y de vinculación.

## Qué probar manualmente con equipos

| Eje | Cobertura y evidencia requerida |
| --- | --- |
| Sistema | Windows 10 x86, Windows 10 x64 y Windows 11 x64; registrar edición/versión y compatibilidad efectiva del runtime |
| Conexión | USB, red y Bluetooth mediante colas ya instaladas y accesibles para el servicio |
| Impresora | Térmicas ESC/POS de 58 y 80 mm; modelo y controlador por caso |
| Contenido | Texto, imágenes preparadas por backend, acentos, ñ y corte; comparar con el documento esperado |
| Operación | Arranque sin sesión, cierre de sesión, reinicio y conservación del vínculo; diferenciar aceptación del spooler de salida de papel |
| Fallos | Impresora desconectada, pérdida de red, error de cola y recuperación; revisar físicamente cualquier resultado incierto antes de otro envío |

Registrar las combinaciones realmente ejecutadas, no asumir que probar cada eje por separado acredita todas sus combinaciones. Estas pruebas usan trabajos autorizados del backend; no requieren agregar una función de impresión de prueba al producto.
