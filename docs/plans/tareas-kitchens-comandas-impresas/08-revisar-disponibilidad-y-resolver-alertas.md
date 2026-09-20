# KIT-08 — Revisar impresoras y resolver comandas que requieren atención

Estado: pendiente de implementación y pruebas.
Dependencias: [KIT-06](06-confirmar-para-llevar-y-delivery.md), [KIT-07](07-imprimir-pendientes-y-reimprimir.md).
Fuente: [diseño — consultas, disponibilidad y alertas](../2026-09-13-kitchens-comandas-impresas-design.md#consultas-disponibilidad-y-alertas).

## Flujo y resultado

Al entrar en `/tables`, el usuario ve las impresoras que requieren revisión. Desde un icono abre las comandas pendientes o fallidas que puede consultar y resuelve una mediante Imprimir o Reimprimir, incluso si nunca recibió el aviso inicial.

## Alcance

- `checkKitchenPrinters`, cuadro de disponibilidad al entrar y solicitud de inventario mediante Realtime.
- Icono/modal con `getKitchenTickets({ requiresActionOnly: true })` para mesa, para llevar y delivery.
- Alertas descartables a responsable y administrador, refresco por eventos/lecturas autorizadas e integración de acciones de KIT-07.
- Filtrado por ciclo del pedido, último trabajo, vigencia y alcance del usuario.

## Fuera de alcance

Heartbeat, historial de notificaciones, recuperar avisos perdidos, persistir descartes, timeout especial de inventario, estado `isDetected`, resolución manual ficticia de trabajos o nuevas reglas de cierre.

## Criterios de aceptación

1. Cualquier usuario con acceso a `/tables` ve el cuadro de disponibilidad sin un permiso adicional. Solo incluye impresoras asignadas de su empresa; esta visibilidad no habilita configuración administrativa ni lectura de comandas ajenas.
2. Una impresora ausente del último inventario completo alerta inmediatamente, aunque tenga un DELIVERED reciente. La presencia se deriva de `Printer.lastDetectedAt` y `PrintClient.lastInventoryAt`; fechas inexistentes no acreditan presencia.
3. Para una impresora presente se toma la fecha mayor entre último trabajo DELIVERED y lastDetectedAt. Si no existe o supera cinco minutos, muestra el cuadro y solicita nuevo inventario por Realtime. El umbral es configurable; `lastSeenAt` no interviene.
4. Registrar un inventario que confirma presencia retira la impresora del cuadro y actualiza la actividad sin necesidad de imprimir. Una lista vacía o que no la incluya mantiene la advertencia. No se agrega estado, requestId o respuesta especial de disponibilidad; actualizar inventario no cambia trabajos ni estado administrativo.
5. El icono abre un modal consultable aunque se haya cerrado o perdido una alerta. Incluye solo pedidos `status = PENDING`: comandas sin trabajos con algún ítem vigente o comandas cuyo último trabajo está FAILED. Un fallo antiguo con un trabajo posterior exitoso no aparece.
6. Sin impresora muestra `NO_PRINTER_CONFIGURED` sin habilitar impresión; después de configurarla muestra `NOT_PRINTED` y permite Imprimir. Si no tuvo trabajos y todos los ítems están cancelados, no aparece. Tener trabajos previos conserva las reglas de fallo aun con cantidades vigentes cero.
7. ADMIN ve las comandas de su empresa; el mozo únicamente las de sus rondas. Filtros de navegador no amplían alcance. Las acciones reutilizan permisos y precondiciones de KIT-07 y no permiten una segunda solicitud mientras exista trabajo activo.
8. Resolver una comanda no reenvía el pedido ni otras Kitchens. Durante un trabajo nuevo deja de cumplir el filtro de fallidas; si termina FAILED vuelve a aparecer y si termina DELIVERED permanece fuera. Los trabajos previos se conservan.
9. Cobrar un pedido de restaurante que sigue PENDING no lo retira del modal. Liberar la mesa o entregar cambia a COMPLETED y lo excluye; CANCELLED también queda fuera. La regla se aplica igual a los tres canales y no usa estados de preparación/entrega para reconstruir el cierre.
10. Los fallos generan avisos en tiempo real descartables para responsable y administrador. Cerrar un aviso no resuelve la comanda ni impide reimprimir desde detalle. Los avisos no recibidos no se recuperan, pero una consulta sí reconstruye la lista desde persistencia.
11. Los eventos provocan nuevas lecturas autorizadas, sin exponer datos de otra empresa/usuario. Sin Realtime, recargar o abrir nuevamente obtiene el estado vigente. El cuadro de dispositivos y el modal de comandas mantienen propósitos y resultados independientes.

## Prueba autónoma

**Preparación:** dos empresas, ADMIN y dos mozos; fixtures de los tres tipos de pedido, incluidos PENDING pagado, COMPLETED y CANCELLED. Preparar comandas sin trabajos, fallidas, exitosas después de un fallo, activas y canceladas por completo. Cliente de prueba capaz de registrar inventario y ejecutar trabajos.

**Recorrido:**

1. Entrar con una impresora ausente que tenga impresión reciente, otra presente con actividad vieja y otra reciente. Verificar advertencias y solicitud de inventario; comprobar el límite de cinco minutos y un umbral alternativo.
2. Enviar lista completa actualizada y después vacía; comprobar entrada/salida del cuadro sin impresiones ni cambios administrativos.
3. Abrir el modal como ADMIN y cada mozo; comparar alcance, motivos, botones y pedidos incluidos.
4. Configurar una Kitchen pendiente y pulsar Imprimir; reimprimir una fallida. Ejecutar éxito y fallo, observando la lista en dos sesiones sin duplicar productos.
5. Cerrar una alerta y resolver desde el detalle. Desconectar Realtime antes de un fallo: al volver no se recupera el aviso, pero abrir el modal encuentra la comanda.
6. Cobrar un pedido pendiente y confirmar que permanece; liberar/entregar/cancelar según corresponda y verificar exclusión sin borrar historial. Cancelar todos los ítems de una comanda sin trabajos y comprobar su exclusión.
7. Probar consultas y acciones manipuladas con otra empresa, otro responsable y rol no autorizado.

**Evidencia de cierre:** capturas independientes de cuadro y modal, matriz de visibilidad por rol/canal/estado, pruebas de umbral y filtrado, y recorrido de resolución con estados persistidos. No requiere que una alerta se haya recibido para reproducirlo.
