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
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.jade-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  button-quiet:
    textColor: "{colors.jade-hover}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "10px 12px"
  navigation-selected:
    backgroundColor: "{colors.water}"
    textColor: "{colors.jade-hover}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
---

# Design System: Lorito Killer — Jade

## Overview

**Creative North Star: "Claridad cercana"**

Color presente, atención selectiva; cercanía en lenguaje y formas, precisión en jerarquía, alineación y cifras. La persona debe reconocer dónde empezar a trabajar. Vercel aporta una referencia de orden; la identidad propia combina jade, agua, lavanda y tinta verde.

Dirección y muestra conceptual aprobadas el 9 de septiembre de 2026. Este documento actualiza la definición inicial con los valores implementados en la [muestra interactiva](docs/design/jade.html), extraídos de [su CSS](docs/design/jade.css) y [sus interacciones](docs/design/jade.js). La muestra sigue siendo un prototipo independiente. La primera integración en la aplicación ya aplica Manrope local, paleta Jade, radios, foco y estados de error a las primitivas compartidas `Button`, `Input`, `MoneyInput`, `Textarea` y `SelectTrigger`. Fuentes en `public/vendor/manrope`, tema en `src/app/globals.css` y mapeo semántico en `tailwind.config.ts`. Las pantallas conservan su composición y sus estilos locales; esto no constituye el rediseño completo ni un despliegue.

La integración conserva `sm` y `xs` para controles compactos; el tamaño predeterminado pasa a 44 px. Los campos operativos mantienen 14 px de texto. Los bordes de campo usan un tono más definido que los separadores. Se mantiene una variante oscura compatible; la referencia visual aprobada sigue siendo clara. La lavanda está disponible como token semántico, pendiente de aplicación contextual en las pantallas.

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

Los pares success, warning y error con sus respectivos fondos se usan en estados con icono y texto. El verde de marca por sí solo no comunica éxito.

**The Atención selectiva Rule.** La saturación y el contraste más altos señalan lo importante; agua acompaña las selecciones y lavanda aporta un acento secundario.

## Typography

Manrope, con fallback sans-serif, se carga localmente en pesos regular y negrita. Su forma abierta aporta cercanía; los números tabulares y la alineación a la derecha aportan precisión.

El cuerpo y los títulos recurrentes están en el frontmatter. Los campos usan texto de 14 px; las etiquetas de campo son de 13 px en peso regular. La tabla usa 13 px y el texto auxiliar suele usar 11–12 px: estas medidas describen la muestra y deben revisarse en superficies operativas. El título grande «Jade» y el espécimen tipográfico no constituyen una escala de títulos de producto.

## Layout

Agrupar mediante espacio, alineación y superficies suaves. Una acción principal por contexto con alternativas de menor peso. Los pasos de espaciado del frontmatter recogen distancias repetidas, no una cuadrícula universal.

La muestra tiene fundamentos a la izquierda y primitivas interactivas a la derecha, en un contenedor de hasta 1480 px. A 1050 px reduce densidad y apila campos; a 720 px pasa a una columna con márgenes de 20 px. Desde 1450 px amplía el espacio interior. Esta composición y estos cortes describen el prototipo, no fijan la navegación futura de la aplicación. La tabla conserva desplazamiento horizontal local cuando hace falta.

## Elevation & Depth

La estructura depende de separación tonal, espacio y bordes finos. Los contenedores son planos. La navegación activa añade una línea interior jade; el aviso temporal es la única superficie con sombra exterior. El diálogo nativo oscurece el fondo para establecer prioridad. Los valores de sombra y movimiento están en el sidecar.

## Shapes

Esquinas suaves y contenidas: radio control para botones, navegación y campos; container para el panel y el diálogo; small para muestras de color y mensajes. El interruptor conserva su forma redondeada propia. Los botones principales y los campos ofrecen una altura de 44 px; la muestra de botón deshabilitado es más compacta.

## Components

- **Botones:** principal jade con texto blanco; secundario blanco con borde; discreto con texto verde. Hover intensifica o añade una superficie suave. El principal presionado usa tinta. Deshabilitado reduce opacidad; guardar muestra temporalmente un estado ocupado.
- **Campos:** fondo blanco, borde verde grisáceo, etiqueta persistente y foco jade. El error añade borde, mensaje y atributo de invalidez. La validación de la muestra comprueba nombre obligatorio y formato de correo opcional.
- **Navegación:** selección agua, texto verde profundo, negrita y línea lateral interior. La navegación de muestra cambia la selección y anuncia su nombre sin abrir módulos.
- **Filtros:** radios agrupados con selección agua; búsqueda y estado se combinan. El vacío explica cómo continuar y ofrece limpiar filtros.
- **Tabla:** separadores finos, cabecera tonal e importes alineados a la derecha con cifras tabulares. Estados con texto e icono.
- **Mensajes y diálogo:** colores semánticos acompañados de icono y texto; confirmación temporal anunciada. Diálogo nativo con cierre visible y Escape.
- **Foco y movimiento:** contorno jade de 2 px, separado 4 px en controles generales; los segmentos usan separación de 2 px. Transiciones breves y funcionales, anuladas con movimiento reducido.

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
