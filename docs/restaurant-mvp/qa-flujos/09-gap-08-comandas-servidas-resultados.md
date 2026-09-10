# QA GAP-08 — Marcar comandas como servidas

Fecha: 2026-09-09  
Resultado: **APROBADO**

## Flujo validado

1. Cocina recibe un producto pendiente y lo toma.
2. Cocina marca el producto como listo; la comanda muestra `Listo`.
3. Salón muestra `1 lista` en la mesa y habilita `Marcar comanda servida`.
4. Al servirla, el producto muestra `Servido` y `Entregado por QA Admin`.
5. Al volver al mapa de mesas, el contador de comandas listas desaparece.
6. La acción para servir deja de estar disponible, evitando repetirla desde la interfaz.

## Evidencia

- `qa-gap08-03-kitchen-ready.png`
- `qa-gap08-04-salon-counter.png`
- `qa-gap08-05-served-success.png`

La concurrencia y el rechazo de una segunda transición están cubiertos por
`src/kitchen/__TEST__/served-kitchen-ticket.test.ts`.
