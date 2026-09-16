# KIT-06 — Confirmar para llevar y delivery sin exigir pago

Estado: pendiente de implementación y pruebas.
Dependencias: [KIT-03](03-enviar-rondas-desde-mesas.md), [KIT-05](05-cancelar-platos-cobrar-y-cerrar-mesa.md).
Fuente: [diseño — envío, trabajo de preparación y transiciones de pedido](../2026-09-13-kitchens-comandas-impresas-design.md).

## Flujo y resultado

El responsable confirma un pedido para llevar o delivery, envía sus productos a las Kitchens y puede agregar otra ronda. El cobro y la impresión no cierran el pedido; la entrega registra su finalización. Delivery permite despachar tras verificación física de lo preparado.

## Alcance

- Crear o integrar los puntos de confirmación de TAKE_AWAY y DELIVERY con `sendRound`, interfaz, autorización y detalle de rondas/comandas.
- Envío de adicionales, líneas DishProduct independientes y consulta/cancelación mediante el flujo compartido.
- Integración con el cobro existente sin volver a crear líneas; actualizaciones del ciclo de pedido y entrega en una transacción.
- Desacoplar el despacho delivery de estados digitales de preparación y de la impresión; ajustar únicamente los puntos afectados por este diseño.

## Fuera de alcance

Diseñar un módulo delivery completo, repartidores, GPS, tarifas, entrega fallida, devoluciones, cambios de observaciones enviadas, preparación/servido digital y nuevas reglas financieras no definidas por este diseño.

## Criterios de aceptación

1. Confirmar cada tipo crea `status = PENDING` y `paymentStatus = PENDING` y ejecuta el mismo `sendRound` de mesas. No exige pago ni usa sin cambios la acción de venta que obliga a caja/comprobante para confirmar.
2. Dos Kitchens generan sus respectivas comandas; las configuradas generan trabajo inicial y las no configuradas conservan comanda sin trabajo. Los productos sin Kitchen permanecen en el pedido y el total. Impresora desconectada o fallo posterior no deshace la confirmación.
3. La comanda identifica correctamente TAKE_AWAY o DELIVERY, número de pedido y responsable, sin una mesa ficticia ni precios. Se conserva el detalle de cada preparación repetida.
4. Agregar productos genera una ronda nueva correlativa y comandas solo de los adicionales. Repetir una confirmación o envío recupera su resultado sin duplicar pedido, líneas, ronda o trabajos; una respuesta perdida también se recupera. Reutilizar un identificador con otro contenido se rechaza.
5. La confirmación y creación inicial de líneas/ronda/comandas son atómicas. No quedan pedidos parcialmente confirmados ante un fallo de persistencia. Cobrar el pedido existente no vuelve a enviar sus productos ni crea otra ronda.
6. El detalle permite consultar lo enviado y utilizar la cancelación común de KIT-05 mientras está pendiente de pago, sin reglas distintas de cantidades para estos canales.
7. Pagar cambia solo `paymentStatus` a `PAID`; el pedido sigue `PENDING`. Imprimir no cambia pago ni finalización. La entrega cambia `status` a `COMPLETED` junto con su operación de cierre y conserva el estado de pago, respetando las validaciones financieras propias del flujo de entrega.
8. Delivery se puede despachar tras verificación física sin exigir Listo, Servido, confirmación de cocina o éxito de impresión. Despachar no equivale a entregar ni completa el pedido. No se introducen estados de preparación de platos.
9. Cancelar el pedido exige pago pendiente y lo deja `CANCELLED`; no cambia a PAID ni borra su historial. Las consultas y mutaciones respetan empresa y permisos existentes del canal; no se amplía acceso a roles por inferencia.
10. Reintentos y concurrencia de cobro/cierre no duplican operaciones ni retroceden estados. La configuración restaurants y las validaciones de acceso vigentes siguen aplicándose.

## Prueba autónoma

**Preparación:** usuarios autorizados de ambos canales, empresa con restaurantes, Kitchens con y sin impresora y productos sin destino. Una segunda empresa permite comprobar aislamiento. No requiere worker: se inspeccionan trabajos persistidos.

**Recorrido:**

1. Confirmar un pedido sin pagar para cada canal con productos de los tres destinos; verificar pedido, rondas, totales, contenido y trabajos.
2. Agregar otra preparación del mismo plato y enviar adicionales. Repetir solicitudes, competir por la misma confirmación y simular respuesta perdida.
3. Cancelar parcialmente desde el detalle usando KIT-05; comprobar que el envío original conserva su copia.
4. Cobrar sin crear nuevas líneas ni trabajos; comprobar PAID/PENDING. Despachar delivery con impresión no ejecutada y verificar que sigue pendiente de entrega.
5. Entregar y comprobar COMPLETED y pago sin cambios. Forzar fallo durante el cierre y verificar que se revierte la operación completa.
6. Probar cancelación de un pedido no pagado, rechazo de cancelación pagada, empresa ajena y rol sin permiso.

**Evidencia de cierre:** capturas de confirmación/despacho/entrega, comparación de líneas y estados, y pruebas reales de atomicidad e idempotencia. Reutilizar tareas existentes de delivery si ya cubren estos puntos; no implementar un segundo recorrido.
