# Drawer de productos

## Overview

Modo: Operate. El alta y la edición de productos y packs, junto con el alta de servicios, usan un panel lateral derecho en lugar del modal centrado. Esta extensión local hereda la identidad Jade de [DESIGN.md](../../DESIGN.md): Manrope, acción principal jade, superficies suaves y controles compartidos.

Fuentes: [producto](../../src/product/components/form/single-product-modal-form.tsx), [pack](../../src/product/components/form/package-product-modal-form.tsx) y [servicio](../../src/product/components/form/service-product-modal.tsx).

## Typography

El título del panel usa 24 px en negrita; los encabezados de sección, 16 px en negrita. La descripción secundaria y las etiquetas mantienen los estilos compartidos de la aplicación.

## Layout

El panel ocupa la altura dinámica de la ventana y todo el ancho en móvil; desde 640 px tiene un ancho máximo de 672 px. La cabecera y el pie permanecen visibles mientras el cuerpo se desplaza verticalmente. El contenido tiene márgenes interiores horizontales de 24 px, ampliados a 32 px desde 640 px. El pie respeta el área segura inferior del dispositivo.

Los datos generales preceden a las imágenes. Producto conserva precios y opciones de stock; pack conserva su selector de productos; servicio conserva sus campos de precio y descripción. Las imágenes cierran el cuerpo en una sección separada por un borde y espacio superior.

## Components

Se reutiliza `Sheet` con título, descripción y cierre superior de 44 × 44 px. El pie reúne «Cancelar» con borde y la acción principal de alta o guardado. El envío pasa por la validación existente del formulario; los mensajes de campo y los indicadores de procesamiento conservan su implementación.

## Do's and Don'ts

- Do mantener cabecera y acciones visibles al recorrer formularios largos.
- Do conservar las imágenes después de los campos principales en las tres variantes.
- Don't convertir esta composición local en una regla para todas las pantallas.

Validación registrada en esta entrega: TypeScript (`tsc`) y ESLint aprobados. Los indicadores de procesamiento conservan el texto de la acción como nombre accesible. La revisión en navegador quedó pendiente por cierre de conexión del runtime de Orca y tiempo de espera agotado del servidor local; no existe aprobación visual de este drawer. Queda por comprobar en escritorio y móvil el desplazamiento, el foco, los selectores superpuestos y el envío de las tres variantes.

## Densidad del producto individual

El alta y edición de producto individual usa filas separadas por 16 px y etiquetas a 4 px del control. Inputs, importes y unidad miden 40 px desde 640 px con puntero preciso; conservan 44 px en móvil y con puntero táctil. Categoría sigue al nombre, crece con las selecciones y alinea su botón de gestión. La cabecera usa 16 px verticales, el cuerpo 20 px y la descripción tres líneas (mínimo 80 px). Packs y servicios usan ahora la misma densidad compartida.
