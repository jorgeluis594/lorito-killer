# Infraestructura de Lorito Killer

Documentacion de la arquitectura de infraestructura del sistema POS multi-tenant Lorito Killer.

## Stack de Despliegue

| Capa              | Tecnologia                                   |
| ----------------- | -------------------------------------------- |
| Proveedor VPS     | Hetzner                                      |
| PaaS              | Coolify (self-hosted)                        |
| Reverse Proxy     | Traefik (gestionado por Coolify)             |
| Contenedores      | Docker                                       |
| Aplicacion        | Next.js (standalone output)                  |
| Worker            | BullMQ (contenedor separado)                 |
| Base de datos     | PostgreSQL                                   |
| Cache/Queue       | Redis                                        |
| SSL/TLS           | Let's Encrypt (wildcard via DNS-01)          |
| DNS               | Cloudflare                                   |
| Registrar dominio | Namecheap                                    |

Coolify orquesta el ciclo de vida del despliegue: clona el repositorio, construye la imagen Docker, inyecta variables de entorno y configura Traefik para enrutar el trafico.

## Aplicacion

La aplicacion Next.js se despliega como un contenedor Docker independiente (no Docker Compose). Utiliza un Dockerfile multi-stage con tres etapas:

1. **deps** - Instala dependencias y genera el cliente Prisma.
2. **builder** - Inyecta build args `NEXT_PUBLIC_*` y ejecuta el build de Next.js.
3. **runner** - Imagen de produccion minima. Arranca el servidor Next.js directamente.

Las migraciones de Prisma se ejecutan una sola vez por despliegue a traves de un **pre-deploy hook** de Coolify (`scripts/migrate.sh`), en lugar de ejecutarse al inicio del contenedor. Esto evita race conditions cuando se escala horizontalmente con multiples replicas.

## Base de Datos

PostgreSQL corre como contenedor Docker gestionado por Coolify. La base de datos **no esta expuesta publicamente** — solo es accesible desde la red interna de Docker donde se ejecuta la aplicacion.

## Redis

Redis corre como servicio gestionado por Coolify en la misma red interna de Docker. Se utiliza como broker para BullMQ (cola de jobs en background). No esta expuesto publicamente.

## Worker (BullMQ)

El worker es un contenedor Docker independiente que procesa jobs de la cola BullMQ. Usa `Dockerfile.worker` y se despliega como una aplicacion separada en Coolify apuntando al mismo repositorio.

- Consume jobs de Redis y ejecuta tareas como envio de documentos a SUNAT
- Requiere `REDIS_URL` y `DATABASE_URL` como variables de entorno
- No expone puertos HTTP — solo consume de la cola
- Se escala independientemente de la aplicacion Next.js

## SSL/TLS

Los certificados SSL se gestionan automaticamente mediante Let's Encrypt con certificados wildcard. Se utiliza el challenge DNS-01 con un API token de Cloudflare, configurado en Traefik. Traefik solicita y renueva los certificados automaticamente.

## Red Docker

La aplicacion y la base de datos se comunican a traves de la red interna de Docker gestionada por Coolify.

- El contenedor de la aplicacion se conecta a PostgreSQL usando el hostname interno del contenedor en la `DATABASE_URL`.
- La base de datos no tiene puertos expuestos al host ni a internet.
- Traefik se conecta a la misma red para enrutar el trafico hacia la aplicacion.

## Flujo de Deploy

Cuando se ejecuta un despliegue desde Coolify:

1. Coolify clona el repositorio desde el branch configurado.
2. Construye la imagen Docker usando el Dockerfile (instala dependencias, genera cliente Prisma, inyecta `NEXT_PUBLIC_*` como build args, ejecuta el build de Next.js).
3. Crea el contenedor con las variables de entorno de runtime.
4. Antes de iniciar el contenedor, Coolify ejecuta el **pre-deploy hook** (`scripts/migrate.sh`) que aplica las migraciones de Prisma. Luego inicia el servidor Next.js.
5. Traefik detecta el nuevo contenedor, termina SSL y enruta el trafico.

### Build Args vs Runtime Env Vars

Las variables `NEXT_PUBLIC_*` deben inyectarse como **build args** porque Next.js las embebe en el bundle del cliente durante el build. Las demas variables se inyectan en **runtime** al iniciar el contenedor.

## Variables de Entorno

### Variables de Runtime

| Variable                  | Descripcion                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`            | URL de conexion a PostgreSQL                                       |
| `NEXTAUTH_SECRET`         | Clave secreta para firmar los tokens JWT de NextAuth               |
| `NEXTAUTH_URL`            | URL base de la aplicacion para NextAuth                            |
| `UPLOADTHING_SECRET`      | Clave secreta de UploadThing para subida de archivos               |
| `UPLOADTHING_APP_ID`      | ID de la aplicacion en UploadThing                                 |
| `FACTPRO_URL`             | URL de la API de FactPro para emision de comprobantes electronicos |
| `TELEGRAM_BOT_TOKEN`      | Token del bot de Telegram para notificaciones                      |
| `TELEGRAM_CHAT_ID`        | ID del chat de Telegram donde se envian notificaciones             |
| `PREVIEW`                 | Si es `"true"`, usa un subdominio fijo en lugar de extraerlo del hostname |
| `REDIS_URL`               | URL de conexion a Redis para BullMQ                                |
| `BULLMQ_JOB_PREFIX`       | Prefijo opcional para nombres de jobs BullMQ                       |

### Variables de Build (NEXT_PUBLIC_*)

| Variable                                   | Descripcion                                            |
| ------------------------------------------ | ------------------------------------------------------ |
| `NEXT_PUBLIC_REALTIME_PROVIDER`             | Proveedor de comunicacion en tiempo real               |
| `NEXT_PUBLIC_SUPABASE_URL`                  | URL del proyecto en Supabase para realtime             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`             | Clave anonima de Supabase para acceso del cliente      |
| `NEXT_PUBLIC_ALLOWED_DISCOUNT_COMPANY_IDS`  | IDs de empresas habilitadas para aplicar descuentos    |

> **Nota:** Las credenciales se gestionan exclusivamente a traves del panel de Coolify. No incluir valores reales en documentacion.

## Multi-tenancy y Routing

La aplicacion utiliza **subdominios** para el multi-tenancy. El middleware de Next.js extrae el subdominio del hostname y reescribe la URL internamente:

```
Request: https://miempresa.dominio.com/dashboard
                  ^^^^^^^^^ subdominio

Rewrite: /miempresa/dashboard (ruta interna del App Router)
```

La estructura de rutas del App Router refleja esto:

```
/src/app/[subdomain]/          # Ruta parametrica por subdominio
  └── dashboard/               # Dashboard principal
      ├── orders/              # Gestion de ordenes
      ├── products/            # Gestion de productos
      ├── cash_shifts/         # Turnos de caja
      └── ...
```

Todas las consultas a la base de datos filtran por `companyId` para garantizar el aislamiento de datos entre tenants.

## Diagrama de Arquitectura

```
                         Internet
                            |
                            v
                    +---------------+
                    |  Cloudflare   |
                    |  DNS / CDN    |
                    +-------+-------+
                            |
                            v
              +----------------------------+
              |         VPS (Hetzner)      |
              |                            |
              |  +----------------------+  |
              |  |  Coolify (PaaS)      |  |
              |  +----------------------+  |
              |                            |
              |  +----------------------+  |
              |  |  Traefik             |  |
              |  |  (SSL termination)   |  |
              |  +----------+-----------+  |
              |             |              |
              |             v              |
              |  +----------------------+  |
              |  |  Next.js App         |  |
              |  |  (standalone)        |  |
              |  +----------+-----------+  |
              |             |              |
              |     Docker internal net    |
              |         |       |          |
              |  +------+--+ +--+-------+  |
              |  | PostgreSQL| |  Redis  |  |
              |  | (internal)| |(internal)|  |
              |  +------+--+ +--+-------+  |
              |         |       |          |
              |  +------+-------+-------+  |
              |  |  BullMQ Worker       |  |
              |  |  (background jobs)   |  |
              |  +----------------------+  |
              |                            |
              +----------------------------+
```

**Flujo de una peticion:**

1. El usuario accede a un subdominio de la aplicacion.
2. Cloudflare resuelve el DNS al IP del VPS.
3. Traefik recibe la peticion, termina SSL con el certificado wildcard.
4. Traefik enruta la peticion al contenedor de Next.js.
5. El middleware de Next.js extrae el subdominio y reescribe la ruta.
6. La aplicacion consulta PostgreSQL a traves de la red interna de Docker.
7. La respuesta viaja de regreso por el mismo camino.
