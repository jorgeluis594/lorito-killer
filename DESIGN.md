---
name: Lorito Killer — Jade
description: Color presente, atención selectiva; cercanía y precisión.
colors:
  jade: "#087f68"
  jade-hover: "#066551"
  water: "#d8f3ec"
  ground: "#f8faf7"
  lavender: "#ddd7f5"
  ink: "#173b33"
  muted: "#536d65"
  line: "#d2dfd8"
  surface: "#ffffff"
  success: "#08664e"
  success-bg: "#eaf7f0"
  warning: "#825008"
  warning-bg: "#fff5e5"
  error: "#b32335"
  error-bg: "#fff0f1"
typography:
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 700
  control:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4285714286
rounded:
  control: "8px"
  container: "12px"
  small: "6px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "24px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.jade}"
    textColor: "{colors.surface}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.jade-hover}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.water}"
    textColor: "{colors.jade-hover}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
    height: "44px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "8px 12px"
  navigation-selected:
    backgroundColor: "{colors.water}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
---

# Design System: Lorito Killer — Jade

## Overview

**Creative North Star: "Claridad cercana"**

Color presente, atención selectiva; cercanía en lenguaje y formas, precisión en jerarquía, alineación y cifras. La persona debe reconocer dónde empezar a trabajar. Vercel aporta una referencia de orden; la identidad propia combina jade, agua, lavanda y tinta verde.

Dirección y muestra conceptual aprobadas el 9 de septiembre de 2026. Este documento actualiza la definición inicial con los valores implementados en la [muestra interactiva](docs/design/jade.html), extraídos de [su CSS](docs/design/jade.css) y [sus interacciones](docs/design/jade.js). La muestra sigue siendo un prototipo independiente. La primera integración en la aplicación ya aplica Manrope local, paleta Jade, radios, foco y estados de error a las primitivas compartidas `Button`, `Input`, `MoneyInput`, `Textarea` y `SelectTrigger`. Fuentes en `public/vendor/manrope`, tema en `src/app/globals.css` y mapeo semántico en `tailwind.config.ts`. Las pantallas conservan su composición y sus estilos locales; esto no constituye el rediseño completo ni un despliegue.

Actualización documental basada en `src/app/globals.css`, `tailwind.config.ts`, `src/shared/components/ui/{button,input,textarea,select,card,badge,dialog}.tsx` y `src/shared/dashboard-nav.tsx`. Los tokens de componentes y las muestras del archivo complementario describen las primitivas actuales de la aplicación. La paleta, los títulos, las etiquetas y el espaciado de referencia conservan la dirección Jade aprobada; no imponen una composición uniforme a las pantallas. La revisión es de código, sin validación visual en navegador.

La integración conserva `sm` y `xs` para controles compactos; los campos usan 40 px en escritorio con puntero preciso y 44 px en móvil/táctil. Los campos operativos mantienen 14 px de texto. Los bordes de campo usan un tono más definido que los separadores. Se mantiene una variante oscura compatible; la referencia visual aprobada sigue siendo clara. La lavanda está disponible como token semántico, pendiente de aplicación contextual en las pantallas.

La [referencia conceptual aprobada](docs/design/jade-reference.png) conserva su papel de dirección visual. La muestra materializa esa dirección y permite revisar medidas y estados; los textos de demostración no son contenido aprobado para producto.

**Key Characteristics:**
- Una acción principal por contexto.
- Superficies suaves con presencia de color.
- Etiquetas visibles y cifras tabulares.

## Colors

### Primary

Jade identifica la acción principal; jade-hover intensifica su interacción. Agua mantiene la identidad en selecciones y superficies suaves sin competir por el foco.

### Secondary

Lavanda acompaña la nota de principio y la etiqueta de la muestra. Es un contrapunto, no un color de error ni de acción principal.

### Neutral

Ground sostiene el fondo cálido; surface aporta blanco a controles y áreas de trabajo. Ink da precisión a texto e importes; muted reduce el peso del texto auxiliar y line separa grupos.

Los pares success, warning y error con sus respectivos fondos se usan en el prototipo en estados con icono y texto. En la aplicación, `destructive` representa error; success y warning aún no tienen tokens semánticos globales. Los colores del frontmatter conservan la paleta del prototipo; la implementación usa los valores HSL de `globals.css`, con equivalencias de marca redondeadas. `muted` aquí nombra el texto auxiliar (`--muted-foreground`), mientras `--muted` es una superficie suave. `--input` define un borde de campo más fuerte que `--border`. La clase `.dark` reemplaza estos valores; los ejemplos consumen esas variables. El verde de marca por sí solo no comunica éxito.

**The Atención selectiva Rule.** La saturación y el contraste más altos señalan lo importante; agua acompaña las selecciones y lavanda aporta un acento secundario.

## Typography

Manrope, con fallback sans-serif, se carga localmente en pesos regular y negrita. Su forma abierta aporta cercanía; los números tabulares y la alineación a la derecha aportan precisión.

El cuerpo global y los títulos de la muestra están en el frontmatter. `control` describe el botón actual; `label` conserva la etiqueta del prototipo. `CardTitle` usa 20 px y `DialogTitle` 18 px, ambos con peso 600, interlineado 1 y espaciado −0.025em. Los pesos 500 y 600 solicitados por componentes no tienen archivos de fuente propios; solo se cargan 400 y 700. Los campos usan texto de 14 px; las etiquetas de campo son de 13 px en peso regular. La tabla usa 13 px y el texto auxiliar suele usar 11–12 px: estas medidas describen la muestra y deben revisarse en superficies operativas. El título grande «Jade» y el espécimen tipográfico no constituyen una escala de títulos de producto.

## Layout

Agrupar mediante espacio, alineación y superficies suaves. Una acción principal por contexto con alternativas de menor peso. Los pasos de espaciado del frontmatter recogen distancias repetidas, no una cuadrícula universal.

La muestra tiene fundamentos a la izquierda y primitivas interactivas a la derecha, en un contenedor de hasta 1480 px. A 1050 px reduce densidad y apila campos; a 720 px pasa a una columna con márgenes de 20 px. Desde 1450 px amplía el espacio interior. Esta composición y estos cortes describen el prototipo, no fijan la navegación futura de la aplicación. La tabla conserva desplazamiento horizontal local cuando hace falta.

La aplicación configura un contenedor centrado con relleno de 32 px y máximo de 1400 px en el corte 2xl. La barra lateral mide 288 px y aparece desde lg (1024 px); la navegación móvil usa un panel lateral. Los diálogos cambian su alineación y disposición desde sm (640 px). Estos cortes son propios de la aplicación.

## Elevation & Depth

La dirección Jade depende de separación tonal, espacio y bordes finos. En el prototipo los contenedores son planos. La navegación activa añade una línea interior jade; el aviso temporal es la única superficie con sombra exterior. El diálogo nativo oscurece el fondo para establecer prioridad. En la aplicación, `Card` conserva una sombra pequeña y `Dialog` una sombra elevada, con fondo negro al 80 %. El diálogo usa la primitiva compartida, no el diálogo HTML nativo de la muestra. Las sombras y el movimiento de ambos contextos están identificados en el archivo complementario.

## Shapes

Esquinas suaves y contenidas: radio control para botones, navegación y campos; container para el panel y el diálogo; small para muestras de color y mensajes. El interruptor conserva su forma redondeada propia. Los botones principales ofrecen 44 px; los campos usan 40 px en escritorio con puntero preciso y 44 px en móvil/táctil; la muestra de botón deshabilitado es más compacta.

## Components

- **Botones de aplicación:** `default` jade, `outline` blanco con borde, `secondary` agua, `ghost` transparente, `destructive` rojo, `ghost_destructive` rojo al pasar el puntero y `link` enlace jade. El principal mantiene jade-hover al presionar; el estado tinta pertenece al prototipo. Tamaños: predeterminado y grande 44 px, pequeño 36 px, extrapequeño 24 px, icono 44 × 44 px. Deshabilitado reduce opacidad al 50 %; `LoadingButton` sustituye el contenido por un indicador giratorio.
- **Campos de aplicación:** `Input`, `MoneyInput` y `SelectTrigger` usan `--field-height`: 40 px desde 640 px con `pointer: fine`, 44 px en los demás casos; texto 14 px y relleno 8 × 12 px; `Textarea` usa tres líneas por defecto y un mínimo de 80 px. Borde de campo, fondo de tarjeta y foco jade. `Input`, `Textarea` y `SelectTrigger` muestran borde y anillo de error con `aria-invalid`; `MoneyInput` comparte las clases pero no propaga ese atributo actualmente. Etiquetas y mensajes se componen fuera de estas primitivas.
- **Navegación de aplicación:** selección agua al coincidir exactamente la ruta, texto de 14 px y peso 500, relleno 8 × 12 px e icono de 16 px. Hover añade agua y texto verde profundo. La línea lateral y la negrita del prototipo aún no forman parte de esta navegación.
- **Tarjetas y etiquetas:** `Card` usa radio container, borde, sombra pequeña y relleno de 24 px en sus secciones. `Badge` conserva forma de píldora, texto 12 px, peso 600 y relleno 2 × 10 px; variantes principal, secundaria, destructiva y contorno. La nota y la etiqueta lavanda son ejemplos del prototipo.
- **Tablas y filtros:** las celdas de la aplicación usan cifras tabulares globalmente; la alineación de importes depende de la pantalla. Los filtros combinados, estados con icono y vacío con limpieza descritos en la muestra son patrones de referencia, no capacidades universales.
- **Diálogo:** fondo de aplicación, ancho máximo predeterminado 512 px, relleno 24 px y separación 16 px; variante lateral derecha de altura completa. El cierre visible conserva el texto accesible «Close» en el código actual.
- **Foco y movimiento:** la aplicación usa anillo de 2 px separado 2 px en botones y campos; enlaces y botones reciben también una regla global de contorno. El prototipo separa su contorno 4 px. Los botones de aplicación usan transición de color de 150 ms; las animaciones configuradas y el diálogo usan 200 ms. La regla global de movimiento reducido lleva las duraciones a 0.01 ms y desactiva el desplazamiento suave.

## Do's and Don'ts

### Do:
- Do usar jade sólido para la acción principal y agua para selecciones.
- Do mantener etiquetas visibles, foco de teclado inequívoco y estados con icono y texto.
- Do alinear importes y usar cifras tabulares.
- Do respetar movimiento reducido y describir acciones con lenguaje concreto.

### Don't:
- Don't dar igual énfasis a todas las acciones ni comunicar estados solo mediante color.
- Don't envolver cada elemento en una tarjeta ni convertir todos los controles en píldoras.
- Don't trasladar la composición de catálogo o sus datos de ejemplo a todas las pantallas.

## Densidad de formularios

`FormItem` usa grid con separación de 4 px entre etiqueta, control y error. Las filas usan 16 px; las secciones conservan 20–24 px. `MultipleSelector` comparte la altura mínima de campo y crece con su contenido. Los botones con rol combobox y la gestión de categorías usan la altura de campo; las acciones principales conservan sus tamaños. La altura está centralizada en `--field-height` en `globals.css`.
