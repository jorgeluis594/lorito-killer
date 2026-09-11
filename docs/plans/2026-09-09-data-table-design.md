# DataTable — API y diseño aprobados

Wrapper de las primitivas shadcn existentes, con identidad Jade: cabecera tonal, separadores finos, filas legibles, selección agua e importes alineados con cifras tabulares. Conserva una tabla semántica. La prueba de productos reorganiza sus mismas celdas como lista compacta en móvil mediante CSS, sin duplicar filas ni controles. Las tablas sin esta composición mantienen desplazamiento horizontal local.

- `data: readonly T[]` o `loadData: () => Promise<readonly T[]>`, mutuamente excluyentes.
- `columns`: `id`, `header`, `cell(row)` y `align` opcional.
- `getRowId` y `caption` obligatorios; `emptyMessage`, `isLoading`, `skeletonRows` opcionales. `className` permite aplicar la composición visual al contenedor, también durante la carga.
- `DataTableSkeleton` reutiliza las columnas y acepta `rows` (5 por defecto).
- `loadData` se invoca sin esperar; un hijo lee su promesa con React.use dentro del Suspense interno. El fallback conserva cabecera y cantidad solicitada de filas. Los errores se propagan al límite de errores de la pantalla.
- En servidor, definir columnas y loader en componentes de servidor. No pasar funciones normales a través del límite servidor–cliente. Los loaders deben aplicar autorización y aislamiento por compañía en el repositorio/use-case correspondiente.
- En cliente, usar `data` e `isLoading`. Storybook usa un loader de demostración sin acceso al backend para mostrar la transición real de Suspense.
- Para reiniciar la carga al cambiar filtros/página, dar a DataTable una `key` basada en esos parámetros. Suspense no garantiza mostrar el fallback si los datos ya están disponibles.

La tabla anterior con TanStack se conserva como `InteractiveDataTable` para mantener sus consumidores actuales. La nueva API no incorpora búsqueda ni paginación implícitas.

## Uso en servidor

```tsx
<DataTable
  caption="Productos"
  columns={columns}
  getRowId={(product) => product.id}
  loadData={() => getProducts({ companyId })}
  skeletonRows={5}
/>
```

## Verificación

Storybook: datos, vacío, skeleton, carga controlada, Suspense con recarga, móvil, tema oscuro y acciones. Check automatizado: renderizado y streaming del skeleton antes de los datos, con una sola invocación del loader.
