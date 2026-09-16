# Kitchens y comandas impresas — tareas por flujo

Fecha: 2026-09-15.
Estado: tareas definidas; implementación y pruebas pendientes.
Fuente: [diseño aprobado](../2026-09-13-kitchens-comandas-impresas-design.md), incluida su actualización del 15 de septiembre.

## Organización

Cada tarea entrega un recorrido observable e incluye interfaz o endpoint, reglas, persistencia y pruebas. Las migraciones, permisos y verificaciones de concurrencia se realizan con el flujo que los necesita; no son tareas aisladas por capa técnica.

| ID | Flujo entregable | Dependencias de implementación |
| --- | --- | --- |
| [KIT-01](01-vincular-cliente-y-registrar-impresoras.md) | Vincular una instalación, registrar sus impresoras y revocarla | Ninguna |
| [KIT-02](02-configurar-kitchens-y-productos.md) | Configurar destinos e impresoras y crear platos asignados | KIT-01 |
| [KIT-03](03-enviar-rondas-desde-mesas.md) | Enviar una ronda de mesa y consultar sus comandas | KIT-02 |
| [KIT-04](04-ejecutar-y-recuperar-impresiones.md) | Procesar una comanda y resolver éxito, reintentos o fallo | KIT-01, KIT-03 |
| [KIT-05](05-cancelar-platos-cobrar-y-cerrar-mesa.md) | Cancelar cantidades, cobrar lo vigente y liberar la mesa | KIT-03 |
| [KIT-06](06-confirmar-para-llevar-y-delivery.md) | Confirmar pedidos sin pago, enviar adicionales y registrar su cierre | KIT-03, KIT-05 |
| [KIT-07](07-imprimir-pendientes-y-reimprimir.md) | Imprimir una comanda pendiente o reimprimirla desde el pedido | KIT-04, KIT-05 |
| [KIT-08](08-revisar-disponibilidad-y-resolver-alertas.md) | Revisar impresoras y resolver comandas que requieren atención | KIT-06, KIT-07 |

Las dependencias permiten reutilizar flujos ya terminados. **Prueba autónoma** significa que cada tarea tiene preparación, recorrido y resultado propios, sin esperar una tarea posterior ni ejecutar previamente toda la batería manual. Los fixtures preparan entidades reales válidas; no sustituyen las transacciones o restricciones que se están comprobando.

## Reglas de implementación y cierre

- Conservar las responsabilidades y contratos aprobados: `order/rounds` posee rondas y cancelaciones; `kitchen` posee comandas y trabajos; `printing` genera contenido y comunica con dispositivos. Los casos de uso reciben dependencias explícitas, devuelven `response<T>` y no importan Prisma, Next.js, sesiones o colas.
- Cada tarea incorpora la migración de estructura necesaria, validaciones en servidor y aislamiento por empresa. No convertir historial de restaurantes ni conservar el modelo anterior de rondas. No asumir que esto autoriza borrar datos de otros tipos de venta.
- Conservar el nombre aprobado `KitchetTicketPrintJob`. No agregar estado a `KitchenTicket`, tabla de intentos ni copia adicional de sus líneas. No alterar el flujo de comprobantes iMin.
- Probar negocio de rondas en `src/order/__TEST__/rounds/` y comandas/trabajos en `src/kitchen/__TEST__/`. Las demás pruebas pertenecen al feature correspondiente. Usar integración contra PostgreSQL para atomicidad, índices y concurrencia; los mocks no acreditan esas garantías.
- Cada cierre aporta resultados de pruebas, pasos reproducibles y evidencia de persistencia; las tareas con interfaz añaden capturas. Registrar como pendiente cualquier comprobación física no ejecutada.
- El backend se verifica con un cliente de prueba que usa los endpoints reales y reporta resultados controlados. El instalador, protección local de credenciales, registro duradero de intentos y spooler Windows pertenecen al [diseño .NET](../2026-09-13-cliente-impresion-dotnet-design.md); no se agregan como implementación de este plan. La validación física integrada requiere ese cliente y una impresora y no se considera acreditada por el simulador.
- No incorporar pantalla de cocina, preparación/servido digital, devoluciones, notificaciones persistidas, cambios de observaciones ya enviadas ni reglas especiales de configuración durante el servicio. La [impresión de paquetes](../2026-09-15-package-product-impresiones-pendiente.md) sigue fuera del MVP.
- Las pruebas no añaden una función de impresión de prueba a la web: no crear `PrinterTestPrintJob` ni endpoints de producción para ese fin.

## Cobertura del diseño

| Requisito del diseño | Tarea responsable |
| --- | --- |
| Vinculación, autenticación, inventario y revocación | KIT-01 |
| Kitchens, estados administrativos, perfil y DishProduct; criterios de producto 1–2 | KIT-02 |
| Envío atómico, rondas, líneas repetidas, contenido e historial; criterios 3, 5, 17 | KIT-03 |
| Coordinador, intentos, timeouts y transporte; criterios 14–16 | KIT-04 |
| Cancelaciones, cantidades vigentes, pago y cierre; criterio 7 | KIT-05 |
| Confirmación sin pago y operación sin preparación digital; criterios 4, 6 | KIT-03, KIT-06 |
| Primera impresión, reimpresión y conservación del envío; criterios 8–9, 12 | KIT-07 |
| Disponibilidad, alcance del modal y avisos descartables; criterios 10–11, 13 | KIT-08 |

Seguridad, recuperación y conservación histórica se aceptan dentro de cada flujo; no se posponen a una tarea final de endurecimiento.
