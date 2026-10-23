# Nombre de cliente y liberar en pedidos sin mesa: definición de producto

**Estado:** definición lista para implementar. Complementa `docs/design/delivery-en-mesas.md` (pedidos sin mesa dentro de Mesas). Hoy un pedido Para llevar se abre con un toque, sin ningún dato; el delivery ya pide un «Nombre» opcional junto al teléfono y la dirección. Origen: tarea de Todoist 6hqGHwQ57JVjVmHp «Para llevar / delivery: nombre de cliente y liberar», observación 6 del feedback de salón de octubre de 2026. 23/10/2026. La memoria del repositorio no está inicializada; el contexto sale de los documentos y de la aplicación.

## Problema y situación

Un viernes a las 9:40 p. m. llegan al mostrador tres clientes que piden para llevar. El mozo toca **Para llevar** tres veces y toma cada pedido; en la sección «Delivery y para llevar» aparecen tres tarjetas iguales, «Para llevar · Desde las 21:40», y la única forma de distinguirlas es abrirlas una por una. En cocina sale la comanda con «Para llevar: 55C3A1D2», un código que nadie dijo en voz alta, así que el cocinero no sabe a quién llamar cuando la bolsa está lista. Hoy el mozo lo resuelve escribiendo el nombre del cliente como nota de un producto: en la comanda de la foto, «Obs: Wiwano» debajo de la pachamanca. El nombre queda escondido entre las notas de preparación y depende de que el mozo se acuerde de hacerlo. Además, en la pantalla del pedido el botón para descartarlo dice «Liberar mesa» y los mensajes de error hablan de «la mesa» aunque no hay ninguna.

## Objetivo

Que cada pedido Para llevar y Delivery se reconozca por el nombre del cliente en la tarjeta, en la toma de pedido, en el cobro y en la comanda, y que ningún texto de un pedido sin mesa hable de «mesa». Hipótesis: si funciona, el mozo deja de usar las notas de producto para anotar el nombre. Se verá en que la mayoría de los pedidos Para llevar del día tienen nombre del cliente y en que, al revisar comandas de Para llevar de una semana, casi ninguna nota de producto es solo un nombre.

## Roles y superficies

| Rol | Necesidad | Superficie |
| --- | --- | --- |
| Mozo o cajero abriendo un pedido Para llevar en el mostrador con el cliente delante | Anotar a nombre de quién va y pasar a tomar el pedido sin perder tiempo | Tablet o celular en mano, o el terminal de caja |
| Mozo o cajero buscando un pedido en la sección «Delivery y para llevar» | Encontrar la tarjeta del cliente que pregunta por su pedido | Vista de Mesas, en cualquier dispositivo |
| Cocina armando la bolsa | Saber a nombre de quién va cada comanda para llamarlo o rotular la bolsa | Solo la comanda impresa: no hay pantalla de cocina |
| Mozo, cajero o administrador revisando comandas que no se imprimieron | Saber de qué pedido es cada comanda pendiente para reimprimirla | Diálogo «Impresiones pendientes» dentro de Mesas |
| Cajero cobrando o cerrando turno | Reconocer el pedido en el cobro y en el aviso de pedidos sin cobrar | Terminal de caja |

## Alcance de la primera versión

- Campo «Nombre del cliente» para Para llevar, pedido al abrir el pedido en una hoja corta y editable después desde la toma de pedido.
- El mismo concepto y texto de campo en Delivery, que ya lo tiene.
- Una etiqueta del pedido sin mesa, con el nombre o, sin nombre, con la hora de apertura, usada igual en: tarjeta, toma de pedido, cobro, confirmación de envío, comanda impresa, diálogo «Impresiones pendientes», aviso de pedidos sin cobrar del cierre de turno y lista «Entregados hoy».
- La comanda deja de imprimir el código interno del pedido.
- Ningún texto visible de un pedido Para llevar o Delivery dice «mesa»: botón de liberar, rechazos al liberar, al guardar el pedido, al enviarlo y al agregar productos, rechazos del cobro y avisos de la página del pedido.
- Roles: los que hoy atienden mesas (`tables:update`). Todos los tipos de negocio con la función de restaurante.

La navegación que vuelve a Mesas al elegir Para llevar o Delivery (observación 5) es otra tarea; este diseño no cambia a dónde lleva cada botón, solo intercala la hoja del nombre antes de la toma de pedido.

## Fuera de esta versión

- Teléfono u otros datos del cliente en Para llevar: cuando un negocio pida avisar por teléfono que el pedido está listo.
- Vincular el nombre con el catálogo de clientes o con el cliente del comprobante: cuando se pida precargar la boleta con el cliente del pedido.
- Número corto y legible de pedido o de comanda (el encabezado de la comanda imprime hoy el identificador completo de la comanda, largo pero completo): cuando exista una numeración correlativa de pedidos.
- Pantalla de cocina: cuando se defina una superficie fija para cocina; usará la misma etiqueta del pedido.
- Conflicto por campo en la hoja de Delivery (hoy rechaza la edición si cambió cualquier cosa del pedido): cuando se reporte que editar un delivery falla en hora punta.
- Navegación de Para llevar y Delivery de vuelta a Mesas (observación 5): tarea propia.

Ninguno de estos puntos puede causar pérdida de dinero, duplicados ni comprobantes errados.

## Flujo

Abrir un pedido Para llevar:

1. El mozo toca **Para llevar** en Mesas.
2. Se abre la hoja «Nuevo pedido para llevar» con un solo campo, «Nombre del cliente», con el cursor ya puesto.
3. Escribe «Rosa» y toca **Continuar al pedido** o la tecla de confirmar del teclado. Se crea el pedido y se abre la toma de pedido con el título «Para llevar · Rosa».
4. Toma el pedido y toca **Enviar pedido**. Ve «Pedido de Rosa enviado» y la comanda sale con «Para llevar: Rosa».
5. La tarjeta muestra «Rosa» con «Para llevar · desde las 9:40 p. m.».

Caminos alternativos:

- Sin nombre: deja el campo vacío y confirma. El pedido se abre con título «Para llevar»; la comanda sale con «Para llevar: pedido de las 9:40 p. m.».
- Cierra la hoja sin confirmar: no se crea ningún pedido.
- Respuesta dudosa al abrir: la hoja sigue abierta con el nombre escrito; volver a tocar **Continuar al pedido** abre el pedido que ya se hubiera creado, nunca uno segundo. Si en cambio cierra la hoja, Mesas se actualiza y muestra la tarjeta del pedido que pudo haberse creado; si quedó vacío, se quita con **Liberar pedido**.
- Corregir el nombre: en la toma de pedido toca el lápiz junto al título, «Editar nombre del cliente». Se abre la misma hoja con el nombre cargado y **Guardar nombre**. La tarjeta, los títulos y Mesas muestran el nombre nuevo; las comandas ya impresas no cambian y **Reimprimir** saca el nombre nuevo.
- Descartar un pedido vacío: con el pedido sin productos, toca **Liberar pedido** (Para llevar) o **Liberar delivery** (Delivery). El pedido se cierra, su tarjeta desaparece y vuelve a Mesas.

Delivery mantiene su flujo: la hoja «Nuevo delivery» pide teléfono, dirección, referencia, nombre del cliente y envío.

## Pantallas

**Etiqueta del pedido en cada superficie.** La hora es siempre la de apertura del pedido, en America/Lima, en el formato de 12 horas que la comanda ya usa en su encabezado: «9:40 p. m.».

| Superficie | Para llevar con nombre | Para llevar sin nombre | Delivery con nombre | Delivery sin nombre |
| --- | --- | --- | --- | --- |
| Tarjeta: título / subtítulo | «Rosa» / «Para llevar · desde las 9:40 p. m.» | «Para llevar» / «Desde las 9:40 p. m.» | «Ana» / «987 654 321» | «987 654 321» / sin subtítulo |
| Toma de pedido y cobro: título | «Para llevar · Rosa» | «Para llevar» | «Delivery · Ana» | «Delivery · 987 654 321» |
| Confirmación al enviar | «Pedido de Rosa enviado» | «Pedido para llevar enviado» | «Pedido de Ana enviado» | «Pedido de delivery enviado» |
| Comanda impresa: línea del pedido | «Para llevar: Rosa» | «Para llevar: pedido de las 9:40 p. m.» | «Delivery: Ana» | «Delivery: pedido de las 8:15 p. m.» |
| «Impresiones pendientes» | «Para llevar · Rosa · Cocina» | «Para llevar · pedido de las 9:40 p. m. · Cocina» | «Delivery · Ana · Cocina» | «Delivery · pedido de las 8:15 p. m. · Cocina» |
| Aviso de pedidos sin cobrar | «Para llevar · Rosa · Pendiente» | «Para llevar · pedido de las 9:40 p. m. · Pendiente» | «Delivery · Ana · Despachado» | «Delivery · 987 654 321 · Pendiente» |
| «Entregados hoy»: título | «Para llevar · Rosa» | «Para llevar · pedido de las 9:40 p. m.» | «Delivery · Ana» | «Delivery · 987 654 321» |

- La confirmación de envío de una mesa no cambia: «Pedido de Mesa 4 enviado». Su descripción sigue siendo «Cocina y barra ya pueden prepararlo.».
- La comanda y el diálogo «Impresiones pendientes» nunca muestran el teléfono: el diálogo repite lo que dice el papel para que se reconozca la misma comanda.
- En el aviso de pedidos sin cobrar, el estado sigue siendo «Pendiente», «Despachado» o «Entregado». Un Delivery sin nombre deja de aparecer como «Para llevar».
- «Entregados hoy» mantiene la hora de cierre y la dirección del delivery que ya muestra; la hora de cierre pasa también al formato de 12 horas («10:15 p. m.») y su columna se ensancha para que no se parta.
- En todas las superficies un nombre largo se parte en varias líneas; nunca se recorta con puntos suspensivos. En el aviso de cierre de turno el monto queda alineado a la derecha de la primera línea.

**Hoja «Nuevo pedido para llevar»:**
- Entrada: Mesas → **Para llevar**. Roles con `tables:update` (mozo, cajero, vendedor, administrador). El botón **Para llevar** solo abre la hoja: ya no muestra indicador de carga, que pasa a **Continuar al pedido**.
- Panel inferior en celular y tablet, centrado en escritorio, igual que la hoja «Nuevo delivery».
- Título «Nuevo pedido para llevar»; descripción «¿A nombre de quién? Así se ve en la tarjeta y en la comanda.»
- Campo «Nombre del cliente», opcional, cursor puesto al abrir, sin autocompletado del navegador (el dispositivo es compartido y la lista sugerida taparía el botón). Ayuda: «Si lo dejas vacío, se muestra la hora del pedido.»
- Límite de 120 caracteres: al escribir, el campo no acepta más; al pegar un texto más largo, se conservan los primeros 120 y aparece debajo «Se recortó a 120 caracteres.».
- La tecla de confirmar del teclado del celular dice «Ir» y equivale a **Continuar al pedido**.
- Acción principal: **Continuar al pedido**, de al menos 48 px de alto, activa con el campo vacío. Mientras se crea, el botón muestra el indicador de carga y el campo queda bloqueado.
- Errores dentro de la hoja, con el nombre escrito intacto (ver «Cuando algo falla»).
- Mientras se crea el pedido, la hoja no se puede cerrar, como la hoja de Delivery.
- Cerrar la hoja descarta lo escrito sin confirmación: es un solo campo. Al cerrarla, Mesas se actualiza.
- El aviso «Se recortó a 120 caracteres.» es una advertencia, no un error: se muestra con el estilo del texto de ayuda, nunca con el color de error, y el lector de pantalla lo anuncia al aparecer. El rechazo del servidor «El nombre puede tener hasta 120 caracteres.» sí se muestra como error.

**Hoja «Nombre del cliente» (edición de Para llevar):**
- Entrada: toma de pedido de un Para llevar → lápiz en el encabezado, en el mismo lugar y con el mismo tamaño (44 px) que el lápiz «Editar datos de entrega» de Delivery; etiqueta accesible «Editar nombre del cliente». Solo con `tables:update`.
- Mismo campo, mismas reglas de límite y autocompletado, cargado con el nombre actual. Descripción «Se actualiza en Mesas. Las comandas ya impresas no cambian: usa Reimprimir si cocina necesita el nombre nuevo.» Acción **Guardar nombre**: mientras guarda muestra el indicador de carga, el campo queda bloqueado y la hoja no se puede cerrar. Al guardar bien, la hoja se cierra y aparece la confirmación transitoria «Nombre guardado»; ante un rechazo, la hoja sigue abierta con lo escrito.
- Vaciar el campo y guardar deja el pedido sin nombre.

**Hoja de Delivery (crear y editar):** el campo «Nombre» pasa a llamarse «Nombre del cliente» y deja de usar el autocompletado del navegador. Su ayuda pasa a «Si lo dejas vacío, la tarjeta muestra el teléfono y la comanda la hora del pedido.» Nada más cambia.

**Toma de pedido de un pedido sin mesa:**
- Título según la tabla de etiquetas. El botón de volver sigue diciendo «Mesas», porque es el nombre de la pantalla a la que vuelve; la sección del pedido se anuncia como «Pedido», no «Pedido de la mesa».
- El botón de descartar, visible solo con el pedido sin productos enviados ni por enviar, dice **Liberar pedido** en Para llevar y **Liberar delivery** en Delivery. En una mesa sigue diciendo **Liberar mesa**.
- Los mensajes de rechazo de esta pantalla son los de «Cuando algo falla». La confirmación de **Ver pedido guardado** dice «Se descartarán tus cambios sin guardar para ver el pedido actualizado. ¿Continuar?».

**Cobro:** el encabezado usa el mismo título que la toma de pedido. La acción final de Para llevar cobrado sigue siendo **Entregado · cerrar pedido**; Delivery cobrado sigue sin acción de liberar; la mesa sigue con **Liberar mesa**.

**Comanda impresa:**
- La línea del pedido («Para llevar: Rosa») va en negrita, igual que los productos: es lo que se busca de un vistazo con la bolsa en la mano.
- El encabezado sigue con la fecha y la hora de envío de la ronda («23/10/26, 10:10 p. m.»); la línea del pedido sin nombre lleva la hora de apertura en el mismo formato. En la primera ronda ambas suelen coincidir; en las siguientes difieren, y la línea del pedido conserva la hora de apertura para seguir reconociendo el mismo pedido.
- La línea aparte «Cliente: …» desaparece porque el nombre ya está en la línea del pedido. Las mesas no cambian («Mesa: 4»).
- La comanda sigue sin teléfono, dirección ni precios.

## Reglas

| Aspecto | Comportamiento |
| --- | --- |
| Obligatoriedad | El nombre es opcional en Para llevar y en Delivery. Ninguna acción lo exige. |
| Cuándo se pide | Al abrir el pedido Para llevar, en la hoja. Se puede agregar o corregir después desde la toma de pedido. |
| Hasta cuándo se edita | Mientras el pedido esté abierto, también después de enviar a cocina o de cobrar. Es un rótulo para encontrar el pedido, no un dato del comprobante. |
| Limpieza | Se quitan los espacios al inicio y al final; un nombre de solo espacios cuenta como sin nombre. Máximo 120 caracteres, como en Delivery. Ejemplo: «  Rosa » se guarda como «Rosa». |
| Abrir sin duplicar | Cada vez que se abre la hoja es un solo intento de abrir un pedido. Repetir **Continuar al pedido** en la misma hoja, tras un error o una respuesta dudosa, abre el pedido que ese intento ya creó; nunca crea otro. Cerrar la hoja y volver a tocar **Para llevar** es un pedido nuevo. |
| Conflicto al guardar el nombre | Solo hay conflicto si otro dispositivo cambió el nombre desde que se abrió la hoja. Guardar el mismo nombre que ya está guardado es éxito. Enviar rondas, cobrar o entregar desde otro dispositivo no rechaza el cambio de nombre. |
| Nombre en la comanda | Cada comanda imprime el nombre que el pedido tenía al enviarse la ronda. Una reimpresión usa el nombre actual. |
| Sin nombre en la comanda | Se imprime «pedido de las» y la hora de apertura. El código interno del pedido ya no se imprime. |
| Formato de hora | Las horas de pedidos sin mesa se muestran en 12 horas, como el encabezado de la comanda: «9:40 p. m.». Aplica a la comanda, la tarjeta (que hoy usa «21:40»), «Impresiones pendientes», el aviso de cierre de turno y la hora de cierre de «Entregados hoy». |
| Comprobante | El nombre no se copia al cliente de la boleta o factura ni crea un cliente en el catálogo. El cobro sigue pidiendo sus datos como hoy. |
| Liberar | «Liberar mesa», «Liberar pedido» y «Liberar delivery» hacen lo mismo que hoy: cierran un pedido sin productos y lo quitan de Mesas. Solo cambia el texto según el canal. |
| «Mesa» en pedidos sin mesa | Ningún texto visible de un pedido Para llevar o Delivery dice «mesa». «Mesas», como nombre de la pantalla, sí se mantiene. Las mesas conservan sus textos actuales. |
| Nombres repetidos | Dos pedidos pueden llamarse «Rosa». La tarjeta los distingue por la hora de apertura; no se avisa ni se bloquea. |

## Cuando algo falla

Una acción que no recibe respuesta del servidor muestra siempre el mensaje de duda; la pantalla no intenta distinguir si el pedido llegó a enviarse.

**Abrir Para llevar**

| Situación | Qué ve el usuario | Qué puede hacer |
| --- | --- | --- |
| Éxito | Se abre la toma de pedido con «Para llevar · Rosa» | Tomar el pedido |
| Rechazo: sin permiso o función de restaurante desactivada | La hoja sigue abierta con el nombre escrito y el motivo debajo | Cerrar la hoja o pedir a quien tenga permiso |
| Rechazo: nombre de más de 120 caracteres | «El nombre puede tener hasta 120 caracteres.» debajo del campo, con el texto intacto | Acortar y confirmar |
| Sin respuesta (incluye sin conexión) | «No se recibió la respuesta. Vuelve a tocar Continuar al pedido: si el pedido ya se creó, se abre ese mismo.», nombre intacto | Reintentar sin riesgo de un segundo pedido. Si cierra la hoja, Mesas se actualiza; un pedido vacío que haya quedado se quita con **Liberar pedido** (caso aceptado: no tiene productos, dinero ni comanda) |

**Guardar nombre**

| Situación | Qué ve el usuario | Qué puede hacer |
| --- | --- | --- |
| Éxito, o el nombre ya era ese | «Nombre guardado»; el título cambia | — |
| Rechazo: otro dispositivo cambió el nombre | «Otro dispositivo cambió el nombre a Rosa M. Revisa y vuelve a guardar.», con lo escrito intacto | **Guardar nombre** de nuevo guarda lo escrito |
| Rechazo: otro dispositivo quitó el nombre | «Otro dispositivo quitó el nombre. Revisa y vuelve a guardar.», con lo escrito intacto | **Guardar nombre** de nuevo guarda lo escrito |
| Rechazo: nombre de más de 120 caracteres | «El nombre puede tener hasta 120 caracteres.» debajo del campo | Acortar y guardar |
| Rechazo: el pedido se cerró | «Este pedido ya se cerró.» | **Volver a Mesas** |
| Rechazo: el pedido no existe o es de otra empresa | «Este pedido ya no está disponible.», igual en ambos casos, sin revelar nada más | **Volver a Mesas** |
| Sin respuesta | «No se recibió la respuesta. Vuelve a intentar; guardar de nuevo no duplica nada.», nombre intacto | **Guardar nombre** de nuevo |

**Toma de pedido de un Para llevar o Delivery** (liberar, guardar el pedido, agregar productos y enviar). La columna «Hoy» es el texto actual, que las mesas conservan.

| Situación | Hoy | Qué ve el usuario en un pedido sin mesa | Qué puede hacer |
| --- | --- | --- | --- |
| Otro dispositivo cambió el pedido (al liberar, guardar o enviar) | «La mesa cambió en otro dispositivo. …» | «El pedido cambió en otro dispositivo. Tus cambios siguen aquí; revisa el pedido antes de continuar.» | **Ver pedido guardado** |
| El pedido se cerró en otro dispositivo (liberado, entregado o cerrado) | «La mesa cambió en otro dispositivo. …» | «Este pedido ya se cerró.» | **Volver a Mesas** |
| El pedido ya no admite cambios (cobrado o con comprobante) | «Esta mesa ya no admite cambios en el pedido.» | «Este pedido ya no admite cambios.» | **Volver a Mesas** o abrir el cobro |
| Liberar con productos | «La mesa tiene productos y no se puede liberar.» | «El pedido tiene productos y no se puede liberar.» | Revisar el pedido |
| Dato inválido al liberar | «La mesa no es válida.» | «El pedido no es válido. Vuelve a Mesas y ábrelo de nuevo.» | **Volver a Mesas** |
| Enviar: el pedido ya no está disponible | «La mesa ya no está disponible.» | «Este pedido ya no está disponible.» | **Volver a Mesas** |
| Enviar: otro envío simultáneo | «Otro envío cambió el pedido. Actualiza la mesa y vuelve a intentarlo.» | «Otro envío cambió el pedido. Actualiza el pedido y vuelve a intentarlo.» | **Ver pedido guardado** |
| Guardar el pedido sin respuesta | «No pudimos guardar los cambios. Revisa tu conexión y vuelve a intentar.» | Igual | **Reintentar guardado** |
| Delivery despachado: productos bloqueados | Mensaje actual de productos bloqueados | Igual (no dice «mesa») | — |

**Cobro y página del pedido sin mesa.** Un texto por situación, el mismo por donde se entre:

| Situación | Hoy | Qué ve el usuario en un pedido sin mesa | Qué puede hacer |
| --- | --- | --- | --- |
| El pedido se cerró (al abrir la toma de pedido, el cobro o la hoja de nombre) | «Este pedido ya se cerró.» con «Volver a mesas» | «Este pedido ya se cerró.» | **Volver a Mesas** |
| El pedido no existe o es de otra empresa (toma de pedido, hoja de nombre) | «No encontramos este pedido.» | «Este pedido ya no está disponible.» | **Volver a Mesas** |
| Cobro: el pedido no tiene cuenta | «Esta mesa no tiene una cuenta disponible.» | «Este pedido ya no está disponible.» | **Volver a Mesas** |
| Cobro: no se encuentra la cuenta al cobrar | «No se encontró la cuenta de esta mesa.» | «Este pedido ya no está disponible.» | **Volver a Mesas** |

**Otros**

| Situación | Qué ve el usuario | Qué puede hacer |
| --- | --- | --- |
| La impresora de cocina falla | Igual que hoy: la comanda aparece en «Impresiones pendientes» con su etiqueta y **Reimprimir**; la reimpresión lleva el nombre actual | Reimprimir |

## Quién ve y hace qué

| Rol | Puede ver | Puede hacer | No puede |
| --- | --- | --- | --- |
| ADMIN, CASHIER, WAITER | El nombre en tarjeta, toma de pedido, cobro, «Impresiones pendientes» y «Entregados hoy»; ADMIN y CASHIER también en el aviso de cierre de turno (WAITER no cierra turnos) | Abrir Para llevar con nombre, editarlo, liberar pedidos vacíos | — |
| SELLER | El nombre en tarjeta, toma de pedido, «Impresiones pendientes», «Entregados hoy» y el aviso de cierre de turno | Abrir Para llevar con nombre, editarlo, liberar pedidos vacíos | Entrar al cobro de pedidos sin mesa (como hoy) |
| KITCHEN, BARTENDER | El nombre en la comanda impresa | — | Editar el nombre o liberar pedidos |

El nombre no es un dato sensible: se imprime en la comanda que circula por cocina. No se agrega ninguna protección.

## Información que se guarda

- El nombre del cliente es parte del pedido y vale solo para ese pedido: no modifica el catálogo de clientes ni el comprobante. Dónde se guarda para Para llevar se resuelve en la arquitectura, alineado con el nombre que Delivery ya guarda.
- Solo se guarda el último nombre; no hay historial de cambios.
- Cada comanda impresa conserva el nombre con que salió; la tarjeta, «Impresiones pendientes» y las reimpresiones muestran el nombre actual.
- Los pedidos Para llevar abiertos antes de este cambio quedan sin nombre y se muestran con su hora de apertura; se les puede agregar el nombre desde la toma de pedido.

## Vocabulario

- Nombre del cliente: a nombre de quién va un pedido Para llevar o Delivery. Texto visible «Nombre del cliente». No es el cliente del comprobante.
- Etiqueta del pedido: cómo se nombra un pedido sin mesa en cada superficie; el nombre del cliente o, sin él, la hora de apertura (Delivery sin nombre usa el teléfono donde se puede mostrar).
- Liberar: cerrar un pedido que no tiene productos para quitarlo de Mesas. Se nombra por lo que libera: «Liberar mesa», «Liberar pedido» (Para llevar), «Liberar delivery».

## Decisiones cerradas

| Decisión | Por qué |
| --- | --- |
| El nombre de Para llevar se pide en una hoja al abrir el pedido | La comanda se imprime al enviar; si el nombre se pide después, sale sin él |
| El nombre es un rótulo del pedido, no un cliente del catálogo ni del comprobante | Se dice de palabra en el mostrador; el comprobante tiene sus propios datos |
| Sin nombre, la comanda imprime la hora de apertura y nunca el código interno | El código no lo dice nadie; la hora coincide con la tarjeta |
| La comanda y «Impresiones pendientes» nunca muestran teléfono ni dirección | Regla vigente de la comanda de Delivery; el diálogo repite el papel |
| Cocina solo ve el nombre en el papel | No existe pantalla de cocina |
| Liberar mantiene su efecto y cambia solo el texto por canal | El problema era el texto, no la acción |
| Ningún texto de un pedido sin mesa dice «mesa» | Es la queja de la observación 6 |

## Criterios de aceptación

1. El mozo toca **Para llevar**, escribe «Rosa» y toca **Continuar al pedido**: se abre la toma de pedido «Para llevar · Rosa» y la tarjeta muestra «Rosa» con «Para llevar · desde las 9:40 p. m.».
2. Envía una pachamanca de pollo a cocina: ve «Pedido de Rosa enviado»; la comanda impresa dice «Para llevar: Rosa» en negrita, sin línea «Cliente:» ni el código de 8 caracteres.
3. El mozo abre un Para llevar dejando el nombre vacío a las 9:40 p. m. y envía a cocina: ve «Pedido para llevar enviado», la comanda dice «Para llevar: pedido de las 9:40 p. m.» y la tarjeta muestra «Para llevar» con «Desde las 9:40 p. m.».
4. Ese mismo pedido sin nombre recibe una segunda ronda a las 10:10 p. m.: la segunda comanda tiene «10:10 p. m.» en el encabezado y sigue diciendo «Para llevar: pedido de las 9:40 p. m.».
5. La impresora de cocina está apagada y se envía el pedido sin nombre de las 9:40 p. m.: en «Impresiones pendientes» la comanda aparece como «Para llevar · pedido de las 9:40 p. m. · Cocina»; para el pedido de Rosa, «Para llevar · Rosa · Cocina».
6. Con el pedido de Rosa ya enviado, el mozo corrige el nombre a «Rosa M.»: la tarjeta y el título muestran «Rosa M.»; la comanda ya impresa no cambia y **Reimprimir** saca «Para llevar: Rosa M.».
7. Mientras el mozo edita el nombre de Rosa, otro dispositivo envía una ronda y el cajero cobra: **Guardar nombre** guarda «Rosa M.» sin conflicto. Si en cambio otro dispositivo había cambiado el nombre a «Rosita», ve «Otro dispositivo cambió el nombre a Rosita. Revisa y vuelve a guardar.» con «Rosa M.» intacto; si lo había quitado, ve «Otro dispositivo quitó el nombre. Revisa y vuelve a guardar.».
8. El mozo escribe «   » como nombre: el pedido se abre como «Para llevar» sin nombre. Pega un texto de 150 caracteres: el campo conserva 120 y muestra «Se recortó a 120 caracteres.».
9. Al tocar **Continuar al pedido** con «Rosa» se pierde la respuesta: la hoja sigue abierta con «Rosa» y el mensaje de duda; al tocar de nuevo se abre un único pedido «Rosa» y en Mesas hay una sola tarjeta «Rosa».
10. Un Para llevar sin productos muestra **Liberar pedido**; un Delivery sin productos muestra **Liberar delivery**; la mesa 4 recién abierta sin productos muestra **Liberar mesa**. Ninguna pantalla de un pedido sin mesa muestra «Liberar mesa».
11. El mozo A tiene abierta la toma de pedido de un Para llevar vacío. El mozo B abre el mismo pedido en otra tablet, agrega una gaseosa y vuelve a Mesas sin enviar (el borrador queda guardado). Antes de que la pantalla de A se actualice, A toca **Liberar pedido**: ve «El pedido cambió en otro dispositivo. Tus cambios siguen aquí; revisa el pedido antes de continuar.» con **Ver pedido guardado**; al tocarlo ve la gaseosa por enviar y el botón **Liberar pedido** desaparece. El pedido sigue en Mesas.
12. El mozo A tiene abierta la toma de pedido de un Para llevar vacío y el mozo B lo libera desde otra tablet. A toca **Liberar pedido**: ve «Este pedido ya se cerró.» con **Volver a Mesas**. En ningún caso aparece «mesa».
13. Un Delivery de Ana se envía a cocina: la comanda dice «Delivery: Ana» sin teléfono ni dirección. Un Delivery sin nombre abierto a las 8:15 p. m. imprime «Delivery: pedido de las 8:15 p. m.» y su tarjeta sigue mostrando el teléfono.
14. La hoja de Delivery muestra el campo «Nombre del cliente» y no despliega sugerencias del navegador.
15. El cobro del pedido de Rosa muestra el título «Para llevar · Rosa» y, al cobrar, la boleta no trae a Rosa como cliente.
16. Al cerrar el turno con el pedido de Rosa sin cobrar y un Delivery sin nombre despachado, el aviso muestra «Para llevar · Rosa · Pendiente» y «Delivery · 987 654 321 · Despachado». Un nombre de 60 caracteres se parte en dos líneas sin puntos suspensivos y el monto sigue visible.
17. Al entregar y cerrar a las 10:15 p. m. el pedido de Rosa, «Entregados hoy» lo lista como «Para llevar · Rosa» con «10:15 p. m.» en una sola línea; un Para llevar sin nombre abierto a las 9:40 p. m. aparece como «Para llevar · pedido de las 9:40 p. m.».
18. Un vendedor (SELLER) abre un Para llevar con nombre y lo ve en la tarjeta; no tiene acceso al cobro.
19. Abrir la edición del nombre de un pedido de otra empresa, o de uno que no existe, responde «Este pedido ya no está disponible.» en ambos casos.
20. Un Para llevar abierto antes del cambio aparece como «Para llevar» con su hora de apertura y acepta un nombre desde el lápiz de la toma de pedido.

## Preguntas decididas por la revisión

Respondidas por la revisión de producto del flujo implement-task (revisor de producto y revisor de UX/UI, rondas 1 y 2, 23/10/2026), pendientes de confirmación del fundador en el pull request final.

1. **¿El nombre del cliente en Para llevar es obligatorio u opcional?**
   - Respuesta: opcional, pedido en la hoja «Nuevo pedido para llevar» al abrir, con el cursor ya puesto.
   - Decidieron: revisor de producto y revisor de UX/UI, de acuerdo en ambas rondas.
   - Razón: sigue la regla de registrar aunque falte un dato; el cliente está en el mostrador y el nombre cuesta una palabra y «Ir»; la hoja es el único momento antes de que salga la comanda.
   - Descartadas: obligatorio (obliga a inventar nombres como «cliente» en hora punta y agrega un rechazo); opcional sin hoja, con el campo en la toma de pedido (el nombre se olvida y la comanda sale sin él, que es el problema original).

2. **¿Qué identifica una comanda sin nombre?**
   - Respuesta: la hora de apertura en 12 horas, formato es-PE: «Para llevar: pedido de las 9:40 p. m.».
   - Decidieron: revisor de producto y revisor de UX/UI; UX/UI lo condicionó a un solo formato de hora en el papel, ya aplicado.
   - Razón: coincide con la tarjeta y con «Impresiones pendientes», se dice en voz alta sin buscar nada y no agrega numeración; dos pedidos del mismo minuto se ven iguales hasta que se les pone nombre, caso raro.
   - Descartadas: mantener el código de 8 caracteres (nadie lo dice en voz alta); número corto de pedido del día (numeración nueva fuera de alcance, diferida hasta que exista una numeración correlativa).

Decidido salvo objeción, sin objeciones de la revisión:
- La hoja «Nuevo pedido para llevar» tiene un único campo; no pide teléfono. El botón **Para llevar** solo abre la hoja y la carga pasa a **Continuar al pedido**; la tecla «Ir» del teclado confirma.
- Repetir **Continuar al pedido** en la misma hoja abre el pedido ya creado; nunca deja un segundo pedido vacío.
- Toda falta de respuesta muestra un único mensaje de duda; no se distingue «no se envió».
- El nombre se edita desde un lápiz en el encabezado de la toma de pedido (mismo lugar y tamaño que el de Delivery), mientras el pedido esté abierto, también después de enviar o cobrar. Solo hay conflicto si otro dispositivo cambió o quitó el nombre; guardar el mismo nombre es éxito.
- Límite de 120 caracteres: no se escribe más, lo pegado se recorta con aviso y el servidor responde «El nombre puede tener hasta 120 caracteres.».
- El campo de nombre no usa el autocompletado del navegador, en Para llevar y en Delivery.
- Delivery renombra su campo a «Nombre del cliente» y sigue mostrando el teléfono cuando falta el nombre, salvo en la comanda y en «Impresiones pendientes», que usan la hora.
- La comanda lleva el nombre en la línea del pedido, en negrita («Para llevar: Rosa», «Delivery: Ana»), y se quita la línea aparte «Cliente:».
- Las comandas impresas conservan el nombre con que salieron; la reimpresión usa el nombre actual.
- Las horas de pedidos sin mesa se muestran en 12 horas («9:40 p. m.») en la comanda, la tarjeta, «Impresiones pendientes», el aviso de cierre de turno y la hora de cierre de «Entregados hoy».
- Las etiquetas del aviso de cierre de turno y de «Entregados hoy» empiezan por el canal («Para llevar · Rosa · Pendiente», «Delivery · Ana · Despachado»); un Delivery sin nombre ya no aparece como «Para llevar»; los nombres largos se parten en líneas.
- La confirmación de envío dice «Pedido de Rosa enviado», o «Pedido para llevar enviado» / «Pedido de delivery enviado» sin nombre.
- Ningún texto visible de un pedido sin mesa dice «mesa», incluidos los rechazos al guardar, enviar, liberar y cobrar; «Mesas» como nombre de pantalla se mantiene.
- El nombre no se copia al cliente del comprobante ni crea un cliente en el catálogo.
- La tarjeta de Para llevar con nombre muestra el nombre como título y «Para llevar · desde las 9:40 p. m.» como subtítulo.
- La acción final de Para llevar cobrado sigue siendo «Entregado · cerrar pedido»; solo el botón de descartar un pedido vacío cambia a «Liberar pedido» o «Liberar delivery».
- La hoja de Delivery mantiene su control de conflicto actual; el conflicto por campo queda diferido.
- Los Para llevar abiertos antes del cambio quedan sin nombre.
