# Kitchens y comandas impresas — alcance de producto del MVP

Fecha: 2026-09-13
Estado: aprobado por el usuario. Documenta comportamiento acordado; no acredita implementación.

## Objetivo

Organizar la preparación de pedidos mediante destinos configurables llamados **Kitchen** y comandas impresas. Cada Kitchen representa un lugar donde se prepara un producto. Sus nombres los define cada negocio; Cocina y Barra dejan de ser destinos fijos del sistema.

Este acuerdo reemplaza, para este MVP, las propuestas anteriores de pantalla de cocina y seguimiento de preparación o entrega, incluidas las de `docs/restaurant-mvp/03-comandas-y-cocina.md`. Las diferencias con el código actual son trabajo de implementación posterior.

## Configuración

- Solo el administrador crea Kitchens, asigna sus impresoras y configura la Kitchen de cada producto.
- Cada Kitchen tiene una impresora asignada. Varias Kitchens no pueden compartir la misma impresora.
- Cada producto puede tener una sola Kitchen o ninguna.
- Un producto sin Kitchen permanece en el pedido y se cobra normalmente, pero no genera comanda.
- Para esta versión se asume que el administrador configura fuera del horario de atención. No se define manejo especial de cambios de configuración durante el servicio ni una regla de conservación de destinos históricos.

## Envío e impresión

El alcance incluye pedidos de mesas, para llevar y delivery.

1. En mesas, el mozo envía una ronda. Para llevar y delivery, se confirma el pedido, independientemente de si está pagado.
2. El sistema agrupa los productos del envío por su Kitchen.
3. Se imprime automáticamente una comanda por cada Kitchen involucrada, únicamente con los productos que le corresponden.
4. Los productos sin Kitchen no se incluyen en las comandas.
5. Los productos agregados después generan nuevas comandas solo con los adicionales, destinadas a las Kitchens correspondientes.

## Trabajo de preparación

Quienes preparan los platos se organizan con las comandas impresas y pueden preparar platos individualmente. No usarán una pantalla para modificar estados.

El MVP no registra estados de preparación ni entrega, tampoco mediante el mozo. No exige marcar productos como En preparación, Listos o Servidos, ni exige que una ronda completa esté lista para entregar platos. La coordinación de preparación y entrega ocurre fuera del sistema.

## Cancelaciones

- El mozo puede cancelar productos enviados sin autorización adicional.
- Puede cancelar toda la cantidad o solo una parte: de 3 lomos, cancelar 1 y conservar 2.
- El motivo es opcional.
- El pedido y su total se actualizan según la cantidad vigente.
- Es responsabilidad del mozo validar previamente con cocina antes de cancelar un plato.
- La cancelación no imprime automáticamente un aviso en la Kitchen.
- No se limita la cancelación por un estado de preparación, porque ese seguimiento no existe en esta versión.

## Fallos y reimpresiones

Si falla una impresora, el pedido o la ronda se conserva como enviado. Se avisa al mozo y se permite reimprimir únicamente la comanda afectada, sin duplicar el pedido.

Toda reimpresión:

- Lleva la marca **REIMPRESIÓN**.
- Conserva el identificador de la comanda original.
- Refleja las cantidades vigentes y las cancelaciones posteriores al envío.

Ejemplo: una comanda original contiene 3 lomos y luego se cancela 1. La reimpresión muestra 2 lomos vigentes y la indicación de 1 cancelado.

## Contenido de la comanda

- Identificador de comanda.
- Fecha y hora.
- Kitchen de destino.
- Tipo de pedido: mesa, para llevar o delivery.
- Mesa o número de pedido, según corresponda.
- Responsable del pedido.
- Productos, cantidades y observaciones.
- Marca de reimpresión y cancelaciones cuando corresponda.

Las comandas no muestran precios.

## Criterios de aceptación de producto

1. El administrador puede definir destinos con nombres propios y asignar una impresora exclusiva a cada Kitchen.
2. Un producto admite cero o una Kitchen; no admite varias.
3. Un envío con productos de dos Kitchens genera una comanda por Kitchen. Los productos sin Kitchen permanecen en la cuenta y no se imprimen.
4. Los pedidos para llevar y delivery generan comandas al confirmarse, aunque no estén pagados.
5. Agregar productos genera comandas solo por los adicionales.
6. Preparar y entregar platos no requiere acciones de seguimiento en el sistema.
7. El mozo puede cancelar una cantidad parcial con motivo vacío, sin autorización adicional ni impresión de cancelación; el total se ajusta.
8. Un fallo de impresión conserva el envío y permite reimprimir solo la comanda afectada sin duplicar productos.
9. Una reimpresión conserva el identificador original, se identifica como tal y muestra cantidades vigentes y canceladas.

## Límite de este documento

Este es el alcance funcional aprobado. No prescribe arquitectura, migraciones, protocolo de impresión ni cambios concretos de código. El diseño técnico y la implementación se abordarán como trabajo posterior.
