# Pendientes de la funcionalidad de restaurante

## Estado actual

Ya se implementaron las siguientes brechas:

- GAP-01: acceso a “Mesas y zonas” desde Configuración.
- GAP-03: acceso visible al pedido completo desde una mesa ocupada.
- GAP-04: observaciones por producto desde el panel rápido.
- GAP-05: cancelación de productos antes de que Cocina los tome.
- GAP-06: motivo obligatorio y persistente al cancelar una sesión.
- GAP-07: visualización del detalle real del pedido.

Este documento describe el trabajo que todavía falta para completar y estabilizar la funcionalidad de restaurante.

## Prioridad inmediata: estabilización

### Aplicar la migración de cancelación

La migración `20260909000000_add_table_session_cancellation_reason` agrega el campo `TableSession.cancellationReason`.

Pendiente:

- Aplicar la migración en cada entorno.
- Confirmar que las sesiones existentes permanecen intactas.
- Verificar que una cancelación conserva el motivo recortado.
- Confirmar que el cierre normal no exige ni registra un motivo.

### Ejecutar QA de las brechas implementadas

Validar en navegador:

- Un administrador ve “Mesas y zonas” cuando `restaurants` está habilitado.
- Otros roles no ven el enlace.
- El enlace tampoco aparece cuando `restaurants` está deshabilitado.
- “Ver pedido completo” abre la mesa seleccionada.
- Una observación escrita en el carrito se conserva al enviar la ronda.
- No se puede cancelar una sesión con un motivo vacío o compuesto solo por espacios.
- No se puede ingresar un motivo mayor de 500 caracteres.
- El motivo válido queda almacenado en la sesión cancelada.
- El pedido muestra producto, cantidad, precio unitario, subtotal, observación y total.
- Los recorridos funcionan en escritorio y móvil.

### Recuperar una validación técnica limpia

Actualmente hay problemas anteriores a las últimas mejoras que impiden usar la suite completa como compuerta de entrega.

#### Pruebas de realtime

Cinco pruebas esperan `createSupabaseRealtimeProvider`, pero el módulo actual no exporta esa función.

Se debe:

- Confirmar si la función fue reemplazada o eliminada.
- Actualizar las pruebas si el contrato cambió intencionalmente.
- Restaurar la implementación si todavía debe administrar canales compartidos.
- Verificar suscripción, reutilización de canales, desconexión y propagación de estados.

#### Prueba de cancelación de sesión

`src/table/__TEST__/cancel-table-session.test.ts` importa un caso de uso inexistente: `use-cases/cancel-table-session`.

La prueba describe un flujo que todavía no está implementado por completo:

- Cancelar la sesión de mesa.
- Cancelar la orden asociada.
- Cancelar comandas pendientes o en preparación.
- Conservar intactas las comandas listas.
- Registrar motivo, usuario y fecha de cancelación.

Debe alinearse la prueba con el alcance definitivo de GAP-05 y el flujo de comandas.

#### Build bloqueado

`src/restaurant/components/financial-block-notice.tsx` importa `@/shared/components/ui/alert`, componente que no existe.

Solución recomendada:

- Agregar el componente `Alert` siguiendo el sistema shadcn existente si esa pantalla forma parte del producto.
- Eliminar o excluir el código únicamente si se confirma que es experimental y no debe publicarse.

#### Errores generales de lint

El lint general reporta errores preexistentes, principalmente:

- Lectura de `ref.current` durante el render.
- Actualizaciones síncronas de estado dentro de efectos.
- Asignaciones a `window.location.href` rechazadas por las reglas actuales de React.
- Proveedores de estado que usan patrones incompatibles con las reglas del compilador de React.

Estos errores no pertenecen directamente a restaurante, pero deben resolverse para recuperar una compuerta de calidad confiable.

## Brechas funcionales pendientes

### GAP-05 — Cancelación individual de productos

**Estado:** implementado para cancelación total de una línea mientras su estado
de Cocina sea `PENDING`. Cocina bloquea la cancelación al tomarla y pasarla a
`PREPARING`. Requiere aplicar la migración
`20260909010000_add_order_item_kitchen_status` en cada entorno.

#### Regla implementada

- Cada producto enviado nace en estado `PENDING`.
- Salón puede cancelar la línea completa con un motivo obligatorio mientras siga
  pendiente.
- Al tomar el producto, Cocina lo cambia atómicamente a `PREPARING`; desde ese
  momento ya no puede cancelarse.
- La cancelación conserva la línea como historial y registra motivo, usuario y
  fecha.
- Los totales excluyen líneas canceladas, incluso al enviar rondas posteriores.
- Las operaciones condicionales impiden que Cocina y Salón ganen simultáneamente
  sobre el mismo producto.

#### Criterios de aceptación

- El producto cancelado permanece visible con motivo, usuario y fecha.
- El total se recalcula correctamente una sola vez.
- Los demás productos y rondas no cambian.
- Cocina recibe el estado actualizado.
- Dos cancelaciones simultáneas producen un solo cambio.

### GAP-08 — Marcar comandas como servidas

**Estado:** implementado. Cocina marca productos en preparación como `READY`;
cuando todos los productos vigentes de una ronda están listos, Salón puede marcar
la comanda `SERVED`. La entrega conserva historial, usuario y fecha, actualiza el
contador en tiempo real y rechaza repeticiones concurrentes.

#### Problema

Una comanda puede quedar lista permanentemente porque no existe una acción que confirme su entrega al cliente.

#### Alcance mínimo recomendado

- Añadir el estado `SERVED` o equivalente.
- Permitir que salón confirme la entrega de una comanda lista.
- Registrar fecha y usuario de entrega.
- Retirar la comanda del contador de listas pendientes.
- Mantenerla en el historial de la sesión.
- Rechazar entregas repetidas.

#### Criterios de aceptación

- Solo una comanda lista puede marcarse como servida.
- El contador se actualiza en tiempo real.
- La acción queda auditada.
- Una actualización concurrente converge en un único resultado.

### GAP-09 — Separación de Cocina y Barra

#### Problema

Cocineros y bartenders comparten una cola general. El sistema no conoce la estación responsable de cada producto.

#### Decisiones necesarias

- Determinar si la estación pertenece al producto o a la categoría.
- Definir las estaciones iniciales: Cocina y Barra.
- Definir quién puede consultar todas las estaciones.
- Resolver productos que no tengan estación asignada.

#### Alcance mínimo recomendado

- Guardar una estación por producto.
- Generar o agrupar el trabajo por estación.
- Mostrar a cada rol únicamente su cola.
- Permitir a administradores consultar todas las estaciones.
- Mantener una cola de excepción para productos sin configuración.

#### Criterios de aceptación

- Un producto de Barra no aparece en Cocina y viceversa.
- Una ronda mixta genera trabajo para ambas estaciones.
- Cambiar la estación de un producto no altera comandas históricas.

### GAP-10 — Datos de pagos por billetera

#### Problema

El flujo de cobro acepta un monto de billetera, pero no captura de forma visible la billetera ni el código de operación.

#### Decisiones necesarias

- Definir si la billetera será una lista configurada o texto libre.
- Definir si el código de operación será obligatorio.
- Determinar si se validarán referencias duplicadas.

#### Alcance mínimo recomendado

- Capturar el nombre de la billetera.
- Capturar el código de operación.
- Validar y recortar ambos campos en el servidor.
- Mostrar la referencia en el detalle de la venta y reportes.
- Conservar los datos al combinar varios medios de pago.

#### Criterios de aceptación

- El pago guarda la billetera y referencia ingresadas.
- Los datos reaparecen en el detalle de la operación.
- Una validación fallida no registra un pago parcial.

### GAP-11 — Descuentos desde la cuenta de mesa

#### Problema

La cuenta puede mostrar descuentos, pero no ofrece una acción para aplicarlos o editarlos desde el recorrido de restaurante.

#### Decisiones necesarias

- Descuento por producto, por cuenta o ambos.
- Porcentaje, importe fijo o ambos.
- Roles autorizados y límites máximos.
- Motivo obligatorio y nivel de auditoría.
- Efecto tributario sobre comprobantes.

#### Alcance mínimo recomendado

- Comenzar con descuento sobre la cuenta completa.
- Permitir porcentaje o importe fijo usando las reglas existentes de órdenes.
- Restringir la acción al rol autorizado.
- Registrar usuario, fecha y motivo.
- Recalcular neto, impuestos y total antes del cobro.
- Bloquear cambios después de registrar un pago.

#### Criterios de aceptación

- El total nunca queda negativo.
- El comprobante usa los importes descontados.
- El historial identifica quién aplicó o retiró el descuento.
- Dos ediciones simultáneas no producen un total inconsistente.

### GAP-12 — División de cuenta

#### Problema

Combinar medios de pago no divide una cuenta. Una división real necesita saldos, pagos y comprobantes independientes.

#### Modalidades posibles

- Partes iguales.
- Montos personalizados.
- Selección de productos.
- División de la cantidad de un mismo producto.

#### Alcance inicial recomendado

Implementar primero división por productos completos:

- Crear grupos de cobro dentro de la misma orden.
- Asignar cada producto pendiente a un único grupo.
- Calcular subtotal, descuentos, impuestos y saldo por grupo.
- Permitir cliente, pago y comprobante por grupo.
- Mantener la mesa abierta hasta pagar todos los grupos.
- Permitir reunificar únicamente grupos todavía no pagados.

#### Criterios de aceptación

- Ningún producto se cobra dos veces ni queda sin asignar.
- Cada grupo conserva su saldo y sus pagos.
- Los comprobantes representan únicamente los productos del grupo.
- La suma de grupos coincide con el total original.
- La mesa solo se libera cuando el saldo total llega a cero.

## Casos QA de concurrencia pendientes

Quedan 19 casos que requieren dos o más sesiones simultáneas:

- RES-SYN-01, RES-SYN-02, RES-SYN-03 y RES-SYN-09.
- RES-SAL-11.
- RES-TRA-07.
- RES-PED-14, RES-PED-15 y RES-PED-16.
- RES-ITM-13.
- RES-COC-09 y RES-COC-10.
- RES-CTA-07 y RES-CTA-11.
- RES-CAN-09.
- RES-COB-32, RES-COB-33, RES-COB-34 y RES-COB-35.

Estos casos deben comprobar:

- Apertura simultánea de una mesa.
- Transferencias concurrentes entre mozos.
- Envío simultáneo de rondas.
- Preparación y cancelación concurrente del mismo producto.
- Solicitud, reapertura y cierre de cuenta desde distintos dispositivos.
- Intentos simultáneos de cobrar la misma cuenta.
- Recuperación después de desconexiones o eventos perdidos.

La evidencia esperada es que cada operación converja en un único estado válido, sin duplicados, cantidades negativas, rondas repetidas, cobros dobles ni actualizaciones perdidas.

## Orden recomendado de ejecución

1. Aplicar la migración y ejecutar QA de GAP-01, GAP-03, GAP-04, GAP-06 y GAP-07.
2. Reparar build, pruebas de realtime y la prueba de cancelación inconsistente.
3. Implementar GAP-05, cancelación individual de productos.
4. Implementar GAP-08, entrega de comandas.
5. Implementar GAP-09, separación de Cocina y Barra.
6. Implementar GAP-10 y GAP-11 para completar cobro y descuentos.
7. Diseñar e implementar GAP-12 como iniciativa independiente.
8. Automatizar y ejecutar los 19 casos de concurrencia.

## Criterio de cierre general

La funcionalidad de restaurante puede considerarse lista cuando:

- Las migraciones están aplicadas en todos los entornos.
- Build, lint y pruebas automatizadas terminan sin errores.
- Los recorridos P0 y P1 pasan en escritorio y móvil.
- Los casos concurrentes no generan duplicados ni pérdidas de datos.
- Cancelaciones, descuentos, entregas y cobros conservan auditoría suficiente.
- Una mesa no puede cerrarse con trabajo o deuda pendiente.
