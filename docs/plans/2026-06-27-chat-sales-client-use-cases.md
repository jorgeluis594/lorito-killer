# Casos de uso de cliente: ventas por WhatsApp

Fecha: 2026-06-27

Documentos revisados:

- `docs/2026-06-27-whatsapp-sales-spec.md`
- `docs/plans/2026-06-27-chat-sales-architecture.md`

## Objetivo

Estos casos de uso validan que la funcionalidad de ventas por WhatsApp cubra el
recorrido completo del comprador: iniciar conversacion, pedir, ajustar,
confirmar, pagar, recibir comprobante y volver a contactar al negocio.

El foco esta en la experiencia del comprador, pero cada caso incluye las
validaciones que Kogoz y el responsable de atencion deben cumplir para cerrar la
venta con trazabilidad, permisos, stock, caja, pago y comprobante correctos.

## Alcance asumido

- El MVP es asistido por administrador o cajero. No hay bot que cierre ventas.
- WhatsApp es el primer canal, pero los casos deben seguir aplicando al dominio
  `chat-sales`.
- El comprador no cambia de canal: conversa, confirma, paga y recibe el
  comprobante en WhatsApp.
- Solo hay un pedido activo por conversacion.
- Conversar y armar un pedido no requiere caja abierta.
- Cobrar, crear la venta y emitir comprobante requiere usuario autorizado y caja
  abierta cuando aplique.
- El pago debe cubrir el total antes de crear la venta POS y generar el
  comprobante.
- Los comprobantes considerados son ticket o comprobante simple, boleta y
  factura.
- Delivery y recojo se consideran flujos a validar. Si delivery queda fuera del
  MVP, los casos marcados como delivery deben quedar bloqueados por feature flag
  o configuracion.
- Los pagos parciales no cierran venta en el MVP. Se registran como pago
  incompleto o pendiente de revision.

## Estados esperados por recorrido

| Etapa | Conversacion | Pedido chat | Pago | Comprobante |
| --- | --- | --- | --- | --- |
| Mensaje inicial | Sin atender | No solicitado | Pendiente | No solicitado |
| Atencion tomada | En atencion | No solicitado | Pendiente | No solicitado |
| Pedido armado | Con pedido | En armado | Pendiente | No solicitado |
| Resumen enviado | Esperando comprador | Resumen enviado | Pendiente | No solicitado |
| Confirmacion | Con pedido | Confirmado | Pendiente | No solicitado |
| Pago registrado | Con pedido | Esperando pago o Pagado | Por validar, Incompleto o Aceptado | No solicitado |
| Venta completada | Con pedido | Completado | Aceptado | En preparacion o Emitido |
| Comprobante enviado | Con pedido | Completado | Aceptado | Enviado |
| Cierre | Resuelta | Completado, Cancelado o Abandonado | Segun resultado | Segun resultado |

## Recorrido principal completo

### UC-00 Venta completa por WhatsApp

**Actor principal:** comprador.

**Precondiciones:**

- El negocio tiene ventas por WhatsApp activas.
- El usuario responsable es administrador o cajero autorizado.
- Hay productos disponibles.
- El comprador puede recibir mensajes y documentos por WhatsApp.

**Flujo principal:**

1. El comprador escribe al WhatsApp del negocio.
2. Kogoz crea o reabre una conversacion para el negocio correcto.
3. La conversacion aparece como `Sin atender`.
4. Un administrador o cajero toma la conversacion.
5. El responsable conversa con el comprador y crea un pedido desde el chat.
6. Kogoz prellena contacto con nombre y telefono de WhatsApp cuando existan.
7. El responsable agrega productos, cantidades, notas, comprobante y entrega o
   recojo.
8. Kogoz valida stock preliminar y calcula totales.
9. El responsable envia un resumen por WhatsApp.
10. El comprador confirma productos, total, entrega y comprobante.
11. El responsable registra el pago completo con medio, monto y referencia si
    aplica.
12. Kogoz valida permiso, caja abierta, datos fiscales, pago total y stock
    final.
13. Kogoz crea la venta POS, descuenta stock y genera el comprobante.
14. Kogoz envia el comprobante en el mismo chat.
15. El responsable cierra la conversacion como resuelta.

**Resultado esperado:**

- La conversacion conserva mensajes entrantes, salientes y de sistema.
- El pedido queda completado y asociado a la conversacion.
- El pago queda asociado a la venta POS.
- El comprobante queda asociado a la venta y al intento de entrega por chat.
- El historial muestra quien atendio, cobro, emitio, envio y cerro.

## Casos de uso principales y variantes

### UC-01 Comprador nuevo inicia conversacion

**Objetivo:** permitir que un comprador no registrado pueda iniciar una venta.

**Flujo principal:**

1. El comprador envia un mensaje de texto al numero del negocio.
2. Kogoz resuelve el canal, empresa, contacto e identidad externa.
3. Kogoz crea una conversacion `Sin atender`.
4. La bandeja muestra nombre de perfil, telefono, ultimo mensaje, hora y contador
   de no leidos.
5. Si hay saludo automatico configurado, Kogoz lo envia sin tomar decisiones de
   venta.

**Validaciones:**

- El contacto debe quedar aislado por `companyId`.
- Un mismo mensaje entrante no debe duplicar conversacion ni mensaje visible.
- El telefono de WhatsApp puede ayudar a vincular o crear cliente, pero no debe
  crear datos fiscales falsos.

**Edge cases:**

- WhatsApp no configurado: la bandeja operativa queda bloqueada con accion de
  configuracion.
- Canal desactivado: no se debe crear una atencion vendible.
- Mensaje duplicado del proveedor: se ignora o se marca idempotente.
- Mensaje llega fuera de horario: se registra y se muestra con estado pendiente;
  si hay respuesta de horario, debe quedar como mensaje saliente.
- Primer mensaje es audio, imagen o sticker: si el MVP no procesa media, el chat
  debe mostrarlo como contenido no soportado y permitir pedir el detalle por
  texto.

### UC-02 Comprador recurrente compra otra vez

**Objetivo:** reutilizar historial y datos conocidos sin mezclar pedidos.

**Flujo principal:**

1. El comprador que ya habia comprado vuelve a escribir.
2. Si la conversacion cerrada esta dentro de la ventana de reapertura, Kogoz la
   marca como `Reabierta`.
3. Si esta fuera de la ventana, Kogoz crea una nueva atencion vinculada al mismo
   contacto.
4. El responsable ve historial, cliente vinculado y pedidos anteriores.
5. El responsable inicia un nuevo pedido activo.

**Validaciones:**

- Debe existir como maximo un pedido activo por conversacion.
- La nueva compra no debe modificar pedidos completados anteriores.
- La vinculacion a cliente debe ser sugerida o reutilizada solo si corresponde al
  mismo comprador.

**Edge cases:**

- Mismo telefono pide factura para una razon social distinta: no sobrescribir el
  cliente fiscal anterior sin confirmacion operativa.
- Comprador escribe despues de que otra atencion fue cerrada por error: permitir
  reabrir o crear nueva atencion segun configuracion.
- Dos contactos comparten telefono operativo de empresa: el responsable debe
  poder revisar antes de vincular cliente.

### UC-03 Comprador consulta antes de pedir

**Objetivo:** permitir conversaciones comerciales sin crear pedido prematuro.

**Flujo principal:**

1. El comprador pregunta precio, disponibilidad, horario o formas de pago.
2. El responsable responde desde el chat.
3. Mientras no haya intencion de compra, no se crea `Order PENDING`.
4. Si el comprador decide comprar, el responsable crea el pedido desde el chat.

**Validaciones:**

- Responder mensajes no requiere caja abierta.
- La conversacion puede quedar en `Esperando comprador` sin pedido activo.

**Edge cases:**

- El comprador pide un producto no registrado: el responsable debe responder sin
  poder agregarlo al pedido hasta que exista en catalogo.
- El comprador pide precio desactualizado de un mensaje anterior: el resumen
  actual del pedido debe ser la fuente de verdad.
- El comprador envia muchos mensajes seguidos: el contador de no leidos y orden
  del thread deben mantenerse consistentes.

### UC-04 Comprador arma pedido con productos, cantidades y notas

**Objetivo:** registrar correctamente lo que el comprador pidio por WhatsApp.

**Flujo principal:**

1. El comprador indica productos, cantidades y preferencias.
2. El responsable crea o usa el pedido activo.
3. El responsable busca productos existentes y agrega items.
4. Kogoz valida stock preliminar y calcula subtotales, descuentos y total.
5. El responsable agrega notas por item o por pedido cuando aplique.

**Validaciones:**

- Los items viven en `OrderItem`; `ChatOrder` no duplica productos ni totales.
- Los cambios deben recalcular `Order.netTotal` y `Order.total`.
- La UI debe mostrar pedido vacio, productos agregados y total actualizado.

**Edge cases:**

- Producto sin stock suficiente: bloquear o advertir antes de confirmar.
- Cantidad invalida, negativa o cero: no permitir agregar al pedido.
- El comprador repite el mismo producto en mensajes distintos: el responsable
  debe poder sumar cantidad o mantener lineas separadas con notas distintas.
- Precio cambia durante la conversacion: el resumen enviado debe reflejar el
  precio vigente usado para cerrar.
- Producto se elimina o desactiva mientras el pedido esta en armado: impedir
  confirmacion hasta reemplazarlo o retirarlo.

### UC-05 Comprador modifica el pedido antes de confirmar

**Objetivo:** soportar cambios normales sin perder trazabilidad.

**Flujo principal:**

1. El responsable envia un resumen.
2. El comprador pide agregar, quitar o cambiar productos, notas, entrega o
   comprobante.
3. El responsable modifica el pedido.
4. Kogoz recalcula totales y vuelve el pedido a estado editable.
5. El responsable envia un nuevo resumen.
6. El comprador confirma el ultimo resumen.

**Validaciones:**

- Solo el ultimo resumen vigente debe usarse para confirmar.
- El historial debe mostrar cada resumen enviado y cambio relevante.
- El pedido no puede pasar a pago si la confirmacion corresponde a un resumen
  obsoleto o ambiguo.

**Edge cases:**

- El comprador responde "ok" a un resumen anterior despues de recibir uno nuevo:
  el responsable debe validar manualmente y confirmar solo el resumen vigente.
- El cambio aumenta el total despues de un pago parcial: el pedido queda
  `Esperando pago`.
- El cambio reduce el total despues de un pago registrado: el pago queda en
  revision por posible devolucion o ajuste.

### UC-06 Producto sin stock o cambio de disponibilidad

**Objetivo:** evitar cerrar ventas que no pueden cumplirse.

**Flujo principal:**

1. Kogoz detecta falta de stock al agregar producto o al cierre final.
2. El responsable informa al comprador.
3. El comprador elige reemplazo, menor cantidad o cancelacion.
4. El responsable actualiza el pedido y envia nuevo resumen si continua.

**Validaciones:**

- Debe haber validacion preliminar al armar y validacion final antes de cerrar.
- No se descuenta stock hasta completar la venta POS.
- Si la validacion final falla, no se crea comprobante.

**Edge cases:**

- Otro canal vende el ultimo stock despues de la confirmacion: bloquear cierre y
  pedir decision del comprador.
- Reemplazo tiene mayor precio: requiere nuevo resumen y nueva confirmacion.
- Reemplazo tiene menor precio y ya habia pago: requiere revision de diferencia.

### UC-07 Comprador elige recojo

**Objetivo:** cerrar una venta para recojo sin pedir datos de delivery.

**Flujo principal:**

1. El comprador indica que recogera el pedido.
2. El responsable registra modalidad `recojo`.
3. Kogoz solicita solo los datos necesarios: nombre, telefono si falta, horario o
   nota operativa si aplica.
4. El resumen muestra productos, total, modalidad de recojo y comprobante.
5. El comprador confirma.

**Validaciones:**

- La direccion no debe ser obligatoria para recojo.
- Si el negocio cobra antes de preparar, el pedido no se completa hasta registrar
  pago aceptado.

**Edge cases:**

- Comprador cambia de recojo a delivery: se deben pedir datos de direccion y
  recalcular costo si existe.
- Comprador quiere pagar al recoger: si esta habilitado, el pedido queda
  esperando pago hasta que el cajero registre pago aceptado.
- Comprador no recoge: el pedido puede abandonarse o cancelarse segun politica
  sin crear venta si no hubo pago aceptado.

### UC-08 Comprador elige delivery

**Objetivo:** capturar datos suficientes para entregar el pedido.

**Flujo principal:**

1. El comprador solicita delivery.
2. El responsable registra direccion, referencia, nombre de contacto, telefono y
   notas necesarias.
3. Si existe costo de delivery, el responsable lo incluye en el pedido segun el
   mecanismo definido por el negocio.
4. El resumen muestra productos, total, modalidad delivery, direccion y
   comprobante.
5. El comprador confirma.

**Validaciones:**

- No se debe confirmar delivery con direccion incompleta.
- Los datos de entrega viven en `ChatOrder.deliveryData`.
- La operacion o delivery debe ver los datos necesarios sin entrar a datos
  fiscales sensibles si no son necesarios.

**Edge cases:**

- Direccion ambigua o sin referencia: mantener pedido en armado o pendiente de
  datos.
- Zona no atendida: permitir cambiar a recojo, cambiar direccion o cancelar.
- Costo de delivery cambia el total: requiere nuevo resumen.
- Comprador envia ubicacion de WhatsApp: si el MVP no soporta ubicaciones, pedir
  direccion textual.

### UC-09 Comprador pide ticket, comprobante simple o boleta

**Objetivo:** emitir el comprobante correcto con la menor friccion posible.

**Flujo principal:**

1. El comprador no solicita factura.
2. El responsable selecciona ticket, comprobante simple o boleta segun politica
   del negocio.
3. Si boleta requiere DNI por politica tributaria o monto, Kogoz solicita y
   valida los datos requeridos.
4. El resumen muestra tipo de comprobante.
5. La venta solo se completa cuando los datos obligatorios estan completos.

**Validaciones:**

- Si el comprobante no requiere datos fiscales, el flujo debe ser rapido.
- Si faltan datos obligatorios, bloquear comprobante pero permitir seguir
  conversando y armando pedido.

**Edge cases:**

- DNI invalido o incompleto: bloquear emision de boleta hasta corregir.
- El monto obliga a pedir DNI: mostrar bloqueo claro antes de completar venta.
- Comprador cambia de boleta a factura: ejecutar validaciones de factura antes
  de cerrar.

### UC-10 Comprador pide factura

**Objetivo:** asegurar que la factura solo se emita con cliente fiscal valido.

**Flujo principal:**

1. El comprador pide factura.
2. El responsable solicita RUC, razon social y datos fiscales requeridos.
3. Kogoz busca o crea cliente fiscal.
4. El pedido queda con documento tipo factura.
5. El resumen muestra razon social o identificador fiscal suficiente para que el
   comprador confirme.
6. Al cierre, Kogoz valida datos fiscales completos antes de emitir.

**Validaciones:**

- No se genera factura sin RUC y datos fiscales completos.
- La conversacion y el contacto pueden vincularse al cliente fiscal sin asumir
  que todo pedido futuro usara esa razon social.

**Edge cases:**

- RUC incompleto, invalido o con razon social diferente: bloquear cierre y pedir
  revision.
- Comprador pide factura despues de haber confirmado boleta: actualizar
  comprobante y reenviar resumen.
- Comprador pide factura despues de venta ya completada: derivar a flujo de
  anulacion/cambio segun reglas fiscales existentes; no modificar silenciosamente
  el comprobante emitido.

### UC-11 Comprador recibe resumen y confirma

**Objetivo:** obtener confirmacion explicita antes de cobrar y cerrar.

**Flujo principal:**

1. El responsable envia resumen con productos, cantidades, notas, total,
   modalidad de entrega, datos relevantes y tipo de comprobante.
2. El pedido queda `Resumen enviado`.
3. El comprador confirma explicitamente.
4. El responsable marca el pedido como confirmado.
5. Kogoz habilita el flujo de pago.

**Validaciones:**

- El resumen debe enviarse como mensaje en la conversacion.
- La confirmacion debe quedar trazada.
- No se debe registrar venta POS sin confirmacion del comprador.

**Edge cases:**

- Respuesta ambigua como "ya", "ok pero cambia la direccion": no confirmar hasta
  resolver el cambio.
- Comprador no responde: mantener `Esperando comprador` o abandonar segun
  politica.
- Mensajes llegan desordenados: el responsable debe ver orden claro y
  trazabilidad antes de confirmar.

### UC-12 Comprador paga con billetera digital o transferencia

**Objetivo:** registrar pago conversacional antes de crear la venta POS.

**Flujo principal:**

1. El comprador indica medio de pago como Yape, Plin o transferencia.
2. El responsable comunica instrucciones de pago si corresponde.
3. El comprador envia referencia, codigo, observacion o constancia.
4. El responsable registra `ChatPayment` con metodo, monto, referencia y
   evidencia si existe.
5. Kogoz marca el pago como `Por validar` o `Aceptado` segun la operacion.
6. Si el pago cubre el total, el pedido puede pasar a cierre POS.

**Validaciones:**

- Para billetera o transferencia se debe registrar referencia, codigo u
  observacion cuando exista.
- La referencia repetida debe advertir y pedir revision manual.
- `ChatPayment` no es `Payment` POS hasta completar la venta.

**Edge cases:**

- Constancia ilegible o audio como evidencia: marcar por validar y pedir datos
  textuales.
- Referencia duplicada: bloquear aceptacion automatica y pedir revision.
- Monto menor al total: pago incompleto; no emitir comprobante.
- Monto mayor al total: requiere revision para devolver diferencia o ajustar
  pedido.
- Comprador envia pago antes del resumen: registrar evidencia, pero no cerrar
  hasta tener pedido confirmado y total conciliado.

### UC-13 Comprador quiere pagar al recoger o contra entrega

**Objetivo:** soportar intencion de pago presencial sin cerrar antes de cobrar.

**Flujo principal:**

1. El comprador indica que pagara al recoger o al recibir delivery.
2. El responsable registra la condicion operativa si el negocio la permite.
3. El pedido queda confirmado pero `Esperando pago`.
4. Cuando el comprador paga, el cajero registra pago aceptado.
5. Solo entonces Kogoz completa venta, stock y comprobante.

**Validaciones:**

- Si el MVP exige pago anticipado, esta opcion debe estar deshabilitada o
  mostrarse como no disponible.
- No se debe crear comprobante antes de registrar pago aceptado.

**Edge cases:**

- Caja cerrada al momento de pago presencial: bloquear cobro y pedir abrir caja o
  transferir a un cajero autorizado.
- Comprador cambia medio de pago en el ultimo momento: registrar metodo final y
  referencia si aplica.
- Comprador no se presenta: abandonar o cancelar sin venta POS si no hubo pago.

### UC-14 Pago incompleto, rechazado o devuelto

**Objetivo:** impedir cierres incorrectos cuando el pago no esta aceptado.

**Flujo principal:**

1. El responsable registra pago.
2. Kogoz compara monto aceptado contra total.
3. Si no cubre total, el pedido queda `Esperando pago`.
4. Si el pago se rechaza, el responsable informa al comprador y solicita nuevo
   pago.
5. Si se devuelve, queda trazado como `Devuelto`.

**Validaciones:**

- Pago incompleto bloquea venta POS y comprobante.
- Pago rechazado no debe transformarse en `Payment`.
- Devoluciones o rechazos deben quedar auditados.

**Edge cases:**

- Dos pagos parciales suman el total: si el MVP no soporta multiples pagos, debe
  quedar en revision o bloquearse hasta definir politica.
- Pago aceptado por usuario sin permiso: rechazar accion.
- Pago registrado en conversacion equivocada: debe poder detectarse por
  referencia/evidencia y requerir revision manual.

### UC-15 Venta completada y comprobante enviado

**Objetivo:** cerrar la venta en Kogoz y entregar el comprobante en WhatsApp.

**Flujo principal:**

1. El pedido esta confirmado y el pago cubre el total.
2. El responsable ejecuta completar venta.
3. Kogoz valida permisos, caja, datos fiscales y stock final.
4. Kogoz crea `Payment`, descuenta stock, completa `Order` y crea `Document`.
5. Cuando el comprobante esta listo, Kogoz crea `DocumentDelivery`.
6. Kogoz envia PDF, URL firmada o archivo permitido por WhatsApp.
7. El chat muestra comprobante `Enviado`.

**Validaciones:**

- Las acciones de cobro, emision y envio quedan auditadas.
- Para boleta o factura se espera a que el comprobante este listo segun flujo
  fiscal.
- No se envia comprobante si no fue emitido o si faltan datos obligatorios.

**Edge cases:**

- Stock final falla: no completar venta; volver a ajuste del pedido.
- Error fiscal al generar comprobante: venta queda visible y comprobante en
  `Faltan datos`, `En preparacion` o error segun causa; permitir reintento.
- Comprobante emitido pero WhatsApp falla: mantener `Emitido` y delivery `No
  enviado`; permitir reenviar.
- El comprador no puede descargar archivo: permitir reenviar o compartir formato
  alternativo si el negocio lo soporta.

### UC-16 Mensaje saliente, resumen o comprobante no enviado

**Objetivo:** recuperar fallos de envio sin duplicar ventas ni mensajes criticos.

**Flujo principal:**

1. Kogoz crea un mensaje saliente en outbox.
2. El proveedor devuelve error o no confirma entrega.
3. La UI muestra error y accion de reintento.
4. El responsable reintenta.
5. Kogoz actualiza estado de mensaje y delivery.

**Validaciones:**

- Reintentar un resumen no debe crear otro pedido.
- Reintentar comprobante no debe emitir un nuevo comprobante.
- Debe quedar visible el ultimo error operativo.

**Edge cases:**

- El proveedor envio el mensaje pero el webhook de estado llega tarde: evitar
  duplicar por falta de confirmacion inmediata.
- El comprador recibe dos mensajes por reintento: la conversacion debe mostrar
  trazabilidad y no duplicar efectos de negocio.
- WhatsApp bloquea envio por tipo de archivo: marcar error y permitir alternativa
  definida por el negocio.

### UC-17 Comprador cancela antes de pagar

**Objetivo:** cerrar o abandonar pedidos sin venta POS cuando el comprador se
arrepiente.

**Flujo principal:**

1. El comprador cancela antes de registrar pago aceptado.
2. El responsable marca el pedido como cancelado o abandonado.
3. Kogoz mantiene historial de conversacion y pedido.
4. No se crea `Payment`, `StockTransfer` ni `Document`.
5. La conversacion puede cerrarse como resuelta.

**Validaciones:**

- Cancelar pedido chat no debe usar `Order CANCELLED` si nunca hubo venta POS,
  salvo que la implementacion lo defina explicitamente.
- La cancelacion debe auditar actor, fecha y motivo si se captura.

**Edge cases:**

- Comprador cancela despues de resumen pero antes de confirmar: descartar pedido
  activo.
- Comprador cancela despues de confirmar pero antes de pagar: mantener sin venta
  POS.
- Comprador se queda en silencio: abandonar segun politica de tiempo.

### UC-18 Comprador cancela despues de pagar o despues de emitido

**Objetivo:** separar cancelacion comercial de anulacion fiscal o devolucion.

**Flujo principal:**

1. El comprador solicita cancelar despues de un pago aceptado.
2. Si la venta aun no fue completada, el responsable revisa devolucion o ajuste
   antes de cerrar.
3. Si la venta ya fue completada, se deriva al flujo existente de cancelacion,
   anulacion o nota segun reglas del negocio.
4. El chat conserva evidencia y comunica el resultado al comprador.

**Validaciones:**

- No se debe borrar pago aceptado ni comprobante emitido.
- Toda devolucion, rechazo, anulacion o reenvio debe auditarse.

**Edge cases:**

- Pago aceptado pero venta no completada: permitir marcar pago devuelto y
  cancelar pedido.
- Comprobante emitido y enviado: requiere proceso fiscal existente; no editar el
  documento en chat.
- Stock ya descontado: cualquier cancelacion posterior debe usar el flujo POS
  que revierta o registre el impacto correctamente.

### UC-19 Comprador escribe despues del cierre

**Objetivo:** atender postventa sin perder historial.

**Flujo principal:**

1. La conversacion esta `Resuelta`.
2. El comprador vuelve a escribir.
3. Kogoz reabre la conversacion o crea nueva atencion segun configuracion.
4. El responsable ve historial y decide si es soporte, reenvio de comprobante o
   nueva compra.

**Validaciones:**

- El comprador no debe tener que repetir todo su contexto si esta dentro de la
  ventana de reapertura.
- Si inicia una nueva compra, se crea nuevo pedido activo.

**Edge cases:**

- Comprador pide reenvio de comprobante: reenviar el comprobante existente, no
  emitir uno nuevo.
- Comprador reporta error de direccion o producto despues del cierre: crear caso
  operativo o nueva atencion, sin modificar venta historica sin proceso formal.
- Reapertura fuera de ventana: crear nueva atencion con historial accesible para
  usuarios autorizados.

### UC-20 Comprador intenta manejar dos pedidos activos

**Objetivo:** evitar mezcla de items, pagos y comprobantes.

**Flujo principal:**

1. El comprador pide un segundo pedido mientras hay uno activo.
2. Kogoz muestra al responsable que ya existe pedido activo.
3. El responsable completa, cancela o abandona el pedido activo antes de crear
   otro.
4. Si el segundo pedido corresponde a otra entrega o comprobante, se maneja como
   nuevo pedido despues de cerrar el anterior.

**Validaciones:**

- Una conversacion puede tener historial de varios pedidos, pero solo uno activo.
- Pagos y comprobantes deben asociarse al pedido correcto.

**Edge cases:**

- Comprador quiere dividir pedido en dos direcciones: requiere dos pedidos o una
  regla explicita; no mezclar deliveryData.
- Comprador envia pago para el segundo pedido antes de cerrar el primero: dejar
  pago en revision hasta asociarlo correctamente.

### UC-21 Cambio de responsable durante la atencion

**Objetivo:** mantener continuidad para el comprador si cambia el operador.

**Flujo principal:**

1. Una conversacion esta asignada a un responsable.
2. Un administrador reasigna o el responsable transfiere la atencion.
3. El nuevo responsable ve historial, pedido activo, pagos y estado de
   comprobante.
4. El comprador continua en el mismo chat.

**Validaciones:**

- Otros usuarios deben ver quien atiende para evitar respuestas o cobros dobles.
- Reasignar no debe cambiar estado de pedido ni pago.
- La reasignacion queda auditada.

**Edge cases:**

- Responsable se desconecta con pedido confirmado: permitir reasignacion por
  administrador.
- Dos usuarios intentan tomar el chat al mismo tiempo: solo uno debe quedar
  asignado.
- Usuario sin permiso intenta cobrar despues de tomar: bloquear cobro aunque
  pueda conversar si la configuracion lo permite.

### UC-22 Usuario no autorizado afecta el flujo del comprador

**Objetivo:** asegurar que el comprador no reciba acciones invalidas de roles sin
permiso.

**Flujo principal:**

1. Un mozo u otro rol sin permiso intenta acceder a ventas por WhatsApp.
2. Kogoz bloquea acceso a bandeja, chat y acciones sensibles.
3. Solo administrador o cajero autorizado puede atender, cobrar y emitir.

**Validaciones:**

- El bloqueo debe aplicar en UI y servidor.
- Las acciones sensibles no deben depender solo de ocultar botones.

**Edge cases:**

- Usuario con permiso para responder pero no cobrar: puede conversar, pero el
  cobro debe transferirse a usuario autorizado.
- Usuario desactivado o de otra empresa: no debe ver conversaciones ni datos.

### UC-23 Comprador envia media, ubicacion o mensajes no textuales

**Objetivo:** no perder informacion relevante enviada por WhatsApp.

**Flujo principal:**

1. El comprador envia imagen, audio, documento, ubicacion o constancia.
2. Si el tipo esta soportado, Kogoz lo muestra en el thread y permite asociarlo a
   pago o contexto.
3. Si no esta soportado, Kogoz lo registra como mensaje no procesable y permite
   al responsable pedir informacion por texto.

**Validaciones:**

- La falta de soporte de media no debe romper la conversacion.
- Evidencia de pago soportada debe vincularse a `ChatPayment`.
- Los archivos deben tratarse como informacion sensible.

**Edge cases:**

- Audio contiene todo el pedido: el responsable puede escucharlo si esta
  soportado; si no, debe pedir resumen por texto.
- Imagen de comprobante de pago ilegible: pago queda por validar.
- Documento con datos personales: acceso solo a usuarios autorizados.

### UC-24 Mensajes duplicados o desordenados del proveedor

**Objetivo:** mantener consistencia aunque WhatsApp entregue eventos imperfectos.

**Flujo principal:**

1. El proveedor envia eventos duplicados, tardios o fuera de orden.
2. Kogoz aplica idempotencia por proveedor, cuenta y mensaje/evento externo.
3. El thread muestra el orden mas claro posible.
4. Los efectos de negocio se ejecutan una sola vez.

**Validaciones:**

- Un mismo mensaje no debe crear dos conversaciones.
- Una misma confirmacion no debe confirmar dos pedidos.
- Una misma evidencia no debe registrar pagos duplicados.

**Edge cases:**

- Llega confirmacion antes que el resumen por retraso del proveedor: no confirmar
  automaticamente; requerir revision.
- Llega estado de delivery despues de reintento: actualizar el mensaje correcto.
- Llega pago duplicado por reenvio de imagen: advertir posible duplicado.

### UC-25 Canal no disponible o configuracion incompleta

**Objetivo:** evitar una experiencia operativa falsa cuando el canal no puede
atender ventas.

**Flujo principal:**

1. Un administrador entra al modulo con WhatsApp no configurado o desactivado.
2. Kogoz bloquea la bandeja y muestra accion de configuracion.
3. Si el canal se activa, empiezan a ingresar conversaciones.

**Validaciones:**

- No se debe permitir tomar, responder, cobrar ni emitir desde un canal no
  configurado.
- La configuracion del canal requiere permisos de administrador.

**Edge cases:**

- Credenciales vencidas o webhook invalido: mostrar estado `Requiere revision`.
- Canal configurado para otra empresa: bloquear por tenant isolation.
- Se desactiva el canal con conversaciones abiertas: impedir nuevos envios y
  mostrar alerta operativa para resolver o transferir.

## Matriz de cobertura funcional

| Area funcional | Casos que la validan |
| --- | --- |
| Recepcion de conversaciones | UC-01, UC-02, UC-24, UC-25 |
| Bandeja, toma y reasignacion | UC-00, UC-01, UC-21, UC-22 |
| Conversacion sin pedido | UC-03, UC-19, UC-23 |
| Pedido activo unico | UC-04, UC-05, UC-20 |
| Stock y disponibilidad | UC-04, UC-06, UC-15 |
| Entrega o recojo | UC-07, UC-08 |
| Comprobantes simples y boleta | UC-09, UC-15, UC-16 |
| Factura y datos fiscales | UC-10, UC-15, UC-18 |
| Confirmacion del comprador | UC-05, UC-11, UC-24 |
| Pago conversacional | UC-12, UC-13, UC-14 |
| Cierre POS | UC-00, UC-15, UC-18 |
| Envio y reenvio por WhatsApp | UC-15, UC-16, UC-19 |
| Cancelacion y abandono | UC-17, UC-18 |
| Seguridad, permisos y auditoria | UC-21, UC-22, UC-25 |
| Idempotencia y eventos imperfectos | UC-01, UC-16, UC-24 |

## Edge cases transversales que deben probarse

- Dos empresas reciben mensajes del mismo telefono: los datos no se cruzan.
- Dos usuarios autorizados intentan tomar la misma conversacion al mismo tiempo.
- Un usuario sin caja abierta intenta cobrar un pedido confirmado.
- Un usuario con rol mozo intenta abrir la bandeja de ventas por WhatsApp.
- El comprador confirma, pero el stock final ya no alcanza.
- El comprador paga menos que el total.
- El comprador paga mas que el total.
- El comprador envia una referencia de pago ya usada.
- El comprador pide factura con datos incompletos.
- El comprobante se emite, pero falla el envio por WhatsApp.
- El envio del resumen falla y luego se reintenta.
- El webhook entrega el mismo mensaje dos veces.
- El comprador escribe despues de que la conversacion fue resuelta.
- El comprador pide un nuevo pedido cuando ya existe un pedido activo.
- El canal se desactiva con conversaciones abiertas.
- El comprador envia media no soportada como unica descripcion del pedido.

## Decisiones pendientes que afectan QA

- Definir si delivery entra en el MVP o queda detras de configuracion.
- Definir si pago contra entrega o recojo esta permitido en el MVP.
- Definir si multiples pagos parciales pueden sumar el total o si todo pago
  parcial queda bloqueado.
- Definir soporte MVP para imagenes, audios, documentos y ubicaciones entrantes.
- Definir la ventana exacta de reapertura de conversaciones cerradas.
- Definir que roles pueden reasignar conversaciones.
- Definir formato de entrega del comprobante: PDF, URL firmada o ambos.
- Definir politica de retencion de mensajes, media y comprobantes.
