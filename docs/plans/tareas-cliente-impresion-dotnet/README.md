# Cliente de impresión .NET — tareas por flujo

Fecha: 2026-09-15.
Estado: DOT-01 a DOT-04 implementadas; pruebas físicas de DOT-04 pendientes por decisión del usuario.
Fuente: [diseño del cliente Windows](../2026-09-13-cliente-impresion-dotnet-design.md).

## Organización

Cuatro tareas, cada una con un recorrido observable y comprobable. Servicio, interfaz, persistencia, permisos y tests se implementan dentro del flujo que los necesita; no se dividen en tareas por archivo o capa técnica. La base existente en `apps/print-gateway` es el punto de partida, no una implementación terminada.

| ID | Flujo entregable | Dependencias |
| --- | --- | --- |
| [DOT-01](01-vincular-equipo-y-publicar-impresoras.md) | Abrir la bandeja, vincular el equipo y publicar sus impresoras | Endpoint de vinculación con `companyName` e inventario disponibles |
| [DOT-02](02-ejecutar-impresion-autorizada.md) | Recibir un aviso, imprimir los bytes autorizados y confirmar el resultado | DOT-01; ampliaciones de claim y límite de contenido en backend |
| [DOT-03](03-recuperar-fallos-sin-duplicar.md) | Recuperar interrupciones y aislar una impresora bloqueada sin duplicar envíos | DOT-02 |
| [DOT-04](04-poner-en-marcha-y-validar-windows.md) | Desplegar por arquitectura y verificar operación desatendida y diagnóstico | DOT-01 a DOT-03 |

Las dependencias del backend son las ampliaciones del diseño: `companyName: string | null` en vinculación; `attemptExpiresAt` y `serverNow` UTC en claim; vencimiento estable del mismo intento y límite de 1 MiB de ESC/POS. Se coordinan con su implementación y se prueban contra los endpoints reales. Un servidor simulado permite avanzar en .NET, pero no acredita la integración terminada. Este plan no desglosa la persistencia ni las migraciones internas del servidor.

## Reglas de cierre

- Cada tarea entrega código y tests del flujo, pasos reproducibles y resultados observados. Las capturas acreditan la bandeja; los registros y peticiones se adjuntan sin secretos ni contenido imprimible.
- La exclusión, el journal duradero y la protección de credenciales se incorporan desde el primer flujo que los usa. DOT-03 completa la recuperación; DOT-04 valida la distribución, sin posponer hasta ellas la seguridad básica.
- El cliente sigue siendo genérico: el backend decide destino, documento y reintentos. No agregar reglas de comandas, plantillas, heartbeat, consulta de pendientes, impresión de prueba como función del producto, instalación de controladores, autoactualización ni un instalador especial.
- Las pruebas físicas siguen pendientes por decisión del usuario. DOT-04 documenta su ejecución futura: no dar por certificada una combinación de Windows e impresora por haber aprobado tests automáticos.

## Qué probar con tests

Los casos concretos están dentro de cada tarea. Esta es la distribución de la cobertura:

| Nivel | Qué comprobar | Tareas |
| --- | --- | --- |
| Tests automatizados de lógica .NET | Validación de mensajes y contenido, cálculo de plazos con reloj monotónico controlado, clasificación de resultados, deduplicación y retenciones | DOT-01 a DOT-03 |
| Integración local .NET | Journal con archivos reales y fallos de escritura, reinicios del servicio, concurrencia, HTTP con respuestas controladas y llamadas nativas simuladas que fallan o se bloquean | DOT-01 a DOT-03 |
| Integración en Windows | Identidad y ACL del pipe, DPAPI y ACL de datos, cuenta virtual del servicio, enumeración y spooler, arranque sin sesión y bandeja por sesión | DOT-01, DOT-02, DOT-04 |
| Integración con backend real | Código de un uso y rate limit, aislamiento de cliente, revocación, inventario, campos nuevos de claim, vencimiento estable y respuesta a resultados repetidos | DOT-01 a DOT-03 |
| Pruebas manuales con hardware | Windows y arquitectura, USB/red/Bluetooth, térmicas de 58/80 mm, texto, imágenes, acentos, ñ, corte y recuperación observada | DOT-04 |

Los tests de .NET se ejecutan con `dotnet test`; las comprobaciones exclusivas de Windows necesitan un entorno Windows y deben identificarse como tales. Si se amplía el backend, sus tests Vitest pertenecen al feature correspondiente y las garantías de persistencia se validan con integración real. No usar una impresora física para cada test automatizado: simular únicamente los límites externos necesarios para reproducir errores y contar envíos; verificar por separado que las API nativas funcionan bajo la cuenta del servicio.

## Cobertura del diseño

| Requisito | Responsable |
| --- | --- |
| Procesos, bandeja, vinculación, pipe, protección del vínculo e inventario | DOT-01 |
| Avisos, claim, validación, plazos, entrega RAW y reporte | DOT-02 |
| Persistencia inicial contra duplicados | DOT-02 |
| Reinicios, incertidumbre, reenvío de resultados, bloqueos y retención del journal | DOT-03 |
| Logs iniciales por operación | Tarea que incorpora la operación |
| Publicación, puesta en marcha, retención de logs y matriz física | DOT-04 |
