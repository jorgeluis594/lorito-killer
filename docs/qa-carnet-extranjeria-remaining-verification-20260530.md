# QA Carnet de Extranjeria - Verificacion restante

Fecha: 2026-05-30
Base URL: `http://localhost:3000`
Tenant UI probado: `fantastidog`

## Estado ejecutivo

- CE-04 Voucher/PDF Nota de venta con cliente CE: `PASS`
- CE-06 Factura fuerza RUC y oculta CE: `BLOCKED`
- Estado general de esta corrida restante: `BLOCKED`

El flujo restante de Nota de venta si quedo validado hasta el comprobante final. El flujo de `Factura` no pudo cerrarse porque el unico tenant disponible en el entorno local no tiene facturacion habilitada y no existe otro tenant local con `billingToken`.

## Alcance ejecutado

1. Login con `jorg3.594@gmail.com`
2. Nueva venta en `fantastidog`
3. Creacion de cliente CE nuevo:
   - Nombre: `QA Cliente CE Voucher`
   - Documento: `CEQA20260530031`
4. Agregado de producto y pago de la Nota de venta
5. Apertura automatica del documento en `/api/orders/58b179cc-1f34-40bc-9295-c4e48a4b3004/documents`
6. Revision del comprobante renderizado
7. Verificacion del estado de `Factura` en UI
8. Verificacion de configuracion local en DB

## Resultado por caso

### CE-04 Validar etiqueta en comprobante

Estado: `PASS`

Resultado observado:

- La venta se completo exitosamente.
- El sistema abrio el documento de la orden en una nueva pestana.
- En el PDF/voucher renderizado se lee:
  - `Cliente: QA Cliente CE Voucher`
  - `Carnet de extranjeria: CEQA20260530031`
- No se observa fallback a `DNI`.

Evidencia:

- Screenshot del documento renderizado:
  - [qa-ce-08-document-tab.png](/Users/jorgegonzalez/lorito-killer/qa-ce-08-document-tab.png)

### CE-06 Factura no permite CE

Estado: `BLOCKED`

Bloqueo observado en UI:

- En `fantastidog`, las tabs `Boleta` y `Factura` aparecen deshabilitadas en `Nueva venta`.
- Por lo tanto no fue posible abrir el modal de nuevo cliente dentro del flujo `Factura`.

Evidencia UI:

- [qa-ce-09-fantastidog-factura-disabled.png](/Users/jorgegonzalez/lorito-killer/qa-ce-09-fantastidog-factura-disabled.png)

Evidencia tecnica de configuracion:

Consulta ejecutada en la DB local:

```sql
select subdomain,
       case
         when "billingCredentials" is null then false
         else (("billingCredentials"::jsonb ->> 'billingToken') is not null)
       end as has_billing_token
from "Company"
order by subdomain;
```

Resultado:

```text
  subdomain  | has_billing_token
-------------+-------------------
 fantastidog | f
(1 row)
```

Conclusion del bloqueo:

- El entorno local solo contiene la company `fantastidog`.
- `fantastidog` no tiene `billingCredentials.billingToken`.
- No existe en este entorno otra company facturable para probar `Factura` sin tocar codigo o datos de aplicacion.

## Screenshots creados en esta corrida

- [qa-ce-08-document-tab.png](/Users/jorgegonzalez/lorito-killer/qa-ce-08-document-tab.png)
- [qa-ce-09-fantastidog-factura-disabled.png](/Users/jorgegonzalez/lorito-killer/qa-ce-09-fantastidog-factura-disabled.png)

## Cierre

La verificacion restante queda cerrada con este estado:

- `PASS` para voucher/PDF de Nota de venta con cliente CE
- `BLOCKED` para `Factura` por falta de tenant local con facturacion habilitada
