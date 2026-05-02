# UX / Flujos de Experiencia de Usuario — MVP Restaurante y Bar
## Lorito Killer POS — Modulo de Restaurante

**Version:** 1.0
**Fecha:** 2026-03-07

---

## 1. Principios de Diseno para el MVP

### Contexto de Uso Real

```
CONDICIONES DE USO CRITICAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Luz ambiente      →  Local oscuro/tenue + pantalla brillante
  Manos ocupadas    →  Mozo con platos, cajero con billetes
  Ruido             →  Musica alta, conversaciones, cocina
  Velocidad         →  Mesa esperando, cocina bajo presion
  Estres            →  Hora pico = errores humanos maximos
  Superficie sucia  →  Pantalla con grasa, agua, condimentos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Dispositivos Objetivo

```
PRIORIDAD 1 — Tablet (Principal)
  Tamano: 10-11 pulgadas (iPad / Samsung Tab)
  Uso: POS principal, mozo, cocina, caja

PRIORIDAD 2 — Movil (Secundario)
  Tamano: 6 pulgadas
  Uso: Mozo en sala consultando estado

PRIORIDAD 3 — Monitor Fijo (Cocina)
  Tamano: 15-24 pulgadas montado en pared
  Uso: KDS, lectura a distancia
```

### Los 7 Principios UX

```
P1. CERO CLICS INNECESARIOS
    Accion critica en max 3 toques desde cualquier punto.

P2. BOTONES DE TAMANO GORILA
    Minimo 56px alto en acciones primarias.
    Minimo 44px en secundarias.
    Espaciado minimo 8px entre botones adyacentes.

P3. FEEDBACK INMEDIATO E INEQUIVOCO
    Toda accion con respuesta visual en < 200ms.
    Colores saturados: verde brillante, rojo vivo, amarillo.
    No pasteles en entornos oscuros.

P4. CONFIRMACIONES SOLO LO NECESARIO
    Sin confirmacion para: agregar item, aumentar cantidad.
    Con confirmacion para: cancelar pedido, liberar mesa,
    aplicar descuento > 20%.

P5. RECUPERACION DE ERROR FACIL
    Siempre permitir deshacer ultima accion.
    Cancelaciones con razon seleccionable (no texto libre).

P6. ROLES Y VISTAS ESPECIFICAS
    El mozo no ve opciones de admin.
    La cocina no ve precios ni datos de pago.
    El cajero ve primero las cuentas pendientes.

P7. ORIENTACION LANDSCAPE OBLIGATORIA (Tablet)
    Mapa de mesas y KDS: landscape.
    Toma de pedido: puede ser portrait en movil.
```

---

## 2. Arquitectura de Informacion

### Mapa del Sistema

```
[subdomain].lorito.app
│
├── /login                          ← Todos los roles
│
└── /dashboard
    │
    ├── /mesas                      ← NUEVO (MVP)
    │   └── /mapa                   ← Mapa interactivo
    │
    ├── /cocina                     ← NUEVO (MVP)
    │   └── /kds                    ← Kitchen Display System
    │
    ├── /orders                     ← Existente (adaptado)
    │
    ├── /delivery                   ← NUEVO (MVP)
    │
    ├── /cash_shifts                ← Existente
    ├── /sales_reports              ← Existente
    ├── /products                   ← Existente
    └── /settings
        └── /company
            └── /mesas              ← NUEVO: configurar layout
```

### Landing por Rol al Hacer Login

```
ROL             → PANTALLA INICIAL
────────────────────────────────────────────────
Administrador   → Dashboard con KPIs del dia
Mozo            → Mapa de mesas (su zona)
Cocina          → KDS — comandas activas
Cajero          → Mapa de mesas (vista cobro)
Bartender       → KDS filtrado por Barra
```

### Navegacion por Rol

```
ADMINISTRADOR: Todo el sistema
CAJERO:        Mapa de mesas, cobro, caja, reportes del turno
MOZO:          Mapa de mesas, toma de pedido, estado de sus ordenes
COCINA:        Solo KDS (pantalla dedicada)
BARTENDER:     KDS filtrado por categoria Barra
```

---

## 3. Flujos de Usuario Detallados

---

### FLUJO 1: Mozo — Tomar Pedido en Mesa

```
[LOGIN]
   │
   ▼
┌──────────────────────────────────────────────────────────────┐
│              MAPA DE MESAS — Vista Mozo                      │
│                                                              │
│  [Mesa 1]  [Mesa 2]  [Mesa 3]  [Mesa 4]                     │
│  LIBRE     OCUPADA   LISTA     LIBRE                         │
│  (verde)   (rojo)    (amarillo)(verde)                       │
│                                                              │
│  [Mesa 5]  [Mesa 6]  [Mesa 7]  [Mesa 8]                     │
│  OCUPADA   LIBRE     OCUPADA   LIBRE                         │
└──────────────────────┬───────────────────────────────────────┘
                       │ Toca mesa LIBRE
                       ▼
              ┌────────────────────┐
              │ ¿Abrir mesa?       │
              │ Mesa #1 / Terraza  │
              │                    │
              │ [CANCELAR]         │
              │ [ABRIR MESA]       │  ← verde, 56px
              └─────────┬──────────┘
                        │ Confirma
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              VISTA DE TOMA DE PEDIDO — Mesa #1              │
├──────────────────────────┬──────────────────────────────────┤
│   MENU (izquierda)       │   PEDIDO ACTUAL (derecha)        │
│                          │                                   │
│ [Entradas] [Fondos]      │  Mesa 1 — 0 items — S/ 0.00     │
│ [Bebidas]  [Postres]     │  ─────────────────────────────   │
│                          │  (lista vacia)                   │
│ ┌────────┐ ┌────────┐    │                                   │
│ │Ceviche │ │Lomo    │    │                                   │
│ │S/ 28   │ │S/ 35   │    │                                   │
│ └────────┘ └────────┘    │                                   │
│                          │  [NOTAS PARA COCINA]             │
│ [Buscar producto...    ] │  [ENVIAR A COCINA] ← verde       │
└──────────────────────────┴──────────────────────────────────┘
         │ Toca producto
         ▼
┌────────────────────────────────────────────────┐
│  Ceviche de pescado             S/ 28.00        │
│  Cantidad:   [ - ]  [ 1 ]  [ + ]               │
│  Notas:  [Sin cebolla...                     ]  │
│  [CANCELAR]           [AGREGAR AL PEDIDO]       │
└────────────────────────────────────────────────┘
         │ Agrega items
         ▼
         Pedido acumulado en la derecha
         │ Toca "ENVIAR A COCINA"
         ▼
┌─────────────────────────────────┐
│  Confirmar envio a cocina       │
│  3 items para Mesa 1            │
│  [CANCELAR]   [ENVIAR]          │
└──────────────────┬──────────────┘
                   │
                   ▼
    Toast: "Pedido enviado a cocina!" (2s, verde)
                   │
                   ▼
    Vuelve a MAPA DE MESAS
    Mesa 1 → OCUPADA (rojo)
                   │
                   │ ... cocina marca LISTO ...
                   │
    Mesa 1 → parpadea amarillo "LISTO!"
                   │
                   │ Mozo sirve
                   │ Cliente pide cuenta → [PEDIR CUENTA]
                   │
    Mesa 1 → CUENTA_PEDIDA (azul)
                   │
    Cajero procesa cobro → Mesa 1 → LIBRE (verde)
```

---

### FLUJO 2: Cocina — Gestion de Comandas (KDS)

```
[LOGIN como COCINA — o PIN de 4 digitos]
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│        PANTALLA KDS — COCINA (dark mode)                    │
│        [PENDIENTES (3)]  [EN PREP (2)]  [LISTOS (1)]        │
├───────────────┬────────────────┬────────────────────────────┤
│  MESA 3       │  MESA 1        │  DELIVERY #45              │
│  14:28 [17m]  │  14:41 [4m]   │  14:30 [15m]               │
│  Juan (mozo)  │  Maria (mozo)  │  Cliente: Lopez            │
│  ────────── │  ────────────  │  ─────────────────────      │
│  [ ] Ceviche  │  [x] Pollo x2  │  [ ] Anticuchos x2         │
│  [ ] Lomo x2  │  [ ] Arroz x2  │  [ ] Papa Huanc x1         │
│  sin cebolla  │                │                            │
│  [ ] Chicha   │                │                            │
│               │                │                            │
│  [EN PREP]    │  [LISTO]       │  [EN PREP]                 │
│  (azul)       │  (verde)       │  (azul)                    │
└───────────────┴────────────────┴────────────────────────────┘

Nuevo pedido llega:
  → Sonido de alerta + tarjeta aparece en PENDIENTES
  → Cocinero toca [EN PREP] → timer activo
  → Toca items individuales [x] al terminarlos
  → Todos listos → toca [LISTO]
  → Tarjeta desaparece
  → Mapa de mesas del mozo/cajero actualiza a amarillo
```

**Codigo de color por tiempo:**
```
< 10 min  → fondo normal (gris oscuro en dark mode)
10-20 min → borde/fondo amarillo
> 20 min  → borde/fondo rojo + animacion de alerta
```

---

### FLUJO 3: Cajero — Cobro y Cierre de Mesa

```
[LOGIN como CAJERO]
   │
   ▼ Verificar turno de caja
   ├── NO hay turno → [ABRIR TURNO] → monto inicial
   └── SI hay turno → continua
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│           MAPA DE MESAS — Vista Cajero                       │
│  [2 CUENTAS PENDIENTES]     Ventas hoy: S/ 1,240             │
│                                                              │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐             │
│  │Mesa 1  │  │Mesa 2  │  │Mesa 3  │  │Mesa 4  │             │
│  │LIBRE   │  │OCUPADA │  │CUENTA  │  │LIBRE   │             │
│  │        │  │Juan    │  │PEDIDA  │  │        │             │
│  │        │  │42min   │  │Maria   │  │        │             │
│  └────────┘  └────────┘  └────────┘  └────────┘             │
└──────────────────────────────┬───────────────────────────────┘
                               │ Toca Mesa 3 (CUENTA PEDIDA)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│              VISTA CUENTA — MESA 3                           │
│  Mesa 3 / Mozo: Juan                   14:28 (42 min)        │
│  ─────────────────────────────────────────────────           │
│  Ceviche de pescado      x1       S/  28.00                  │
│  Lomo saltado            x2       S/  70.00                  │
│  Pisco sour              x1       S/  22.00                  │
│  Inca Kola               x2       S/  16.00                  │
│  ─────────────────────────────────────────────────           │
│  Subtotal:                        S/ 136.00                  │
│  Descuento:                       S/   0.00                  │
│  TOTAL:                           S/ 136.00                  │
│  ─────────────────────────────────────────────────           │
│  Documento: ( ) Ticket  ( ) Boleta  ( ) Factura              │
│  [APLICAR DESCUENTO]    [DIVIDIR CUENTA]                     │
│  [COBRAR]  ← verde grande                                    │
└────────────────────────────┬─────────────────────────────────┘
                             │ Toca COBRAR
                             ▼
┌──────────────────────────────────────────────────────────────┐
│               MODO DE PAGO — S/ 136.00                       │
│  [EFECTIVO]    [TARJETA]    [BILLETERA]    [MIXTO]           │
└────────────────────────────┬─────────────────────────────────┘
                             │ Elige EFECTIVO
                             ▼
┌──────────────────────────────────────────────────────────────┐
│  Total: S/ 136.00                                            │
│  Recibido: [        ]  ← numpad tactil (64px por tecla)      │
│  Atajos: [S/140] [S/150] [S/200] [EXACTO]                   │
│  Vuelto: S/ 14.00  ← calculo en tiempo real                  │
│  [CONFIRMAR COBRO]  ← verde                                  │
└────────────────────────────┬─────────────────────────────────┘
                             │ Confirma
                             ▼
  "Generando documento..." (spinner)
                             │
                             ▼
  PAGO EXITOSO — Ticket T001-00234
  [VER/IMPRIMIR]    [LIBERAR MESA]
                             │
                             ▼
  Mesa 3 → LIBRE (verde)
```

---

### FLUJO 4: Delivery

```
ENTRADA DEL PEDIDO (telefono, WhatsApp, etc.)
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│              NUEVO PEDIDO DELIVERY                           │
│                                                             │
│  Cliente: [nombre]         Tel: [numero]                    │
│  Direccion: [_________________________________]             │
│  Referencia: [________________________________]             │
│                                                             │
│  [SELECCIONAR PRODUCTOS → mismo flujo de pedido]            │
│                                                             │
│  Notas: [_________________________________________]         │
│  [CREAR PEDIDO DELIVERY]                                    │
└──────────────────────────────┬──────────────────────────────┘
         │ Creado
         ▼
    Aparece en KDS con etiqueta "DELIVERY #45"
         │
         │ Cocina lo prepara y marca LISTO
         ▼
    Notificacion al cajero/receptor
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  DELIVERY #45 — Lopez — LISTO PARA DESPACHAR                 │
│  Repartidor: [Seleccionar v]                                 │
│  [DESPACHAR]                                                 │
└──────────────────────────────┬───────────────────────────────┘
         │ Despacha
         ▼
    Estado → EN_CAMINO
         │
         │ Repartidor regresa / confirma
         ▼
┌──────────────────────────────────────────────────────────────┐
│  Confirmar entrega #45                                       │
│  [EFECTIVO]  [POS MOVIL]  [YA COBRADO]                      │
│  [CONFIRMAR ENTREGADO]                                       │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
    Pedido cerrado — aparece en reportes del turno
```

---

### FLUJO 5: Administrador — Gestion Diaria

```
[LOGIN]
   │
   ▼
┌──────────────────────────────────────────────────────────────┐
│                 DASHBOARD ADMINISTRADOR                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Ventas   │ │ Mesas    │ │ En Cocina│ │ Delivery │       │
│  │ Hoy      │ │ Activas  │ │ Activas  │ │ Pendiente│       │
│  │ S/1,240  │ │  5/12    │ │    3     │ │    2     │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                              │
│  [Grafico ventas por hora]    [Mapa de mesas miniatura]      │
│                                                              │
│  ALERTAS:                                                    │
│  [!] Stock bajo: Ceviche (2 porciones)                       │
│  [!] Mesa 7 lleva 85 min sin cobrar                          │
└──────────────────────────────────────────────────────────────┘

NAVEGACION:
  [REPORTES] → ventas/hora, top productos, por mozo, caja
  [MAPA MESAS] → estado actual, reasignar, editar layout
  [CONFIGURACION] → mesas, zonas, menu, roles/usuarios
  [CAJA CHICA] → turnos activos, gastos, cierre de caja
```

---

## 4. Wireframes de Pantallas Clave

### Pantalla 1: Mapa de Mesas

```
┌─────────────────────────────────────────────────────────────┐
│  lorito  El Buen Sabor             [Juan Mozo v]  [≡]       │
├─────────────────────────────────────────────────────────────┤
│  SALON PRINCIPAL                         [EDITAR LAYOUT]    │
│  Filtro: [TODAS v]  [LIBRES] [OCUPADAS] [CTA PEDIDA]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │          │ │██████████│ │◐◐◐◐◐◐◐◐◐◐│ │          │      │
│  │  Mesa 1  │ │  Mesa 2  │ │  Mesa 3  │ │  Mesa 4  │      │
│  │  LIBRE   │ │  OCUPADA │ │  CUENTA  │ │  LIBRE   │      │
│  │  4 pers  │ │  Juan    │ │  PEDIDA  │ │  4 pers  │      │
│  │          │ │  42 min  │ │  55 min  │ │          │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │▲▲▲▲▲▲▲▲▲▲│ │          │ │██████████│ │▲▲▲▲▲▲▲▲▲▲│      │
│  │  Mesa 5  │ │  Mesa 6  │ │  Mesa 7  │ │  Mesa 8  │      │
│  │  LISTA   │ │  LIBRE   │ │  OCUPADA │ │  LISTA   │      │
│  │  Carlos  │ │  4 pers  │ │  Luis    │ │  Pedro   │      │
│  │  20 min  │ │          │ │  15 min  │ │  35 min  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ─────────────── TERRAZA ──────────────────────────────    │
│  ┌──────────┐ ┌──────────┐                                  │
│  │          │ │██████████│                                  │
│  │ Mesa T1  │ │ Mesa T2  │                                  │
│  │  LIBRE   │ │  OCUPADA │                                  │
│  └──────────┘ └──────────┘                                  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  LEYENDA: verde=LIBRE  rojo=OCUPADA  azul=CTA  amarillo=OK  │
└─────────────────────────────────────────────────────────────┘
```

### Pantalla 2: Toma de Pedido

```
┌─────────────────────────────────────────────────────────────┐
│  ← Mesas     Mesa 3 — Mozo: Juan              [CANCELAR]    │
├─────────────────────────────────┬───────────────────────────┤
│  MENU                           │  PEDIDO                   │
│                                 │                           │
│  [Buscar plato...]              │  Mesa 3                   │
│                                 │  ─────────────────────    │
│  [ENTRADAS][FONDOS][BEBIDAS]    │  Ceviche x1      S/ 28   │
│  [POSTRES] [COMBOS][COCTELES]  │  [−][1][+] [nota][×]     │
│                                 │                           │
│  ┌──────┐┌──────┐┌──────┐      │  Lomo x2         S/ 70   │
│  │[img] ││[img] ││[img] │      │  [−][2][+] [nota][×]     │
│  │Cevich││ Lomo ││Chicha│      │                           │
│  │S/ 28 ││S/ 35 ││S/ 12│      │  Inca Kola x2    S/ 16   │
│  └──────┘└──────┘└──────┘      │  [−][2][+] [nota][×]     │
│                                 │  ─────────────────────    │
│  ┌──────┐┌──────┐┌──────┐      │  Subtotal:  S/ 114.00    │
│  │[img] ││[img] ││[img] │      │  Descuento: S/   0.00    │
│  │Causa ││Pisco ││Inca K│      │  TOTAL:     S/ 114.00    │
│  │S/ 18 ││S/ 22 ││S/ 8  │      │                           │
│  └──────┘└──────┘└──────┘      │  [Nota general cocina]    │
│                                 │  [ENVIAR A COCINA]        │
└─────────────────────────────────┴───────────────────────────┘
```

### Pantalla 3: KDS — Cocina (dark mode)

```
┌─────────────────────────────────────────────────────────────┐
│  COCINA — El Buen Sabor                    16:45            │
│  [PENDIENTES (3)]  [EN PREP (2)]  [LISTOS (1)]              │
├─────────────────┬──────────────────┬───────────────────────┤
│  MESA 3         │  MESA 1          │  DELIVERY #45         │
│  14:28  [17min] │  14:41  [4min]   │  14:30  [15min]       │
│  ─────────────  │  ──────────────  │  ──────────────────   │
│  [ ] Ceviche 1  │  [x] Pollo 2     │  [ ] Anticuchos 2     │
│  [ ] Lomo 2     │  [ ] Arroz 2     │  [ ] Papa Huanc 1     │
│  ! sin cebolla  │                  │                       │
│  [ ] Chicha 1   │  [LISTO]         │  [EN PREP]            │
│                 │                  │                       │
│  [EN PREP]      │                  │                       │
├─────────────────┴──────────────────┴───────────────────────┤
│  MESA 5 — 14:20 (25min)  [!!! URGENTE !!!]  fondo rojo     │
│  Trucha x1   Caldo x2   Ensalada x1         [LISTO]        │
└─────────────────────────────────────────────────────────────┘

NOTAS DISENO KDS:
  - Fondo oscuro (#0f172a), texto claro (#f1f5f9)
  - Fuente minima 18px para nombres de platos
  - Timer en rojo si supera tiempo objetivo (default 15min)
  - Pantalla nunca se apaga (prevent screen sleep)
  - Sonido configurable al llegar nuevo pedido
  - Tarjetas se reordenan por urgencia automaticamente
```

### Pantalla 4: Vista Cajero

```
┌─────────────────────────────────────────────────────────────┐
│  CAJA — El Buen Sabor        Turno: Rosa   16:45  [CAJA]   │
├─────────────────────────────────────────────────────────────┤
│  [2 CUENTAS PENDIENTES]         Ventas hoy: S/ 1,240        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ MESA 3 — 55 min — Juan (Mozo) — S/ 114.00           │   │
│  │                    [VER CUENTA Y COBRAR →]           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ MESA 5 — 30 min — Carlos (Mozo) — S/ 220.00         │   │
│  │                    [VER CUENTA Y COBRAR →]           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  HISTORIAL DEL TURNO:                                       │
│  16:20  Mesa 1   S/136  Efectivo  T001-234  [ver]          │
│  16:05  Delivery S/88   Tarjeta   T001-233  [ver]          │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [NUEVA VENTA]    [GASTOS]    [CERRAR TURNO]                │
└─────────────────────────────────────────────────────────────┘
```

### Pantalla 5: Dashboard Administrador

```
┌─────────────────────────────────────────────────────────────┐
│  lorito  El Buen Sabor — Admin           Sab 7 Mar  16:45   │
├─────────────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │VENTAS  │  │MESAS   │  │DELIVERY│  │CAJA    │            │
│  │HOY     │  │ACTIVAS │  │PENDIEN.│  │TURNO   │            │
│  │S/1,240 │  │ 5/12   │  │  2     │  │ABIERTA │            │
│  │+12% vs │  │        │  │        │  │Desde   │            │
│  │ ayer   │  │        │  │        │  │09:00   │            │
│  └────────┘  └────────┘  └────────┘  └────────┘            │
│                                                             │
│  ┌───────────────────────┐  ┌──────────────────────────┐   │
│  │  VENTAS POR HORA      │  │  MAPA EN VIVO            │   │
│  │  S/400|       ▓       │  │                          │   │
│  │  S/300|   ▓   ▓  ▓    │  │ [1]L [2]O [3]C [4]L    │   │
│  │  S/200| ▓ ▓ ▓  ▓  ▓   │  │ [5]Y [6]L [7]O [8]L    │   │
│  │      9 10 11 12  1  2  │  │ [T1]L [T2]O             │   │
│  └───────────────────────┘  └──────────────────────────┘   │
│                                                             │
│  ┌───────────────────────┐  ┌──────────────────────────┐   │
│  │  TOP PRODUCTOS HOY    │  │  ALERTAS                 │   │
│  │  1. Lomo saltado  x24 │  │  [!] Stock bajo: Ceviche │   │
│  │  2. Ceviche       x18 │  │  [!] Mesa 7: 85min       │   │
│  │  3. Pollo brasa   x15 │  │  [✓] Turno abierto OK    │   │
│  └───────────────────────┘  └──────────────────────────┘   │
│                                                             │
│  [REPORTES]  [PRODUCTOS]  [USUARIOS]  [MESAS]  [CONFIG]    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Estados y Feedback Visual

### Estados de Mesa

| Estado | bg | border | Icono | Animacion |
|--------|-------|--------|-------|-----------|
| LIBRE | green-50 | green-500 | circulo vacio | ninguna |
| OCUPADA | red-50 | red-500 | circulo solido | ninguna |
| PEDIDO LISTO | yellow-50 | yellow-500 | triangulo | borde parpadeante 1Hz |
| CUENTA PEDIDA | blue-50 | blue-600 | circulo borde doble | ninguna |
| RESERVADA | purple-50 | purple-500 | estrella | ninguna |
| BLOQUEADA | gray-100 | gray-400 | x | ninguna |

Tiempo critico: sombra roja progresiva si > 60 min sin cobrar.

### Sistema de Notificaciones

| Tipo | Duracion | Color | Posicion |
|------|----------|-------|----------|
| Nuevo pedido | Persistente hasta ver | Azul oscuro | Top-right |
| Pedido listo | Persistente hasta confirmar | Verde intenso | Top-right |
| Cuenta pedida | Persistente | Azul claro | Top-right |
| Pago exitoso | 3 segundos | Verde | Center-bottom |
| Error de accion | 5 segundos | Rojo | Center-top |
| Stock bajo | Persistente | Naranja | Dashboard |

### Estados de Loading

| Estado | Comportamiento |
|--------|----------------|
| Enviando pedido | Boton deshabilitado + spinner + "Enviando..." |
| Procesando pago | Overlay completo + spinner + "Procesando..." |
| Cargando menu | Skeleton cards en grilla |
| Cargando mesas | Skeleton de tarjetas |
| Error de red | Banner rojo + boton "Reintentar" |
| Sin resultados | Ilustracion + texto claro + accion sugerida |

Regla: ningun boton critico en estado loading mas de 10s sin feedback de error.

### Confirmaciones

| Accion | Requiere confirmacion | Tipo |
|--------|----------------------|------|
| Agregar item al pedido | NO | — |
| Enviar pedido a cocina | SI | Modal simple |
| Cancelar item enviado | SI + motivo | Modal con razon |
| Cancelar pedido completo | SI + motivo | Modal con razon |
| Aplicar descuento > 20% | SI | Modal con razon |
| Liberar mesa sin cobrar | SI (fuerte) | Escribir texto |
| Cerrar turno de caja | SI | Formulario cierre |

---

## 6. Consideraciones de Accesibilidad y Contexto

### Tamanos de Elementos Tactiles

| Elemento | Minimo | Recomendado |
|----------|--------|-------------|
| Accion primaria (CTA) | 48px alto | 56-64px alto |
| Accion secundaria | 44px alto | 48px alto |
| Items de lista | 48px alto | 56px alto |
| Tarjeta de mesa | 120x120px | 150x150px |
| Botones +/- cantidad | 48x48px | 56x56px |
| Checkboxes KDS | 40x40px | 48x48px |
| Teclas numpad (cobro) | 64x64px | 72x72px |

**Espaciado minimo entre elementos: 8px (recomendado 12px)**

### Paleta de Colores

```
MODO CLARO (mapa de mesas, cajero, admin):
  Verde    #16a34a  — LIBRE
  Rojo     #dc2626  — OCUPADA
  Amarillo #ca8a04  — LISTA / URGENTE
  Azul     #2563eb  — CUENTA PEDIDA
  Texto    #0f172a
  Fondo    #f8fafc

MODO OSCURO (KDS de cocina, bar nocturno):
  Fondo    #0f172a
  Texto    #f1f5f9
  Normal   #1e293b  (tarjeta < 10min)
  Urgente  #78350f  (tarjeta 10-20min)
  Critico  #7f1d1d  (tarjeta > 20min)
```

### Optimizaciones para Horas Pico

1. **Acceso directo desde mapa:** un tap en mesa libre → pantalla de pedido sin modales intermedios.
2. **Busqueda fuzzy en menu:** resultados aproximados + productos mas pedidos primero.
3. **Favoritos del mozo:** tab rapido con sus combos/items frecuentes.
4. **Atajos de billetes en cobro:** [S/10][S/20][S/50][S/100][EXACTO].
5. **Timeout de sesion extendido:** 8 horas en dispositivos de caja; re-auth solo para acciones criticas.
6. **Modo rapido (V2):** desactivar confirmaciones para mozos experimentados.

### Metricas de Exito UX

| Metrica | Objetivo |
|---------|---------|
| Tomar y enviar un pedido | < 60 segundos |
| Procesar un cobro | < 45 segundos |
| Marcar pedido listo en cocina | 1 toque |
| Reduccion de errores vs papel | > 40% |

---

## Componentes Nuevos Requeridos (Stack Existente)

```typescript
// Mesas
<TableGrid />          // Grilla con mapa de mesas
<TableCard />          // Tarjeta de estado de mesa individual
<TableStatusBadge />   // Badge de color por estado

// Pedidos
<MenuCategoryTabs />   // Tabs horizontales de categorias
<MenuItemGrid />       // Grilla de productos con foto
<OrderItemRow />       // Fila de item en pedido (con +/- y nota)
<ModifierModal />      // Modal de seleccion de modificadores

// KDS
<KitchenTicketBoard /> // Grid de comandas
<KitchenTicketCard />  // Comanda individual con timer
<TimerBadge />         // Badge de tiempo con colores

// Cobro
<AccountSummary />     // Resumen de cuenta de mesa
<SplitBillModal />     // Modal de division de cuenta
<PaymentNumpad />      // Numpad tactil grande para cobro
<ChangeCalculator />   // Calculo de vuelto en tiempo real
```

**Componentes shadcn/ui reutilizables:**
- `Sheet` → panel lateral para detalle de mesa
- `Dialog` → confirmaciones
- `Toast` / `Sonner` → notificaciones
- `Badge` → estados y contadores
- `Tabs` → categorias de menu y filtros KDS
- `ScrollArea` → lista de pedidos y menu
- `Button` con `size="lg"` → siempre en tablet
