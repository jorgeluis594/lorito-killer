# Estilo y convenciones de programacion

## Resumen

Lorito Killer es un POS multi-tenant organizado por features de dominio. El estilo preferido es funcional: funciones pequenas, datos explicitos, composicion de casos de uso e inyeccion de dependencias mediante funciones u objetos con funciones. El codigo nuevo debe evitar clases de servicio y evitar que los use-cases importen infraestructura concreta.

## Entidades y features principales

Las entidades persistidas viven en `prisma/schema.prisma`. Actualmente el dominio incluye:

- Catalogo: `Product`, `PackageItem`, `Photo`, `Category`.
- Ventas: `Order`, `OrderItem`, `Payment`, `Document`, `DocumentTaxDispatch`.
- Operacion: `CashShift`, `StockTransfer`, `Table`, `TableSession`, `Zone`.
- Personas y tenant: `Company`, `CompanyFeature`, `Logo`, `User`, `Customer`, `Locality`.

Las features se agrupan en carpetas bajo `src/`: `product`, `order`, `document`, `cash-shift`, `stock-transfer`, `table`, `user`, `customer`, `seller`, `company`, `category`, `locality`, `printing`, etc.

## Estructura por feature

El patron usual de una feature es:

- `types.ts`: tipos de dominio y type guards.
- `schema.ts` o `schemas/`: validacion de entrada con Zod.
- `db_repository.ts`: acceso a Prisma, queries, mappers Prisma -> dominio.
- `api_repository.ts`: llamadas desde cliente a endpoints/actions cuando aplica.
- `actions.ts`: Server Actions protegidas, validacion de permisos, revalidacion y orquestacion.
- `use-cases/` o `use_cases/`: reglas de negocio puras o casi puras.
- `components/`: UI de la feature.
- `__TEST__/`: tests de unidad cercanos a la feature.

## Estilo funcional

El codigo de dominio debe modelarse como funciones, no como servicios con estado. La entrada y salida deben ser explicitas:

- Usar `response<T>` como contrato de exito/error.
- Preferir funciones puras para calculos y validaciones.
- Mantener mutaciones, IO, Prisma, cache y side effects fuera del nucleo del use-case.
- Componer funciones pequenas antes que crear abstracciones grandes.
- Usar discriminated unions y type guards para variantes de dominio, por ejemplo tipos de producto o documento.

Ejemplos de patrones existentes: calculos de orden, validacion de descuentos, generacion de stock transfers, construccion de documentos y validaciones por tipo de producto.

## Inyeccion de dependencias

La convencion madura del repo es inyectar dependencias en los use-cases. Un use-case no debe importar directamente `db_repository`, gateways externos, Prisma, cache ni sesiones. Esas dependencias se conectan desde el borde de la aplicacion: `actions.ts`, jobs, route handlers o workers.

Forma recomendada:

```ts
interface Repository {
  findProduct: (productId: string) => Promise<response<Product>>;
  createStockTransfer: (
    stockTransfer: StockTransfer,
  ) => Promise<response<StockTransfer>>;
  updateStock: (stockTransfer: StockTransfer) => Promise<response<undefined>>;
}

export async function updateStock(
  userId: string,
  order: Order,
  repository: Repository,
): Promise<response<undefined>> {
  // reglas de negocio usando repository.*
}
```

Tambien es valido inyectar una funcion suelta cuando solo se necesita una capacidad:

```ts
type FindProduct = (productId: string) => Promise<response<Product>>;
```

En `actions.ts` se hace el wiring:

```ts
await updateStock(user.id, order, {
  findProduct,
  createStockTransfer,
  updateStock: updateStockFromRepository,
});
```

Si un use-case importa repositorios directamente, considerarlo legacy o deuda tecnica. No copiar ese patron para codigo nuevo.

## Responsabilidades por capa

`use-cases/`:

- Contienen reglas de negocio.
- Reciben dependencias por parametro.
- Retornan `response<T>`.
- No conocen Next.js, Prisma, rutas, cache, sesiones ni UI.

`actions.ts`:

- Son el borde server-side para UI.
- Usan `protectedAction` para auth/autorizacion.
- Agregan `companyId` desde el usuario autenticado.
- Validan inputs con Zod cuando aplica.
- Orquestan transacciones, revalidaciones y broadcast.
- Inyectan repositorios/gateways en use-cases.

`db_repository.ts`:

- Es la unica capa que debe conocer Prisma para esa feature.
- Encapsula queries, includes, transacciones especificas y mapeos.
- Debe filtrar por `companyId` para preservar multi-tenancy.
- Devuelve tipos de dominio, no modelos Prisma crudos cuando el dominio necesita otra forma.

`api_repository.ts`:

- Es el adaptador de cliente para consumir APIs/actions.
- No debe contener reglas de negocio.

`components/`:

- UI y estado de presentacion.
- Usan stores/hooks solo para interaccion de cliente.
- Delegan persistencia y reglas a actions/repositorios API.

## Validacion y errores

- Validar datos externos con Zod en schemas de la feature.
- Usar `safeParse` y devolver `response<T>` con mensajes controlados.
- Evitar `throw` para errores esperados de negocio.
- Reservar excepciones para estados imposibles o errores de programacion.
- Los mensajes de negocio suelen estar en espanol.

## Multi-tenancy y permisos

- Toda lectura/escritura de datos tenant-aware debe estar acotada por `companyId`.
- Las Server Actions usan `protectedAction({ resource, action }, handler)`.
- El `companyId` confiable viene del usuario autenticado, no del cliente.
- Roles/permisos se validan en el borde, antes de ejecutar el caso de uso.

## Transacciones y side effects

- Las transacciones se orquestan desde el borde con `withinTransaction` cuando el flujo cruza varias escrituras.
- Los side effects posteriores, como revalidacion, colas, broadcast o notificaciones, deben vivir fuera del nucleo de negocio.
- Para integraciones externas, usar gateways inyectados, por ejemplo facturacion/documentos.

## Convenciones de nombres

- Carpetas de feature en kebab-case: `cash-shift`, `stock-transfer`, `new-order`.
- Componentes mayormente en kebab-case: `customer-selector.tsx`, `table-grid.tsx`.
- Mantener snake_case solo donde la feature ya lo usa.
- Repositorios: `db_repository.ts` y `api_repository.ts`.
- Use-cases: nombres verbales y especificos: `build-and-persist-document`, `process-stock-transfer`, `calculate-order-item-totals`.
- Constantes de discriminantes en Pascal/CAPS segun el patron local: `SingleProductType`, `KG_UNIT_TYPE`.

## Testing

- Usar Vitest.
- Ubicar tests cerca de la feature, preferentemente en `__TEST__/`.
- Priorizar tests de use-cases y funciones puras.
- La inyeccion de dependencias debe permitir mocks simples sin tocar Prisma, Next.js ni servicios externos.

## Regla practica para codigo nuevo

1. Definir tipos de dominio en `types.ts`.
2. Definir validacion externa en `schema.ts`.
3. Escribir el use-case como funcion pura o con dependencias inyectadas.
4. Implementar persistencia en `db_repository.ts`.
5. Hacer el wiring en `actions.ts` o en el job/route correspondiente.
6. Agregar tests del use-case con dependencias falsas cuando haya reglas de negocio.
