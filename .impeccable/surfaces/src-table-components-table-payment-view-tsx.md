---
version: 1
slug: "src-table-components-table-payment-view-tsx"
primary_target: "src/table/components/table-payment-view.tsx"
related_targets: ["src/table/components/table-payment-view.module.css", "src/app/[subdomain]/dashboard/tables/[tableId]/payment/page.tsx", "route:/dashboard/tables/[tableId]/payment"]
---

# Cobro de mesas

## Alcance y autoridad

Modo **Operate**. Superficie implementada para revisar y cobrar una cuenta completa durante la atención desde celular o tablet. Conserva la identidad Jade y Manrope definida en `DESIGN.md`; este brief registra su composición local sin redefinir tokens globales. `PRODUCT.md` aporta el contexto de servicio con presión de tiempo y tareas por rol. Las decisiones aprobadas están en `docs/plans/2026-09-12-pagos-mesas-design.md`.

## Composición observada

- Pantalla dedicada con cabecera de mesa y retorno al pedido; en el resultado, retorno a mesas. La ruta recibe la sesión mediante `?session=<id>` y admite ADMIN, CASHIER y WAITER.
- Por debajo de 768 px se alternan «Revisar cuenta» y «Comprobante y pago». La revisión muestra cantidades, nombres, estados, importes y total; los productos cancelados aparecen tachados y excluidos del total. «Continuar al pago» abre el formulario; «Ver cuenta» conserva los datos ingresados.
- Desde 768 px, cuenta y formulario aparecen juntos en un contenedor centrado de hasta 1152 px. La columna derecha tiene un mínimo de 360 px. La cuenta usa divisores; el formulario tiene superficie de tarjeta, borde y esquinas suaves, sin envolver cada línea del pedido en otra tarjeta.
- El formulario presenta comprobante, datos de cliente cuando corresponden y medio de pago, en ese orden. Los medios principales son botones con icono y texto en dos columnas; tarjeta despliega débito y crédito.
- El pie mantiene mesa, medio elegido, importe y confirmación. Usa posición sticky y espacio inferior seguro; al enfocar un input o select con puntero táctil o ancho menor de 768 px vuelve al flujo normal de la página.
- El resultado ocupa una columna centrada de hasta 512 px: icono, estado explícito, efecto sobre la mesa, total y «Volver a mesas». Tras pagar aparecen acceso al comprobante y reimpresión.

## Lenguaje visual heredado

La acción principal usa jade; selecciones y resultado usan las superficies semánticas existentes. Fondo, tarjeta, bordes, texto auxiliar y errores consumen los tokens del sistema, junto con Button, Input, Label y ToggleGroup compartidos. Manrope y cifras tabulares mantienen la jerarquía de la aplicación. El total y el título de resultado usan 24 px; los títulos de sección, 18 px. Las acciones principales y comprobantes tienen un mínimo de 48 px, los medios principales 80 px y las alternativas débito/crédito y «Ver cuenta» 44 px.

La advertencia de preparación combina icono y texto sobre fondo ámbar local (`#fff5e5`, texto `#825008`). Estos valores describen esta advertencia, no añaden tokens al sistema global. La interfaz usa HTML/CSS e iconos Lucide; las capturas de revisión no son recursos servidos por la pantalla.

## Comportamiento y estados

- El mozo confirma el total mediante tarjeta o billetera después de verificar el pago recibido. No aparecen montos editables ni referencias de billetera para ese rol. Efectivo y combinado se derivan mediante «Enviar a caja» y una confirmación explícita; la solicitud conserva la mesa ocupada.
- Caja dispone de efectivo y combinado, importes por medio, recibido, vuelto y referencias de billetera cuando corresponden. El formulario identifica la caja receptora. Sin caja compartida abierta, el cobro se deshabilita y se explica el motivo; el mozo puede solicitar cobro en caja.
- Nota de venta, boleta y factura se muestran según las opciones disponibles. La boleta permite agregar cliente; factura solicita RUC, razón social y dirección fiscal. Las etiquetas permanecen visibles y los errores se vinculan mediante `aria-describedby` y `aria-invalid`.
- Los productos sin enviar bloquean el cobro y ofrecen volver al pedido. Los productos pendientes o en preparación muestran una advertencia antes de confirmar, sin impedir el cobro.
- Durante el registro se deshabilita la confirmación y se muestra «Registrando…». Un resultado incierto ofrece consultar el estado antes de repetir. Los cambios de cuenta o caja eliminan la selección del medio y requieren revisar los datos actualizados.
- «Pago confirmado» indica que la mesa está libre. «Pendiente de cobro en caja» explica que permanece ocupada. Fallos de impresión conservan el pago confirmado y permiten reintentar la impresión.
- Los cambios de paso y de resultado llevan el foco al encabezado correspondiente; la validación enfoca el primer campo inválido. Errores y resultados usan alertas o estados accesibles. La actualización combina eventos de tiempo real, retorno del foco a la ventana y consulta cada 15 segundos mientras está visible.

## Evidencia y límites

Revisión de implementación del 12 de septiembre de 2026 sobre el componente, su CSS y la ruta. La validación de navegador comunicada por el implementador cubre 390 × 844 y 820 × 1180, tarjeta y billetera del mozo, datos y errores de factura, conservación entre pasos, desconexión, derivación a caja y resultado. Capturas: `.impeccable/review/pagos/{review-mobile,mobile,tablet,invoice-mobile,register-mobile,success-mobile}.png`. La revisión independiente de acabado dio por resueltos los ajustes de foco y tamaño táctil.

El caso de teclado se comprobó con foco y altura reducida a 480 px; no acredita un teclado virtual en hardware físico. La impresión física y el envío a SUNAT necesitan dispositivos y credenciales reales. Las pruebas de integridad financiera y concurrencia se documentan en el plan de pagos; las capturas por sí solas no las acreditan.
