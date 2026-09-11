# Densidad del formulario de producto

Propuesta aprobada: controles de 40 px en escritorio con puntero preciso y 44 px en móvil/táctil; etiquetas a 4 px, filas a 16 px, cabecera con padding vertical de 16 px y descripción de tres líneas. Mantener tipografía, validación, acciones fijas y scroll del cuerpo.

Orden: nombre, categoría, código/stock/unidad, precios, descripción e imágenes. Categorías admite varias líneas. Alcance: alta/edición de producto individual; sin cambiar controles compartidos ni otros formularios.

Implementación: reutilizar clases de layout en el formulario existente. Validación: ESLint, TypeScript y detector Impeccable, más inspección de escritorio y móvil cuando el navegador esté disponible.

## Extensión aprobada al sistema de diseño

El usuario aprobó aplicar el estilo a todos los formularios. La altura se centraliza en `--field-height`, consumida por Input, MoneyInput, SelectTrigger, selectores múltiples y botones combobox. FormItem proporciona el espacio de etiqueta; los formularios con agrupaciones manuales se ajustan al mismo ritmo. Textarea usa tres líneas por defecto. Se eliminan los overrides del panel de producto y se actualizan DESIGN.md, la muestra del sistema de diseño y Storybook.

Validación: TypeScript aprobado; 59 tests en 11 archivos aprobados; ESLint sin errores y con cuatro advertencias existentes de React Compiler. Detector Impeccable sin hallazgos. Verificación Playwright de producto a 1440 px (campos 40 px) y 390 px (44 px), con capturas de ambas vistas.
