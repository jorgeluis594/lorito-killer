# KIT-04 — Ejecutar una comanda y recuperar fallos seguros

Estado: pendiente de implementación y pruebas.
Dependencias: [KIT-01](01-vincular-cliente-y-registrar-impresoras.md), [KIT-03](03-enviar-rondas-desde-mesas.md).
Fuente: [diseño — política de recuperación y coordinación](../2026-09-13-kitchens-comandas-impresas-design.md).

## Flujo y resultado

Un trabajo pendiente se anuncia al cliente correcto, este reclama un intento y reporta su resultado. El backend concluye la impresión, programa un reintento seguro o registra un fallo terminal recuperable manualmente.

## Alcance

- Coordinador `src/kitchen/process-print-jobs.ts` dentro de `src/worker.ts`.
- `authorizePrintAttempt`, `recordPrintResult`, `recordPrintTimeout`; endpoints POST de claim y resultado con la autenticación de KIT-01.
- Avisos Realtime dirigidos al cliente, persistencia de calendario/contador/fechas y alertas de fallo posteriores al commit mediante los bordes existentes.
- Índices de planificación y timeouts, reserva única por impresora y trabajo activo único por comanda, mediante SQL para índices parciales.
- Índices `(status, nextAttemptAt)`, `(status, claimRequestedAt)`, `(status, processingStartedAt)` y `(kitchenTicketId, createdAt)` para coordinación y lectura del último trabajo.

## Fuera de alcance

Cliente .NET, spooler y deduplicación local duradera; interfaz del modal; reimpresión manual; impresión web de prueba; tabla de intentos; nuevos workers separados o colas de recuperación paralelas.

## Criterios de aceptación

1. El coordinador elige el trabajo habilitado más antiguo de cada impresora libre. Reserva atómicamente `claimRequestedAt` y publica `{ type: "PRINT_JOB_AVAILABLE", version: 1, jobId }` en `print-client:{printClientId}` mediante la integración existente. El canal público nunca transporta credenciales, destino, contenido ni datos del pedido.
2. Un índice parcial permite como máximo un trabajo reservado o `PROCESSING` por impresora. Los otros esperan sin comenzar su timeout. Otro índice impide varios trabajos `PENDING`/`PROCESSING` por comanda; ambas garantías resisten varios workers.
3. `POST /api/printing/jobs/{jobId}/claim` autentica cliente, empresa, propiedad de impresora, estado, ventana, calendario y presupuesto. En una actualización cambia a `PROCESSING`, incrementa `attempts`, limpia claim y fija `processingStartedAt`. No se autoriza por GET.
4. La respuesta incluye `jobId`, `attemptNumber`, `printerId`, `printerLocalName`, `contentBase64` y timeout. Base64 se genera solo en la respuesta a partir de los bytes guardados. Repetir claim del mismo cliente devuelve el intento en ejecución sin incrementar el contador; solicitudes no autorizadas no reciben contenido.
5. `POST /api/printing/jobs/{jobId}/result` acepta solo el número que sigue `PROCESSING`. `DELIVERED` concluye sin más intentos y significa aceptación del spooler, no salida física de papel. `RETRYABLE_FAILURE` solo aplica cuando el cliente afirma que no entregó bytes; no es estado persistido.
6. Por defecto hay cuatro intentos totales y esperas de 5, 15 y 30 segundos desde cada fallo seguro. Si quedan intentos, se guarda `PENDING` con `nextAttemptAt`; si no, `FAILED` con motivo. Timeout, máximo y esperas se leen de configuración y funcionan también con valores alternativos.
7. El mismo timeout, diez segundos por defecto, limita claim desde `claimRequestedAt` y resultado desde `processingStartedAt`. Vencer cualquiera produce `FAILED` directamente; no recibir claim no incrementa `attempts`. Resultado incierto o error terminal también acaba en `FAILED` sin reintento automático.
8. Repetir avisos no renueva la ventana. Claims/resultados repetidos, respuestas atrasadas y carreras resultado/timeout no ejecutan otra autorización ni sobrescriben un intento posterior; repetir un resultado aplicado no duplica programación o alerta.
9. Reiniciar worker/backend recupera desde fechas persistidas; reconectar un cliente no reinicia presupuesto ni reactiva terminales. Un aviso perdido se puede repetir dentro de su ventana; una ventana vencida termina en fallo. No existe timeout global adicional por trabajo.
10. Las fechas sin uso quedan `NULL`: próxima ejecución fuera de espera programada, claim fuera de su ventana y procesamiento fuera de `PROCESSING`. Reintentar conserva bytes y destino originales; ni inventario ni configuración los recalculan.
11. Credencial revocada, recursos ajenos y una impresora de otro cliente se rechazan. Revocar después de un claim impide reportar resultado; el intento vence según la política común. Los fallos persistidos emiten un aviso para responsable y administrador después del commit.

## Prueba autónoma

**Preparación:** fixtures de comandas/trabajos válidos de KIT-03, dos clientes y dos impresoras, reloj controlable y cliente HTTP de prueba que reclama y reporta resultados reales al backend.

**Recorrido:**

1. Ejecutar un trabajo hasta DELIVERED y comparar bytes almacenados con Base64 decodificado; confirmar un solo intento.
2. Reportar fallos seguros y éxito posterior; repetir agotando los cuatro intentos. Verificar calendario por defecto y alternativo sin esperar tiempos reales en pruebas de lógica.
3. No reclamar, no responder tras claim y reportar resultado incierto. Comprobar fallo terminal sin reintentos en los tres casos.
4. Duplicar avisos/claims/resultados, enviar un resultado viejo y competir con timeout usando PostgreSQL real.
5. Ejecutar dos workers y varios trabajos por impresora; comprobar reserva única, espera sin timeout prematuro y procesamiento independiente de otra impresora.
6. Reiniciar entre anuncio, claim y espera de reintento; perder un aviso y reconectar. Verificar persistencia y que terminales no se reactivan.
7. Revocar el cliente tras claim y probar acceso cruzado entre empresas y entre clientes de la misma empresa.

**Evidencia de cierre:** trazas de estados/fechas/contadores, avisos sin datos privados y pruebas reales de restricciones/concurrencia. Anexar comprobación física con .NET cuando esté disponible: mismo intento repetido no genera otra ejecución local y el papel respeta el contenido. Si no se ejecuta, registrarla pendiente sin atribuirla al simulador.
