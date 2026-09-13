# QA GAP-09 — Separación de Cocina y Barra

Fecha: 9 de septiembre de 2026 (America/Lima).
Estado funcional: **PASS**. Validación global del repositorio: **con bloqueos preexistentes**.

Se utilizó el skill `qa-tester` con Playwright CLI, sesiones independientes de
ADMIN, KITCHEN, BARTENDER y WAITER, y el diseño/plan QA aprobado por el usuario.
No se enviaron mensajes a Telegram: la autorización cubría las pruebas locales.

## Entorno

- App del directorio actual: `http://gap09-a.localhost:3000`.
- PostgreSQL 17 aislado: contenedor `gap09-postgres`, puerto local 55439.
- Redis aislado: `gap09-redis`, puerto local 56379.
- Migraciones del repositorio aplicadas con `prisma migrate deploy`, incluida
  `20260910000000_add_preparation_station`.
- Empresas y usuarios de QA sintéticos. No se modificaron datos de otros proyectos.
- Escritorio: 1280 × 720/900. Móvil: 390 × 844.
- La base habitual de `.env` rechazó sus credenciales; no se modificó ese archivo.

## Historia 1 — Configurar la estación por producto

Como administrador, quiero configurar la estación de cada producto para dirigir
su preparación a Cocina o Barra.

| Caso | Resultado y evidencia |
| --- | --- |
| Crear producto simple de Cocina | PASS. “GAP09 Plato” quedó en KITCHEN; al editar conservó la selección. [Captura](gap09-evidencia/01-producto-cocina.png). |
| Crear servicio de Barra | PASS. “GAP09 Bebida” quedó en BAR y su línea de ronda 1 conservó BAR después de editar el producto. |
| Crear pack sin configurar | PASS. “GAP09 Pendiente” quedó en null y apareció en la cola de excepción. |
| Editar producto simple | PASS. El plato cambió a BAR. Ronda 1 conservó KITCHEN y ronda 2 nació BAR. |
| Editar servicio y borrar estación | PASS. Se guardó null y luego KITCHEN; se reabrió el formulario de servicio con KITCHEN. [Móvil](gap09-evidencia/09-servicio-movil.png). |
| Editar pack | PASS. Se cambió null a BAR y se reabrió su formulario conservando BAR. [Captura](gap09-evidencia/10-pack-barra.png). |
| Validar valores | PASS automatizado. Los tres schemas aceptan KITCHEN/BAR/null/omisión y rechazan OTHER; una actualización inválida no escribe en DB. |

## Historia 2 — Operar colas separadas

Como cocinero o bartender, quiero ver y operar únicamente el trabajo de mi estación.

| Caso | Resultado y evidencia |
| --- | --- |
| Login de operadores | PASS tras reutilizar la ruta por rol. Ambos llegan a `/dashboard/kitchen`, con encabezado Cocina o Barra. |
| Ronda mixta | PASS. Se enviaron plato, bebida y pack en una sola ronda desde Mesas. ADMIN vio las tres colas. [Captura](gap09-evidencia/02-admin-colas.png). |
| Cola de Cocina | PASS. Una sola línea, el plato; no aparece la bebida ni el pack sin configurar. [Captura](gap09-evidencia/03-cocina.png). |
| Cola de Barra | PASS. La bebida de ronda 1; después también el plato de ronda 2. No aparece el plato de ronda 1. [Captura](gap09-evidencia/04-barra.png). |
| Acción manipulada | PASS. Se interceptó la petición real de “Tomar producto” de Cocina y se sustituyó el ID por el de Barra. El servidor rechazó la operación. [Captura](gap09-evidencia/05-permiso-rechazado.png). |
| Aislamiento de empresa y estación | PASS en PostgreSQL real. Consultas y operaciones rechazan otra empresa, otra estación, líneas sin configurar para operadores y roles sin acceso. |
| Excepción | PASS. ADMIN tomó el pack sin configurar y lo marcó listo. |
| Preparación | PASS. KITCHEN preparó su línea; BARTENDER preparó las dos de Barra. |
| Historial | PASS. El mismo plato tiene KITCHEN en ronda 1 y BAR en ronda 2. [Captura](gap09-evidencia/06-historico-estaciones.png). |
| Recuperación entre sesiones | PASS mediante consulta automática de respaldo. Barra recibió la nueva ronda sin recargar; Cocina y Barra recibieron el estado servido sin recargar. |
| Móvil | PASS. Las tres colas y los textos se apilan sin desbordamiento horizontal. [Captura](gap09-evidencia/07-colas-movil.png). |
| Estado vacío | PASS antes del envío: “No hay productos activos en esta estación”, sin acciones disponibles. |

El proveedor Supabase existente emitió “Cannot subscribe: not connected”. Por
ello **no se da por validada la entrega instantánea por WebSocket**. La nueva
recuperación consulta cada 15 segundos con la página visible y al volver a ella.
Se conserva la escucha de eventos para cuando el proveedor esté disponible.

## Historia 3 — Entregar una ronda mixta

Como mozo, quiero servir la ronda cuando Cocina y Barra terminen su preparación.

PASS: WAITER marcó las dos rondas como servidas; desaparecieron los botones de
entrega y quedaron cuatro líneas SERVED con usuario y fecha de entrega.
[Captura de Salón](gap09-evidencia/08-salon-servido.png).

La integración también comprobó que no se puede servir una ronda parcialmente
lista ni repetir su entrega. La primera fixture de navegador usaba un ID de mesa
no UUID; el servidor lo rechazó correctamente. Se corrigió la fixture y se
repitió el recorrido con un UUID válido, sin cambiar la validación del producto.

## Verificación técnica

Se ejecutaron tests y linter antes de cada commit, con el alcance del concepto
modificado; los resultados globales preexistentes se conservaron como referencia.

- **42 tests específicos pasan** en 9 archivos: productos, Cocina, copia de
  estaciones en rondas, cancelación y rutas de acceso por rol.
- **Lint de todos los archivos de código modificados: PASS**, sin salida de errores.
- **Integración PostgreSQL: PASS**, ejecutada con:
  `DATABASE_URL=<base-aislada> npx tsx tests/integration/preparation-stations.check.ts`.
  Crea datos propios y los elimina al terminar; verifica ronda mixta, autorización,
  cola sin configurar, transiciones, auditoría y estación histórica.
- **Suite global:** 103 tests pasan, 5 fallan; 20 archivos pasan, 2 fallan.
  Los cinco fallos esperan `createSupabaseRealtimeProvider`, exportación inexistente
  antes del cambio. La otra suite importa `cancel-table-session`, también inexistente.
- **Lint global:** 15 errores y 4 advertencias previos; al inicio eran 18 errores
  y 4 advertencias. Los tres resueltos corresponden a la redirección del login.
- **Build:** compila, pero falla TypeScript por el import previo de
  `@/shared/components/ui/alert` en `financial-block-notice.tsx`.
  Se comprobó antes y después de GAP-09; no es una regresión del cambio.

[Estado final de productos y líneas en PostgreSQL](gap09-evidencia/database-verification.json).
Los productos terminaron en estaciones diferentes de sus líneas históricas,
confirmando que la configuración no reescribe el trabajo enviado.

## Despliegue

Aplicar la migración en el entorno de destino antes de arrancar la versión.
Los productos y líneas previos quedan sin configurar; ADMIN atiende esa cola.
Los problemas generales de build, tests y lint no se consideran resueltos por GAP-09.
