# KIT-01 — Vincular una instalación y registrar sus impresoras

Estado: pendiente de implementación y pruebas.
Dependencias: ninguna.
Fuente: [diseño — vinculación y autenticación HTTPS](../2026-09-13-kitchens-comandas-impresas-design.md#vinculación-y-autenticación-https-del-cliente-de-impresión).

## Flujo y resultado

El administrador genera un código en la web. Una instalación lo intercambia por su credencial, registra el inventario completo y queda disponible para configurar Kitchens. El administrador puede revocarla.

## Alcance

- Acceso administrativo para generar el código, consultar instalaciones e impresoras y revocar un cliente.
- Modelos `PrintClientLinkCode`, `PrintClient` y `Printer`, relaciones por empresa, índices y migración; perfil inicial de impresora según el diseño.
- `createPrintClientLinkCode`, `linkPrintClient`, `registerPrinterInventory` y autenticación compartida en `src/printing/clients/`.
- Endpoints `POST /api/printing/clients/link` y `POST /api/printing/clients/printers`; límite de intercambios inválidos en Redis.

## Fuera de alcance

Asignar Kitchens, editar perfiles, generar comandas, ejecutar impresiones, alertas de disponibilidad, instalador .NET y almacenamiento de credenciales en Windows.

## Criterios de aceptación

1. Solo ADMIN genera códigos para su empresa. El código es texto de cuatro dígitos, conserva ceros iniciales, vence en diez minutos y se muestra una vez. Se persiste únicamente `HMAC-SHA-256(PRINT_CLIENT_LINK_CODE_SECRET, code)`, con unicidad y reintento ante colisión vigente; los vencidos se limpian oportunísticamente.
2. Un intercambio válido consume el código y crea el cliente en una misma transacción. Devuelve una vez `printClientId` y `lpk_{token}`, con 32 bytes aleatorios en Base64URL; solo guarda SHA-256 de la credencial. Dos intercambios simultáneos no crean dos clientes.
3. Código usado, desconocido o vencido produce el mismo rechazo. Tras cinco intercambios inválidos por IP en diez minutos, se responde `429` antes de buscar el código. Se obtiene la IP del contexto de red confiable; un intercambio válido no suma al contador.
4. Si se pierde la respuesta después del commit, no se recupera la credencial: el administrador puede revocar el registro y generar otro código. Un fallo transaccional no consume el código sin crear cliente.
5. Inventario, futuros claims y resultados comparten autenticación Bearer; empresa y cliente se resuelven en servidor. Una credencial inválida o revocada no puede registrar inventario ni operar recursos.
6. El inventario acepta `{ version: 1, printers: [{ localName }] }`, incluida una lista vacía. Cada registro hace upsert por `(printClientId, localName)` y usa una sola fecha para `lastInventoryAt` y `lastDetectedAt` de las impresoras presentes. Repetir la lista no duplica impresoras.
7. Las impresoras ausentes conservan registro y asignación, con su fecha previa. Dos clientes pueden tener el mismo nombre de cola sin compartir identidad. Inventario y conexión no alteran `Printer.status`, cuyo valor inicial es `ACTIVE`.
8. `lastSeenAt` es informativo y se actualiza mediante operaciones HTTPS autenticadas. Revocar impide operaciones posteriores y conserva impresoras e historial; la credencial nunca aparece en lecturas, avisos o logs.

## Prueba autónoma

**Preparación:** dos empresas, ADMIN y usuario no administrador; PostgreSQL y Redis de prueba; cliente HTTP que conserva temporalmente la credencial recibida. No requiere Kitchens ni impresora física.

**Recorrido:**

1. Generar un código, vincular una instalación y registrar dos colas; consultar lo registrado desde administración.
2. Reenviar la lista, enviar solo una cola y finalmente una lista vacía. Verificar identidad estable, fechas y conservación de ausentes.
3. Probar código con cero inicial, vencido, usado, desconocido, colisión de hash y límite por IP con reloj controlado.
4. Competir por un mismo código, forzar rollback y simular pérdida de respuesta tras commit. Verificar que nunca se crean dos clientes para el mismo consumo.
5. Revocar y repetir inventario; probar acceso desde otra empresa y generación por rol no autorizado.

**Evidencia de cierre:** peticiones/respuestas sin secretos, capturas administrativas y verificaciones reales de transacción, unicidad y rate limit. La enumeración de Windows se valida posteriormente con el cliente .NET.
