# GAP-08: marcar comandas como servidas

## Decisión

Una comanda seguirá representada por la ronda de una orden. No se agrega una
tabla nueva: los productos de la ronda recorren `PENDING`, `PREPARING`, `READY`
y `SERVED`; los cancelados quedan fuera del estado operativo.

## Reglas

- Cocina marca cada producto `PREPARING` como `READY` y registra usuario y fecha.
- Una ronda está lista cuando tiene productos vigentes y todos están `READY`.
- Salón puede marcar servida únicamente una ronda lista de una sesión activa.
- Servir cambia atómicamente todos los productos `READY` de la ronda a `SERVED`
  y registra usuario y fecha.
- Reintentos y solicitudes simultáneas convergen: solo la primera actualización
  cambia datos.
- Las rondas servidas permanecen visibles como historial y dejan de contar como
  listas pendientes.

## Interfaz y tiempo real

Cocina obtiene una acción “Marcar listo” para productos en preparación. Salón
muestra el número de comandas listas y ofrece “Marcar servida” por ronda lista.
Los eventos de listo y servido refrescan las vistas autorizadas sin depender del
aviso instantáneo para recuperar el estado confirmado.

## Validación

Las pruebas unitarias verifican transiciones, aislamiento por empresa, auditoría
y concurrencia. QA de navegador recorre Cocina y Salón, captura evidencia y
envía el reporte a Telegram.
