# KIT-07 — Imprimir una comanda pendiente o reimprimir desde el pedido

Estado: pendiente de implementación y pruebas.
Dependencias: [KIT-04](04-ejecutar-y-recuperar-impresiones.md), [KIT-05](05-cancelar-platos-cobrar-y-cerrar-mesa.md).
Fuente: [diseño — primera impresión y reimpresión](../2026-09-13-kitchens-comandas-impresas-design.md#primera-impresión-pendiente-por-falta-de-impresora).

## Flujo y resultado

El responsable o administrador abre una comanda del pedido y solicita su primera impresión cuando ya hay impresora, o reimprime una que tuvo trabajos anteriores. La operación afecta únicamente esa comanda y refleja las cantidades correctas.

## Alcance

- `getKitchenTickets({ orderId })`, `printKitchenTicket`, `reprintKitchenTicket` y acciones desde el detalle del pedido.
- Presentación de último trabajo, trabajo activo, motivo de atención, `canPrint` y `canReprint` derivados.
- Generación de contenido desde una lectura consistente de ítems/cancelaciones, nuevo jobId idempotente y notificación posterior al commit.
- Prueba del trabajo manual a través del coordinador de KIT-04.

## Fuera de alcance

Modal global y cuadro de disponibilidad, reiniciar trabajos anteriores, reenvío de todo el pedido, editar observaciones enviadas o marcar coordinación verbal como impresión exitosa.

## Criterios de aceptación

1. ADMIN consulta comandas de su empresa; el mozo consulta únicamente las rondas de las que es responsable y con permiso de lectura del pedido. Empresa, usuario y rol provienen de sesión y el filtrado se hace en servidor. Un rol no autorizado se rechaza.
2. Sin trabajos y con algún ítem vigente, el motivo es `NO_PRINTER_CONFIGURED` sin impresora o `NOT_PRINTED` con impresora. Configurar la Kitchen no imprime comandas anteriores automáticamente ni agrega estado persistido a KitchenTicket.
3. **Imprimir** exige ausencia de trabajos, cantidades vigentes positivas y destino activo válido de su empresa. Bloquea la comanda y crea un único trabajo con `isReprint = false`, usando impresora/perfil actuales, solo cantidades vigentes y ninguna cancelación visible ni marca REIMPRESIÓN.
4. Si todos los ítems se cancelaron antes del primer trabajo, se conserva el historial y se rechaza imprimir sin crear un trabajo vacío. Esta regla no oculta ni elimina una comanda que ya tuvo trabajos, aunque ahora todo esté cancelado.
5. **Reimprimir** exige al menos un trabajo anterior, sin exigir que haya fallado; se permite también después de DELIVERED. Cualquier trabajo PENDING/PROCESSING impide otra solicitud, sea inicial o reimpresión, también con peticiones simultáneas.
6. Una reimpresión crea otro jobId para la misma comanda, con `isReprint = true`, marca REIMPRESIÓN, identidad original, cantidades vigentes y canceladas únicamente de esa ronda/Kitchen. No arrastra cancelaciones de otras rondas ni reinicia el trabajo anterior.
7. Ambas acciones conservan el jobId generado una vez por operación. Repetir la misma solicitud recupera el trabajo; reutilizar el ID para otra comanda/contenido se rechaza. La comprobación de precondiciones y creación son atómicas y respaldadas por la restricción de trabajo activo.
8. La lectura de cantidades/cancelaciones es consistente frente a una cancelación concurrente. Los bytes guardados no cambian por cancelaciones posteriores ni durante reintentos. El trabajo guarda solicitante actual y obtiene responsable original desde la ronda.
9. Solo responsable de la ronda y ADMIN pueden ejecutar; las mutaciones vuelven a validar aunque la UI haya mostrado el botón. No aceptan destino arbitrario del navegador ni impresora inactiva/ajena.
10. Ejecutar el trabajo manual no cambia cantidades, totales, rondas ni pago. La interfaz refleja PENDING/PROCESSING, DELIVERED o FAILED por lectura autorizada y permite recuperar el resultado de una respuesta perdida.

## Prueba autónoma

**Preparación:** tres comandas de una mesa: sin impresora/sin trabajos, con trabajo FAILED y con trabajo DELIVERED; cantidades y cancelaciones en dos rondas del mismo producto. Preparar fixtures directamente, sin depender de un modal.

**Recorrido:**

1. Configurar la impresora de la primera comanda y comprobar que no se crea trabajo. Cancelar uno de tres platos y pulsar Imprimir: dos vigentes, sin marca ni cancelación visible.
2. En otra comanda sin trabajos cancelar todos los ítems y comprobar rechazo sin trabajo vacío.
3. Reimprimir una fallida y una entregada: misma identidad de comanda, nuevo jobId, marca y cancelaciones de su ronda. Repetir cuando todos sus ítems estén cancelados y exista trabajo previo.
4. Mientras haya trabajo activo, intentar otra solicitud; competir con dos primeros trabajos y dos reimpresiones. Repetir ID, perder respuesta y forzar rollback.
5. Competir reimpresión/cancelación y comprobar una vista consistente; cancelar después y verificar bytes inmutables durante reintentos.
6. Ejecutar el trabajo con el cliente de prueba hasta éxito/fallo. Probar otro mozo, otra empresa y cambio de impresora; confirmar que no cambian trabajos previos ni cuenta.

**Evidencia de cierre:** capturas de detalle y acciones, comparación de bytes original/manual/reimpresión, historial e importes sin duplicados, pruebas de permisos y concurrencia en PostgreSQL. La impresión física se documenta aparte cuando esté disponible el cliente .NET.
