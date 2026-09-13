# Especificacion de producto: ventas por WhatsApp en Kogoz

Fecha: 2026-06-27

## Resumen ejecutivo

Ventas por WhatsApp permite que un negocio atienda compradores desde WhatsApp y cierre la venta dentro de Kogoz sin cambiar de canal. El comprador escribe, conversa, confirma su pedido, paga y recibe su comprobante en el mismo chat. El administrador o cajero trabaja desde una consola simple con tres espacios: bandeja de conversaciones, chat y pedido.

El MVP recomendado es una atencion asistida por administrador o cajero. No se busca que un bot tome decisiones ni cierre ventas automaticamente. El responsable mantiene el control del pedido, resuelve dudas, confirma disponibilidad, registra el pago y envia el comprobante.

El resultado esperado es reducir doble digitacion, evitar errores al copiar datos entre WhatsApp y el POS, y dejar trazabilidad de cada conversacion, pedido, pago y comprobante.

## Decision recomendada

Construir el MVP como **bandeja de ventas por WhatsApp asistida por administrador o cajero**.

Por que:

- Minimiza friccion para el comprador: escribe, confirma, paga y recibe el comprobante por WhatsApp.
- Minimiza friccion para el responsable: atiende, arma el pedido y cobra desde un solo lugar.
- Reduce riesgo operativo frente a un bot automatico: el responsable decide ante cambios, dudas, falta de stock o datos incompletos.
- Aprovecha el flujo actual de productos, clientes, pagos, caja, comprobantes y stock.
- Ordena la operacion antes de automatizar.

Alternativas evaluadas:

| Alternativa | Ventajas | Costos / riesgos | Decision |
| --- | --- | --- | --- |
| Bandeja asistida por administrador o cajero | Menor alcance, control humano, buena trazabilidad | Depende de la capacidad del equipo para responder | Recomendada para MVP |
| Link de catalogo o carrito enviado por WhatsApp | Ordena mejor la compra y puede escalar mas | Agrega friccion al comprador y requiere una experiencia web adicional | Fase posterior |
| Bot que arma pedidos | Puede atender mas volumen | Alto riesgo en stock, precios, datos fiscales, pagos y excepciones | No recomendado para MVP |

## Objetivos

- Recibir conversaciones de compradores que escriben al WhatsApp del negocio.
- Mostrar esas conversaciones en una bandeja para administradores y cajeros.
- Permitir que un administrador o cajero tome o reciba asignada una conversacion.
- Crear un pedido desde la conversacion sin salir de la atencion.
- Agregar productos, cantidades, notas, cliente, tipo de comprobante y datos de entrega o recojo.
- Enviar un resumen del pedido al comprador para confirmar.
- Registrar el pago completo con su medio de pago y referencia cuando aplique.
- Crear la venta en Kogoz, descontar stock y generar el comprobante segun el flujo actual.
- Enviar el comprobante por WhatsApp en el mismo chat.
- Mantener historial de mensajes, cambios importantes, responsable de atencion, pedido, pago y comprobante.

## No objetivos del MVP

- Atencion automatica sin responsable humano.
- Catalogo publico navegable por el comprador.
- Link de pago o conciliacion bancaria automatica.
- Campanas masivas de marketing.
- Gestion avanzada de repartidores.
- Reapertura o respuesta inteligente con IA.

## Personas

| Persona | Necesidad | Exito para esa persona |
| --- | --- | --- |
| Comprador | Pedir por WhatsApp, confirmar rapido, pagar y recibir comprobante | No repetir datos ni cambiar de canal |
| Administrador | Configurar el canal, usuarios, permisos y mensajes | Control operativo y trazabilidad |
| Cajero | Atender, armar pedido, cobrar y enviar comprobante sin salir de Kogoz | Menos doble digitacion y menos errores |
| Mozo | Tomar pedidos presenciales desde su flujo habitual | No necesita entrar al chat de WhatsApp |
| Operacion o delivery | Tener datos claros de entrega o recojo y estado del pedido | Menos pedidos incompletos |

## Flujo funcional recomendado

1. El comprador escribe al WhatsApp del negocio.
2. Kogoz registra la conversacion y la muestra en la bandeja de ventas por WhatsApp.
3. La conversacion aparece como pendiente de atencion.
4. Un administrador o cajero toma la conversacion.
5. El sistema muestra quien esta atendiendo para evitar que dos personas respondan o cobren el mismo pedido.
6. El responsable conversa con el comprador.
7. Desde el chat, el responsable crea un pedido en armado.
8. El telefono y nombre de WhatsApp ayudan a prellenar los datos del contacto.
9. El responsable agrega productos, cantidades, notas, comprobante y datos de entrega o recojo.
10. El responsable envia un resumen del pedido para que el comprador confirme.
11. Si el comprador pide cambios, el responsable ajusta el pedido y vuelve a enviar el resumen.
12. Cuando el comprador confirma, el pedido queda confirmado.
13. El responsable registra el pago.
14. Para billetera digital o transferencia, el responsable registra una referencia, codigo u observacion.
15. Si el pago cubre el total y el responsable puede cobrar, Kogoz crea la venta.
16. El sistema descuenta stock y genera el comprobante que corresponda.
17. Cuando el comprobante esta listo, Kogoz lo envia por WhatsApp.
18. El chat deja visible que el comprobante fue enviado.
19. El responsable cierra la conversacion como resuelta.

## Reglas de negocio

- Cada negocio atiende desde su propio WhatsApp configurado.
- Un chat puede tener pedidos historicos, pero solo un pedido activo a la vez.
- Conversar y armar un pedido no requiere caja abierta.
- Cobrar y crear la venta si requiere que el usuario responsable pueda cobrar.
- Solo usuarios autorizados pueden tomar conversaciones, crear pedidos, registrar pagos, emitir comprobantes o reasignar atenciones.
- El pago debe cubrir el total del pedido antes de generar el comprobante.
- Para billeteras digitales o transferencias se debe registrar una referencia, codigo u observacion cuando exista.
- Para factura se requiere cliente con RUC y datos fiscales completos.
- Para boleta se solicita DNI cuando la politica tributaria o el monto lo requiera.
- Si el comprobante no requiere datos fiscales, el camino debe ser rapido y de baja friccion.
- El stock se valida al agregar productos y nuevamente antes de cerrar la venta.
- No se envia comprobante si faltan datos obligatorios o si no pudo generarse.
- Si el comprobante fue emitido pero no se pudo enviar por WhatsApp, el responsable puede reenviarlo.
- Si el comprador escribe despues de cerrar una conversacion, Kogoz puede reabrirla o crear una nueva atencion segun la configuracion del negocio.
- Los mensajes, cambios relevantes, pagos y comprobantes deben quedar en el historial.

## Estados visibles del producto

Los estados deben mostrarse con lenguaje operativo y comprensible para el equipo. No deben exponerse nombres internos ni codigos tecnicos.

### Conversacion

| Estado visible | Significado |
| --- | --- |
| Sin atender | El comprador escribio y nadie tomo la conversacion |
| En atencion | Un administrador o cajero esta atendiendo el chat |
| Esperando comprador | El responsable respondio y espera una respuesta |
| Con pedido | La conversacion tiene un pedido activo |
| Resuelta | La atencion fue cerrada |
| Reabierta | El comprador escribio despues del cierre |
| Requiere revision | Hay un problema operativo que necesita accion del equipo |

### Pedido

| Estado visible | Significado |
| --- | --- |
| En armado | El responsable esta preparando el pedido |
| Resumen enviado | El comprador recibio el resumen para confirmar |
| Confirmado | El comprador acepto productos, total y condiciones |
| Esperando pago | Falta registrar o validar el pago |
| Pagado | El pago cubre el total y fue aceptado |
| Completado | La venta fue creada en Kogoz |
| Cancelado | El pedido fue descartado |

### Pago

| Estado visible | Significado |
| --- | --- |
| Pendiente | Aun no se registro pago |
| Por validar | El responsable registro pago, pero requiere revision |
| Incompleto | El monto registrado no cubre el total |
| Aceptado | El pago cubre el total y puede cerrar la venta |
| Rechazado | El pago no fue aceptado |
| Devuelto | El pago fue reversado o devuelto |

### Comprobante

| Estado visible | Significado |
| --- | --- |
| No solicitado | Todavia no corresponde generar comprobante |
| Faltan datos | Falta informacion del cliente o del comprobante |
| En preparacion | Kogoz esta generando el comprobante |
| Emitido | El comprobante fue generado correctamente |
| Enviado | El comprador recibio el comprobante por WhatsApp |
| No enviado | Hubo un problema al enviarlo y se puede reintentar |
| Anulado | El comprobante fue anulado |

## UX del comprador

| Etapa | Experiencia esperada |
| --- | --- |
| Inicio | Escribe al WhatsApp del negocio y recibe una confirmacion o saludo si esta habilitado |
| Atencion | Un responsable responde sin pedirle cambiar de canal |
| Pedido | Indica productos, cantidades, delivery o recojo y tipo de comprobante |
| Confirmacion | Recibe resumen con productos, total, forma de entrega y comprobante |
| Pago | Envia constancia o confirma el medio de pago |
| Comprobante | Recibe el comprobante en el mismo chat |
| Cierre | Puede responder en el mismo hilo si necesita soporte |

## UX del administrador o cajero

| Etapa | Accion principal |
| --- | --- |
| Bandeja | Ve conversaciones pendientes, propias, todas y cerradas |
| Toma | Toma una conversacion para atenderla |
| Conversacion | Responde y consulta el historial completo |
| Pedido | Agrega productos desde un buscador y arma el carrito |
| Datos | Vincula o crea cliente y captura entrega o recojo |
| Confirmacion | Envia resumen al comprador |
| Pago | Registra medio, monto y referencia |
| Comprobante | Genera, envia y ve si el comprobante llego |
| Cierre | Marca la conversacion como resuelta |

## Interfaz propuesta

El modulo de ventas por WhatsApp debe vivir dentro del panel operativo de Kogoz.

### Escritorio

Estructura de tres paneles:

- Izquierda: bandeja de conversaciones.
- Centro: chat.
- Derecha: pedido, pago y comprobante.

```text
+----------------+------------------------------------------+-------------------+
| CHATS          | CHAT                                     | PEDIDO            |
| [Pend][Mios]   | Juan Perez +51 999 999 999 [Tomar] [...]| Estado: En armado |
| [Buscar...]    +------------------------------------------+ [Nota][Bol][Fac]  |
|                | Cliente: Hola, quiero 2 pollos          | Cliente           |
| * Juan     2   | Cajero: Claro, se lo preparo            | [Cliente General] |
|   Espera pago  | Sistema: Pedido creado                  | [+ Nuevo]         |
|                | Cliente: pago con Yape                  |                   |
| o Maria        |                                          | Productos         |
|   Sin atender  |                                          | [Buscar producto] |
|                |                                          | - Pollo x2 S/40   |
| v Luis         |                                          | - Gaseosa x1 S/8  |
|   Resuelta     |                                          |                   |
|                |                                          | Total: S/48.00    |
|                +------------------------------------------+ [Registrar pago]  |
|                | [Respuesta rapida] [Escribir...] [Enviar]| [Enviar comp.]    |
+----------------+------------------------------------------+-------------------+
```

### Movil

Flujo por pantallas:

- Chats
- Chat
- Pedido

```text
+----------------------------+
| WhatsApp Ventas        [S] |
+----------------------------+
| [Pendientes] [Mios] [Todos]|
|                            |
| * Juan Perez          2    |
|   "pago con Yape"          |
|   Esperando pago - 10:42   |
|                            |
| o Maria Lopez              |
|   "precio de pollo?"       |
|   Sin atender - 10:40      |
+----------------------------+
| Chats      Chat     Pedido |
+----------------------------+
```

### Estados vacios y alertas

- Sin conversaciones: `No hay conversaciones por atender`.
- Sin conversacion seleccionada: invitar a elegir una conversacion.
- Pedido vacio: `Agrega productos desde el buscador`.
- Sin caja abierta: mostrar aviso bloqueante para cobrar.
- WhatsApp no configurado: mostrar aviso persistente con accion para configurar.
- Mensaje no enviado: mostrar error y accion para reenviar.
- Comprobante no enviado: mostrar accion para reintentar.
- Cargando informacion: mostrar placeholders claros en lista, chat y pedido.

### Accesibilidad y usabilidad

- Navegacion completa por teclado.
- Botones de icono con texto accesible.
- Aviso discreto cuando llegan mensajes nuevos.
- Ventanas y paneles con foco controlado.
- Estados que no dependan solo del color.
- Contraste suficiente para operacion diaria.
- Si el responsable esta leyendo mensajes antiguos, no moverlo automaticamente al ultimo mensaje; mostrar una accion para ir al final.

## Configuracion del negocio

El administrador debe poder:

- Activar o desactivar ventas por WhatsApp.
- Ver que numero de WhatsApp esta conectado al negocio.
- Definir saludo automatico opcional.
- Definir horarios de atencion visibles para el equipo.
- Definir respuestas rapidas.
- Definir quienes pueden atender, cobrar, emitir comprobantes y reasignar conversaciones.
- Mantener a los mozos fuera del chat de WhatsApp.
- Definir tiempo maximo esperado para primera respuesta.
- Definir cuanto tiempo se puede reabrir una conversacion cerrada.

## Permisos por rol

| Rol | Puede hacer |
| --- | --- |
| Administrador | Configurar WhatsApp, ver todas las conversaciones, reasignar, cobrar y emitir |
| Cajero | Atender conversaciones, armar pedidos, cobrar y emitir comprobantes |
| Mozo | Sin acceso al chat de WhatsApp |
| Cocina o barra | Sin acceso en el MVP |

Decision operativa recomendada:

- Administrador y cajero pueden cobrar y emitir comprobantes.
- Mozo no puede ver, tomar ni responder conversaciones de WhatsApp.

## Manejo de excepciones

| Situacion | Comportamiento esperado |
| --- | --- |
| WhatsApp no configurado | Bloquear la bandeja y mostrar accion de configuracion |
| Conversacion duplicada | No duplicar el chat; mantener una sola atencion visible |
| Mensajes desordenados | Mostrarlos en el orden mas claro posible y dejar trazabilidad |
| Producto sin stock | Avisar al responsable y pedir cambio antes de confirmar |
| Pago incompleto | Mantener el pedido esperando pago y bloquear comprobante |
| Referencia de pago repetida | Advertir y pedir revision manual |
| Caja cerrada | Bloquear cobro y ofrecer abrir caja o transferir a cajero |
| Datos fiscales incompletos | Permitir mantener el pedido, pero bloquear el comprobante correspondiente |
| Error al generar comprobante | Mantener la venta visible y permitir reintento |
| Error al enviar comprobante | Mantener comprobante emitido y permitir reenviar |
| Comprador vuelve a escribir | Reabrir la conversacion o crear nueva atencion segun configuracion |

## Seguridad y privacidad

- Solo usuarios autorizados pueden ver conversaciones y datos de compradores.
- El historial debe mostrar quien atendio, quien cobro, quien emitio y quien reenvio comprobantes.
- Los datos personales deben mostrarse solo cuando sean necesarios para la operacion.
- Los comprobantes enviados deben estar disponibles solo para quien corresponde.
- La configuracion del canal debe estar protegida contra cambios accidentales o no autorizados.
- Las acciones sensibles, como cobrar, emitir, anular o reenviar comprobantes, deben quedar auditadas.

## Riesgos de producto y operacion

- **Capacidad de respuesta**: si el equipo demora, se pierden ventas aunque el flujo funcione.
- **Caja y cobro**: solo administradores y cajeros deben poder cerrar ventas por WhatsApp.
- **Comprobantes fiscales**: algunos comprobantes pueden tardar; el responsable necesita ver claramente cuando estan listos.
- **Stock**: si varias personas venden el mismo producto al mismo tiempo, se debe validar antes de cerrar.
- **Datos incompletos**: factura, delivery y pagos requieren datos minimos para evitar errores posteriores.
- **Privacidad**: chats, telefonos, direcciones y comprobantes deben tratarse como informacion sensible.

## Fases de producto

### Fase 1: Recepcion de conversaciones

- Activar ventas por WhatsApp para un negocio.
- Recibir mensajes de compradores.
- Crear conversaciones visibles en la bandeja.
- Evitar conversaciones duplicadas.
- Mostrar mensajes nuevos al equipo.

### Fase 2: Bandeja operativa

- Ver conversaciones pendientes, propias, todas y cerradas.
- Tomar, reasignar y cerrar conversaciones.
- Enviar y recibir mensajes de texto.
- Mostrar errores de envio y permitir reintento.

### Fase 3: Pedido desde el chat

- Crear pedido desde una conversacion.
- Buscar y agregar productos.
- Modificar cantidades y notas.
- Vincular o crear cliente.
- Capturar tipo de comprobante y entrega o recojo.
- Enviar resumen del pedido por WhatsApp.

### Fase 4: Cobro asistido

- Registrar medio de pago, monto y referencia.
- Validar si el usuario puede cobrar.
- Bloquear cierre si el pago no cubre el total.
- Crear la venta en Kogoz cuando el pedido y pago esten listos.
- Descontar stock.

### Fase 5: Comprobante por WhatsApp

- Generar el comprobante de la venta.
- Esperar datos fiscales completos cuando aplique.
- Enviar el comprobante al comprador por WhatsApp.
- Mostrar si fue enviado o si requiere reintento.

### Fase 6: Control operativo y mejora

- Completar auditoria operativa.
- Revisar permisos por rol.
- Agregar respuestas rapidas.
- Agregar horarios de atencion.
- Preparar mejoras futuras como plantillas, catalogo o automatizacion parcial.

## Criterios de aceptacion MVP

- Dado un mensaje entrante al WhatsApp del negocio, se crea una conversacion visible para ese negocio.
- Dado un mensaje repetido, no se duplica la conversacion ni el mensaje visible.
- Dado un administrador o cajero autorizado, puede tomar una conversacion disponible.
- Dado un chat tomado, otros usuarios autorizados ven quien lo esta atendiendo.
- Dado un chat activo, el responsable puede enviar y recibir mensajes.
- Dado un chat activo, el responsable puede crear un pedido.
- Dado un pedido, el responsable puede agregar productos y modificar cantidades.
- Dado un pedido con factura, Kogoz exige cliente fiscal valido.
- Dado un pedido confirmado sin permiso o caja para cobrar, Kogoz bloquea el cobro.
- Dado un pedido confirmado con pago total, Kogoz crea la venta.
- Dado una venta creada, Kogoz genera el comprobante y lo vincula al chat.
- Dado un comprobante listo, Kogoz lo envia al mismo chat.
- Dado un fallo de envio, Kogoz muestra el error y permite reintentar.
- Dado una conversacion cerrada, un usuario autorizado puede encontrarla en el historial.
- Dado un mozo autenticado, no puede ver, tomar ni responder conversaciones de WhatsApp.

## Preguntas abiertas

- El numero de WhatsApp se conectara con un flujo guiado o lo configurara soporte al inicio?
- Solo administradores y cajeros podran cobrar ventas por WhatsApp desde el MVP?
- Para boletas y facturas, el comprobante se envia solo cuando este completamente listo?
- Se permitiran pagos parciales en WhatsApp o el MVP exige pago completo?
- Delivery entra en el MVP con direccion y referencia, o solo venta con recojo?
- Que roles exactos podran reasignar conversaciones?
- Cuanto tiempo debe mantenerse una conversacion tomada si el responsable no responde?

## Conclusiones

El MVP debe priorizar trazabilidad y control humano. La decision clave es separar la conversacion del pedido: la conversacion es la atencion y el historial; el pedido, pago y comprobante tienen su propio avance operativo. Esto evita cerrar ventas incorrectas cuando el comprador demora, cambia productos, envia pagos incompletos o faltan datos para el comprobante.

La ruta recomendada es construir primero la bandeja de conversaciones, luego el pedido desde el chat, despues el cobro asistido y finalmente el envio del comprobante por WhatsApp.
