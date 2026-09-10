# GAP-09: separación de Cocina y Barra

Estado: diseño y plan QA aprobados por el usuario ("esta bien").

## Alcance

Cada producto configura una estación: Cocina, Barra o Sin configurar. Se aplica
a productos simples, packs y servicios. Un pack tiene una sola estación, sin
descomponer sus componentes. Se conservan los permisos existentes de edición
de productos.

La estación se copia desde el producto consultado en el servidor a cada línea
al enviar una ronda. Cambiar después el producto afecta únicamente a nuevos
envíos. Las líneas existentes conservan su estación y su historial.

## Alternativas y decisión propuesta

1. Copiar la estación en OrderItem y filtrar la cola existente: recomendado;
   conserva el flujo actual de preparación, cancelación y entrega.
2. Crear comandas independientes por estación: añade entidades y coordinación
   que no son necesarias para los criterios de GAP-09.
3. Consultar siempre la estación actual del producto: descartado porque mueve
   comandas históricas cuando se modifica la configuración.

## Datos y autorización

- Agregar un enum con KITCHEN y BAR y campos opcionales en Product y OrderItem.
- Los productos y líneas previos permanecen sin configurar; no se adivina su
  estación mediante nombre ni categoría.
- KITCHEN solo consulta y cambia líneas KITCHEN; BARTENDER solo líneas BAR.
- ADMIN consulta todas las estaciones, incluida la cola Sin configurar, y
  puede procesar sus productos con las transiciones existentes.
- Aplicar el filtro de estación y empresa en las consultas y actualizaciones
  condicionales del servidor. Ocultar botones no sustituye la autorización.
- Una estación omitida en una actualización de producto conserva su valor;
  null la elimina explícitamente. Rechazar valores desconocidos.

## Interfaz y operación

Los formularios de productos permiten seleccionar la estación. La pantalla de
preparación identifica la estación de cada línea y muestra al administrador
las colas Cocina, Barra y Sin configurar. Cada operador recibe solo su cola.

Una ronda mixta aparece parcialmente en ambas estaciones. Se mantiene la regla
de GAP-08: Salón puede servir la ronda cuando todos sus productos vigentes están
listos. Los productos sin estación requieren atención del administrador y no
desaparecen del trabajo pendiente. Los eventos de preparación y listo refrescan
las vistas autorizadas.

## Plan de verificación y commits

Separar los commits por concepto: datos/configuración; enrutamiento y permisos;
interfaz; evidencia QA y documentación de cierre. Ejecutar tests y linter antes
de cada commit. Ejecutar build:dev para verificar el cambio de comportamiento.
No incluir modificaciones ajenas presentes en el directorio de trabajo.

Pruebas automatizadas: valores válidos e inválidos, persistencia de estación,
snapshot de ronda mixta, aislamiento de empresa y rol al consultar/tomar/marcar
listo, excepción sin configurar e independencia del historial respecto del
producto. Conservar las verificaciones existentes de cancelación y entrega.

QA mediante qa-tester y Playwright, con capturas y reporte local:

1. Configurar productos de Cocina, Barra y Sin configurar; guardar y reabrir.
2. Enviar los tres en una ronda y comprobar las colas con ADMIN, KITCHEN y
   BARTENDER en sesiones independientes.
3. Verificar rechazo de acciones sobre otra estación o empresa.
4. Procesar la excepción como administrador y completar la preparación de
   ambas estaciones; confirmar que Salón puede servir la ronda completa.
5. Cambiar la estación de un producto y enviar otra ronda: la anterior conserva
   su estación y la nueva usa la configuración actual.
6. Verificar escritorio y móvil, estados vacíos y actualización entre sesiones.

El envío del reporte a Telegram requiere autorización explícita para enviar
mensajes; la solicitud actual autoriza las pruebas, no ese envío externo.

## Validación inicial del repositorio

Comprobada el 2026-09-09 antes de modificar implementación:

- npm test: 17 archivos pasan y 2 fallan; 91 tests pasan y 5 fallan.
  Los cinco fallos invocan createSupabaseRealtimeProvider, que no se exporta;
  otra suite importa use-cases/cancel-table-session, inexistente.
- npm run lint: 18 errores y 4 advertencias preexistentes.
- npm run build:dev: compila, pero falla la comprobación TypeScript porque
  src/restaurant/components/financial-block-notice.tsx importa el módulo
  inexistente @/shared/components/ui/alert. Proceso finalizado con código 1.
- Logs locales: /tmp/gap09-tests-baseline.log y /tmp/gap09-lint-baseline.log.
  Build: /tmp/gap09-build-baseline.log.

Estos resultados no constituyen aprobación de las compuertas de entrega.
