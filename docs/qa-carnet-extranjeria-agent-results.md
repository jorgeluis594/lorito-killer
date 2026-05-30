# QA Carnet de Extranjeria - Resultados resumidos

Fecha: 2026-05-30
Base URL: `http://localhost:3000`
Tenant probado: `fantastidog`
Estado general: `PARTIAL` con bug funcional `P0` confirmado

## Resumen ejecutivo

Se ejecuto QA funcional sobre el flujo de cliente con Carnet de Extranjeria en Nota de venta.

El flujo UI permite:

- abrir Nueva venta
- crear cliente CE
- validar maximo de 15 caracteres
- dejar deshabilitada la busqueda externa para CE

Pero se confirmo un defecto critico:

- el cliente CE se persiste con `Customer.documentType = NULL`

Ese defecto rompe o deja en riesgo:

- reutilizacion del cliente CE en ventas posteriores
- etiqueta correcta en voucher/PDF

## Resultado por caso

### CE-01 Crear nota de venta con cliente CE nuevo

Estado: `PARTIAL`

Validado:

- En Nota de venta el modal permite `DNI` y `Carnet de extranjeria`
- Al seleccionar CE, la busqueda externa queda deshabilitada
- Se pudo crear un cliente CE y quedo seleccionado en la orden

Observacion:

- La persistencia del tipo de documento falla en DB

### CE-02 Validar longitud del CE

Estado: `PASS`

Validado:

- CE de 16 caracteres: muestra validacion `El número máximo de caracteres es 15.`
- CE de 15 caracteres alfanumericos: permite guardar

### CE-03 Reutilizar cliente CE existente

Estado: `FAIL`

Resultado:

- Tras crear el cliente CE, al buscarlo por numero en el selector de cliente no aparece
- Evidencia consistente con persistencia incorrecta de `documentType`

### CE-04 Validar etiqueta en comprobante

Estado: `AT RISK / NO CONFIRMADO EN UI`

No se cerro validacion visual de voucher/PDF en esta corrida.

Riesgo confirmado por logica y persistencia:

- como `customer.documentType` queda `NULL`, el voucher puede caer al fallback `DNI`

### CE-05 DNI en nota de venta

Estado: `PASS`

Validado:

- El modal abre por defecto con `DNI` en Nota de venta

### CE-06 Factura no permite CE

Estado: `BLOCKED`

Bloqueo de entorno:

- `Boleta` y `Factura` estaban deshabilitadas en este tenant por configuracion de facturacion

## Bug principal confirmado

### P0 - Cliente CE persistido sin tipo de documento

Cliente creado en QA:

- `documentNumber`: `CEQA20260530001`
- `legalName`: `QA Cliente CE Final`

Consulta ejecutada:

```sql
select id, "documentType", "documentNumber", "legalName"
from "Customer"
where "documentNumber" = 'CEQA20260530001';
```

Resultado:

- el registro existe
- `documentType` queda `NULL`

## Edge cases cubiertos

- CE de 16 caracteres
- CE alfanumerico de 15 caracteres
- default del modal en `DNI`
- busqueda externa deshabilitada para CE
- busqueda posterior del cliente CE por numero

## Evidencia creada

- [qa-ce-01-orders-new.png](/Users/jorgegonzalez/lorito-killer/qa-ce-01-orders-new.png)
- [qa-ce-02-modal-default-dni.png](/Users/jorgegonzalez/lorito-killer/qa-ce-02-modal-default-dni.png)
- [qa-ce-03-validation-16-chars.png](/Users/jorgegonzalez/lorito-killer/qa-ce-03-validation-16-chars.png)
- [qa-ce-04-customer-created-selected.png](/Users/jorgegonzalez/lorito-killer/qa-ce-04-customer-created-selected.png)
- [qa-ce-05-selector-customer-not-found.png](/Users/jorgegonzalez/lorito-killer/qa-ce-05-selector-customer-not-found.png)

## Conclusiones

La funcionalidad no esta lista para cierre.

Lo mas importante no es la validacion visual del modal, sino la persistencia:

- el sistema deja avanzar con CE
- pero guarda mal el dato maestro

Eso convierte el flujo en inconsistente y deja roto el caso de reutilizacion, ademas de comprometer el comprobante.
