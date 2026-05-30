# Fixes requeridos - Carnet de Extranjeria

## Contexto

Durante la validacion de `docs/qa-carnet-extranjeria.md` se comprobo que el flujo de Nota de venta con cliente CE permite completar la venta, pero persiste mal el tipo de documento del cliente.

Caso reproducido en QA:

- Cliente creado: `QA Cliente CE 20260530`
- CE usado: `CE20260530AB123`
- Venta generada: `NV01-00000001`
- `orderId`: `7d4eb0c6-55a0-4dd0-bed8-cabc032a6d5a`

Hallazgo confirmado en base de datos:

- El registro en `Customer` queda con `documentType = NULL`
- El `Order` queda asociado a ese cliente, pero sin tipo de documento persistido

Esto rompe los flujos que dependen de distinguir `DNI` vs `Carnet de extranjeria`.

## Problema principal

El sistema deja crear y usar un cliente CE, pero no conserva su `documentType` al persistirlo. El defecto no bloquea la venta inicial, pero invalida el comportamiento esperado en reutilizacion y comprobantes.

## Fix 1 - Persistir correctamente `CARNET_EXTRANJERIA`

### Objetivo

Garantizar que un cliente natural creado con tipo de documento CE se guarde en la tabla `Customer` con `documentType = CARNET_EXTRANJERIA`.

### Impacto actual

- La venta inicial parece exitosa.
- El dato maestro del cliente queda inconsistente.
- Cualquier logica posterior que filtre o renderice por `documentType` se rompe.

### Areas a revisar

- [src/customer/components/new-customer-modal.tsx](/Users/jorgegonzalez/lorito-killer/src/customer/components/new-customer-modal.tsx:84)
- [src/customer/db_repository.ts](/Users/jorgegonzalez/lorito-killer/src/customer/db_repository.ts:41)
- [src/customer/types.ts](/Users/jorgegonzalez/lorito-killer/src/customer/types.ts:1)

### Comportamiento esperado despues del fix

- Si el usuario selecciona `Carnet de extranjeria` en el modal:
  - el customer se crea con `documentType = CARNET_EXTRANJERIA`
  - el `documentNumber` se conserva
  - el cliente seleccionado en la orden mantiene ese tipo

### Validacion tecnica

- Crear cliente CE desde Nota de venta.
- Consultar DB y verificar:

```sql
select id, "documentType", "documentNumber", "legalName"
from "Customer"
where "documentNumber" = '<ce_creado>';
```

Resultado esperado:

- `"documentType" = 'CARNET_EXTRANJERIA'`

## Fix 2 - Permitir reutilizar clientes CE existentes

### Objetivo

Asegurar que un cliente CE ya creado aparezca en el selector de clientes cuando la orden es `ticket` o `receipt`.

### Impacto actual

El selector de clientes naturales filtra por:

- `documentType === DNI`
- `documentType === CARNET_EXTRANJERIA`

Como hoy el cliente CE queda persistido con `NULL`, desaparece de ese listado y no puede reutilizarse.

### Areas a revisar

- [src/customer/components/customer-selector.tsx](/Users/jorgegonzalez/lorito-killer/src/customer/components/customer-selector.tsx:53)
- [src/customer/db_repository.ts](/Users/jorgegonzalez/lorito-killer/src/customer/db_repository.ts:64)

### Comportamiento esperado despues del fix

- Un cliente CE existente debe aparecer al buscar por nombre.
- Un cliente CE existente debe aparecer al buscar por numero de documento.
- Debe poder seleccionarse y quedar asociado a una nueva Nota de venta.

### Validacion funcional

1. Crear cliente CE.
2. Abrir nueva Nota de venta.
3. Abrir selector de cliente.
4. Buscar por nombre.
5. Buscar por CE.

Resultado esperado:

- El cliente aparece en ambos casos y puede seleccionarse.

## Fix 3 - Mostrar "Carnet de extranjeria" en voucher/PDF

### Objetivo

Corregir la etiqueta del documento del cliente en el comprobante para que use el tipo real del cliente y no haga fallback a `DNI` cuando el cliente es CE.

### Impacto actual

La logica del voucher hace esto:

- si `customer.documentType` existe, renderiza la etiqueta correcta
- si no existe, para Nota de venta/Boleta cae en `DNI`

Con el bug actual, una venta CE puede terminar mostrando `DNI` en el comprobante.

### Areas a revisar

- [src/order/components/voucher.tsx](/Users/jorgegonzalez/lorito-killer/src/order/components/voucher.tsx:104)

### Comportamiento esperado despues del fix

- Nota de venta con cliente CE muestra `Carnet de extranjeria`.
- No debe mostrarse `DNI` para ese cliente.
- El numero de documento mostrado debe ser el CE ingresado.

### Validacion funcional

1. Crear o reutilizar cliente CE.
2. Generar Nota de venta.
3. Abrir voucher/PDF.

Resultado esperado:

- Se visualiza `Carnet de extranjeria: <numero CE>`.

## Fix 4 - Agregar cobertura automatizada y/o checks de regresion

### Objetivo

Evitar que vuelva a romperse la persistencia del tipo de documento sin detectarlo.

### Recomendacion

Agregar al menos uno de estos niveles de cobertura:

- test de repositorio para `createCustomer` con `CARNET_EXTRANJERIA`
- test de integracion del flujo crear cliente natural CE
- test E2E del flujo Nota de venta con CE

### Casos minimos a cubrir

- crea cliente con `documentType = CARNET_EXTRANJERIA`
- rechaza CE de mas de 15 caracteres
- deshabilita busqueda externa para CE
- permite reutilizar cliente CE creado
- muestra `Carnet de extranjeria` en comprobante

## Criterios de aceptacion

- `CE-01` pasa de punta a punta.
- `CE-02` pasa con validacion exacta de 15 caracteres maximos.
- `CE-03` pasa reutilizando cliente CE existente.
- `CE-04` pasa mostrando la etiqueta correcta en voucher/PDF.
- `CE-05` sigue pasando sin cambios al flujo DNI.
- `CE-06` sigue pasando y Factura continua limitada a `RUC`.

## Riesgos a revisar durante el fix

- Que el fix de CE rompa el flujo actual de DNI.
- Que el fix cambie el filtro de clientes naturales y afecte tickets/boletas existentes.
- Que el voucher siga usando un fallback incorrecto si llega data incompleta.
- Que exista otra capa de mapeo entre dominio y Prisma donde CE vuelva a perderse.

## Orden recomendado de implementacion

1. Corregir persistencia de `documentType` en creacion de cliente.
2. Revalidar selector de clientes existentes.
3. Revalidar render del voucher/PDF.
4. Agregar cobertura automatizada o checklist de regresion.
