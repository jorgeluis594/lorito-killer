# DOT-03 — Recuperar interrupciones y aislar impresoras bloqueadas

Estado: implementada y validada en integración local .NET; la validación en Windows y con hardware real sigue pendiente.
Dependencias: DOT-02.
Fuente: [diseño](../2026-09-13-cliente-impresion-dotnet-design.md).

## Flujo y resultado

Ante una caída, pérdida de red o controlador bloqueado, el servicio conserva lo ocurrido, informa lo que sabe y permite que las otras impresoras sigan funcionando. Nunca convierte la incertidumbre en permiso para volver a imprimir.

## Alcance

Completar recuperación del journal, reenvío exclusivo de resultados, reconexión, aislamiento de llamadas bloqueadas y limpieza de registros. El backend sigue coordinando intentos y plazos.

## Criterios de aceptación

1. Al reiniciar, un registro `SENDING` se trata como resultado incierto y se informa `FAILED`, sin enviar bytes. Un `RECEIVED` no se ejecuta sin reclamar nuevamente y validar el plazo; no se recorren registros para imprimir trabajos antiguos por cuenta propia.
2. Un resultado persistido pendiente de confirmación puede reenviarse por HTTPS sin repetir la entrega. Estados terminales no se reactivan. Si se recibe otro intento, se conserva el historial y la evidencia del trabajo: una entrega conocida o incierta no se transforma en un nuevo envío; un fallo seguro requiere nueva autorización del backend.
3. Un journal corrupto, no escribible o cuyo directorio falte en una instalación ya vinculada detiene la impresión y deja diagnóstico. Un temporal incompleto no se acepta como registro válido ni reemplaza evidencia existente. No se reconstruye el historial suponiendo que nada se imprimió.
4. Al reconectar se restablece la suscripción y se actualiza inventario. No se consultan pendientes ni se amplían plazos. Los valores de reintentos y esperas del backend no se duplican como un planificador local.
5. Si vence el plazo durante una llamada nativa, se persiste incertidumbre y se intenta reportar `FAILED`. No se mata el hilo ni se considera que cancelar una espera cancela la impresión. La impresora mantiene su exclusión hasta que termine la llamada; los nuevos intentos autorizados para ella reciben fallo seguro sin enviar bytes ni acumular envíos para después.
6. Mientras una impresora está bloqueada, la bandeja, Realtime, HTTPS y otra impresora continúan operando. Si la llamada termina tarde se registra lo observado sin sobrescribir el fallo ya comunicado ni repetir el envío. Si nunca retorna, se requiere intervención del operador; no se reinicia automáticamente el spooler global ni se borran trabajos Windows.
7. Se conservan registros confirmados terminales durante 30 días adicionales desde la confirmación. Los no confirmados no se eliminan por antigüedad; un 409 no habilita su borrado. La limpieza de logs no toca el journal.

## Prueba del flujo

**Preparación:** instalación vinculada, dos destinos, backend controlable, almacenamiento temporal real y sustituto de API nativa capaz de bloquear una llamada y liberarla después.

**Recorrido:** interrumpir el proceso antes y después de `SENDING`, después de aceptar bytes y antes de confirmar el resultado. Reiniciar y contar entregas. Cortar red durante reporte y recuperarla. Bloquear una impresora hasta vencer el plazo mientras la segunda completa otro trabajo; liberar tarde la primera. Repetir con un journal corrupto.

**Evidencia:** número de envíos por trabajo, fases duraderas y resultados del backend, continuidad del segundo destino y motivo de intervención cuando corresponde.

## Qué probar con tests

- Reinicios en cada frontera de persistencia, incluidos temporales incompletos: ningún `SENDING` vuelve a imprimirse y ningún `RECEIVED` se ejecuta sin autorización vigente.
- Caída entre aceptación por Windows y guardado del resultado; caída tras guardar y antes/después de recibir confirmación HTTPS.
- Reportes repetidos, 200 con estado conservado diferente, 409 y reconexiones sucesivas: no duplicar entrega ni perder discrepancias.
- Journal ausente, corrupto, disco lleno y permisos denegados: bloquear impresión cuando no pueda conservarse evidencia.
- Llamada nativa bloqueada, vencimiento, segundo intento en la misma cola, trabajo en otra cola y retorno tardío; controlar reloj y sincronización sin depender de pausas arbitrarias.
- Retención justo antes y después de 30 días desde confirmación, registros antiguos sin confirmar y limpieza de logs independiente.
- Con backend real: nueva autorización después de un fallo seguro y rechazo de intentos vencidos/terminales, sin que el cliente reproduzca la política de cuatro intentos y esperas de 5/15/30 segundos.

## Validación local observada

```text
dotnet test apps/print-gateway.tests/Lorito.PrintGateway.Tests.csproj --no-restore
10 correcto, 0 errores
dotnet build apps/print-gateway/Lorito.PrintGateway.csproj --no-restore
Compilación correcta, 0 advertencias, 0 errores
```

La suite cubre reinicio con `SENDING`, reintento autorizado conservando historial, journal ausente o incompleto, corrupción implícita por validación de estructura, bloqueo aislado por impresora y retención terminal de 30 días. La comprobación con servicio Windows, ACL, spooler y hardware físico permanece pendiente para DOT-04.
