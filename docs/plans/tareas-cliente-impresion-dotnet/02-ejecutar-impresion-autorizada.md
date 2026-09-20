# DOT-02 — Ejecutar una impresión autorizada de extremo a extremo

Estado: pendiente de implementación y pruebas.
Dependencias: DOT-01; claim con `attemptExpiresAt`, `serverNow` y vencimiento estable; límite de contenido aplicado por backend.
Fuente: [diseño](../2026-09-13-cliente-impresion-dotnet-design.md).

## Flujo y resultado

Un trabajo autorizado por el backend genera un aviso; el servicio reclama el intento, entrega exactamente sus bytes a la cola indicada y comunica el resultado. Un aviso repetido no genera otra impresión.

## Alcance

Conectar Realtime, claim HTTPS, validación, plazo local, journal duradero, exclusión por trabajo e impresora, API nativa RAW y reporte. Incluir los controles de seguridad y duplicados desde el primer envío, aunque la recuperación completa se termine en DOT-03.

## Criterios de aceptación

1. Solo `PRINT_JOB_AVAILABLE` versión 1 con payload válido dispara claim autenticado. El aviso público no autoriza la impresión. No hay claims concurrentes del mismo `jobId`; respuestas no autorizadas o no disponibles no llegan al spooler.
2. El claim valida identidad del trabajo, intento entero positivo, destino, contenido y fechas requeridas. La respuesta se lee con un máximo de 2 MiB; Base64 inválido y contenido decodificado mayor de 1 MiB se rechazan íntegramente y se reportan como `FAILED` para el intento identificable. No se recorta el contenido.
3. El tiempo disponible se calcula como `max(0, attemptExpiresAt - serverNow - duración total del claim)` y se consume con reloj monotónico. Claims repetidos del mismo intento no amplían el vencimiento local; `timeoutMs` no reinicia el plazo. No se entra al spooler si ya venció, tampoco después de esperar por exclusión.
4. El journal contiene un JSON por trabajo con intentos, SHA-256 del contenido, destino, fase, resultado y confirmación del backend; nunca contiene bytes imprimibles. El nombre físico se deriva de un hash del identificador, evitando usar datos externos como rutas.
5. Se mantiene exclusión por trabajo e impresora y se persiste `SENDING` antes de entrar a las operaciones nativas, con temporal, `Flush(true)` y sustitución. Si falla esa escritura, no se imprime. Un resultado conocido se vuelve a reportar sin imprimir; se rechaza el mismo trabajo con contenido distinto. Un estado incierto nunca habilita otro envío.
6. La entrega RAW usa `printerLocalName` y los bytes decodificados sin añadir comandos ni transformar texto o imágenes. Ocurre fuera de los hilos de interfaz y recepción. Se verifican resultados nativos, total de bytes aceptados y cierre del documento; se liberan los recursos al finalizar.
7. `DELIVERED` exige aceptación completa por el spooler, sin afirmar salida física. `RETRYABLE_FAILURE` requiere fallo recuperable con certeza de cero bytes enviados. Entrega parcial, incertidumbre, contenido inválido o configuración terminal producen `FAILED`.
8. El resultado se persiste antes del POST. Un fallo de reporte no repite la impresión. Se lee `data.status` aunque HTTP sea 200; si difiere del resultado local se conserva la discrepancia. Un 409 no confirma por sí solo un estado terminal. El cliente no cambia de impresora ni decide nuevos intentos.

## Prueba del flujo

**Preparación:** instalación vinculada, cola ESC/POS y backend con las ampliaciones acordadas; contenido conocido con texto e imagen. Para la prueba automatizada se reemplaza la entrega nativa por un receptor que capture bytes y número de llamadas.

**Recorrido:** generar un trabajo por el flujo del backend, recibir aviso, reclamar, entregar y confirmar; duplicar el aviso durante y después del procesamiento. Repetir con contenido inválido y plazo agotado.

**Evidencia:** igualdad de bytes en el receptor, una sola entrega, journal sin contenido imprimible y estado final del backend. La impresión física se registra por separado en DOT-04.

## Qué probar con tests

- Avisos malformados/duplicados y claim 401/409; identidad, intento y fechas inválidas no permiten enviar bytes.
- Base64 inválido; exactamente 1 MiB aceptado y 1 MiB + 1 byte rechazado; límite de transporte de 2 MiB aplicado durante la lectura.
- Latencia del claim, reloj del sistema adelantado/atrasado, claim repetido y cambios de configuración del backend: ninguno amplía el plazo.
- Identificadores con separadores de ruta, cambios de contenido del mismo trabajo, avisos concurrentes y exclusión por impresora.
- Fallo al persistir `SENDING`: cero llamadas nativas; fallo al guardar el resultado: ningún reenvío y conservación de la incertidumbre.
- Aceptación completa, escrituras parciales, error de apertura, error al cerrar y posible entrega de bytes: clasificación conforme al diseño, sin declarar `DELIVERED` prematuramente.
- Respuesta 200 con estado distinto, 409 y fallo de transporte al reportar: conservar evidencia y no imprimir de nuevo.
