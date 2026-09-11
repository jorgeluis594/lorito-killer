# Muestra interactiva Jade

Prototipo del sistema visual aprobado para Lorito Killer. HTML, CSS y JavaScript nativos, fuentes locales y datos de ejemplo; no requiere instalar dependencias ni conectarse a base de datos. La muestra no modifica datos. El tema Jade también se ha integrado en las primitivas compartidas de la aplicación; ver `DESIGN.md`.

Desde la raíz del proyecto:

```sh
python3 -m http.server 4318 --bind 127.0.0.1 --directory docs/design
```

Abrir [la muestra Jade](http://127.0.0.1:4318/jade.html). También se puede abrir `jade.html` directamente; si el navegador restringe el portapapeles, la muestra presenta el código para copiarlo manualmente.

## Qué probar

- Copiar colores; cambiar la selección de navegación.
- Guardar un nombre válido, dejarlo vacío o introducir un correo inválido.
- Ver el estado de carga y restablecer durante un guardado.
- Buscar registros, combinar búsqueda con estado y limpiar filtros desde el resultado vacío.
- Abrir detalles, recorrer el diálogo con Tab y cerrarlo con Escape.
- Usar checkbox y switch con teclado, y reducir el ancho de la ventana.

El guardado es una simulación local de 700 ms. Las opciones y los valores se restablecen al recargar. El panel de mensajes muestra ejemplos simultáneos, no tres notificaciones reales.

## Validación realizada

9 de septiembre de 2026: comprobación de búsqueda, filtros combinados, vacío, validación, carga, guardado, cancelación mediante reset, diálogo, navegación, fuentes y ausencia de desbordamiento horizontal a 1440 y 390 px. Pruebas adicionales con Playwright: foco del diálogo, Escape, devolución del foco, switch por teclado y movimiento reducido.

Las capturas y los scripts de revisión se conservan localmente y no se versionan.

`node --check docs/design/jade.js` pasó. Las combinaciones principales de texto y superficie comprobadas superan 4.5:1; blanco sobre jade alcanza 4.95:1. Esto no equivale a una auditoría completa de accesibilidad.

Capturas Playwright en `.impeccable/review/desktop.png` y `mobile.png`; revisión independiente: `disposition: ship`. Se descartaron las capturas de Orca porque repetían partes de la página.

`npm run lint` y `npm run build:dev` no pudieron arrancar: este checkout no tiene las dependencias instaladas (`eslint` y `next` no encontrados). El detector Impeccable solo pudo ejecutar su modo regex por ausencia de sus parsers: no reportó hallazgos, pero no evaluó selectores ni contraste calculado.

## Archivos

- `jade.html`, `jade.css`, `jade.js`: muestra y comportamiento.
- `jade-reference.png`: referencia conceptual aprobada.
- `fonts/`: Manrope regular y bold con licencia OFL. Archivos descargados de Google Fonts, familia [Manrope](https://fonts.google.com/specimen/Manrope).
- `../../DESIGN.md`: reglas y valores del sistema.

La primera integración aplica colores, Manrope, radios y estilos de botones/campos compartidos. La validación visual de la aplicación cubre la pantalla de acceso a 1440 y 390 px: fuentes cargadas, campos de 44 px y radio de 8 px, navegación con teclado, errores y ausencia de desbordamiento. Capturas: `.impeccable/review/app-desktop.png` y `app-mobile.png`. El resto de pantallas y los flujos autenticados todavía requieren revisión por superficie.

Tras instalar dependencias, el build y TypeScript pasan, al igual que ESLint dirigido a los archivos modificados. El lint global reporta 18 errores y 4 advertencias en otros archivos sin modificar.

La compatibilidad del tema oscuro se verificó también en navegador. `dark` queda en la lista de clases conservadas de Tailwind para que sus variables no se eliminen del CSS compilado. La familia se sirve desde `/vendor/manrope/`, ruta estática ya excluida del proxy multiempresa. No se cambiaron autenticación, pagos ni lógica de importes.
