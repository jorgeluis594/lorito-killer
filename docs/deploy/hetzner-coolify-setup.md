# Guia de Despliegue: Lorito Killer en Hetzner VPS con Coolify

> Guia paso a paso para desplegar la aplicacion POS multi-tenant Lorito Killer en un VPS de Hetzner usando Coolify como plataforma de gestion.

---

## Tabla de Contenidos

1. [Resumen de Infraestructura](#1-resumen-de-infraestructura)
2. [Estado Actual - Ya Completado](#2-estado-actual---ya-completado)
3. [Paso 1: Instalar Coolify en el VPS](#3-paso-1-instalar-coolify-en-el-vps)
4. [Paso 2: Configuracion Inicial de Coolify](#4-paso-2-configuracion-inicial-de-coolify)
5. [Paso 3: Crear Base de Datos PostgreSQL](#5-paso-3-crear-base-de-datos-postgresql)
6. [Paso 4: Configurar Token de API de Cloudflare](#6-paso-4-configurar-token-de-api-de-cloudflare)
7. [Paso 5: Configurar SSL Wildcard en Coolify](#7-paso-5-configurar-ssl-wildcard-en-coolify)
8. [Paso 6: Desplegar la Aplicacion Next.js](#8-paso-6-desplegar-la-aplicacion-nextjs)
9. [Paso 7: Variables de Entorno](#9-paso-7-variables-de-entorno)
10. [Paso 8: Configurar Inngest Cloud](#10-paso-8-configurar-inngest-cloud)
11. [Paso 9: Verificacion del Despliegue](#11-paso-9-verificacion-del-despliegue)
12. [Paso 10: Post-Despliegue y Seguridad](#12-paso-10-post-despliegue-y-seguridad)
13. [Generacion de Secretos](#13-generacion-de-secretos)
14. [Resolucion de Problemas](#14-resolucion-de-problemas)
15. [Arquitectura del Sistema](#15-arquitectura-del-sistema)

---

## 1. Resumen de Infraestructura

| Componente | Detalle |
|---|---|
| **VPS** | Hetzner CPX32 - 4 vCPU, 8GB RAM, 160GB SSD |
| **Ubicacion** | Helsinki |
| **SO** | Ubuntu |
| **IP** | 135.181.34.192 |
| **Dominio** | kogozstaging.lat |
| **DNS/CDN** | Cloudflare |
| **Registrador** | Namecheap |
| **Plataforma** | Coolify (self-hosted PaaS) |
| **Base de Datos** | PostgreSQL 16 (contenedor Docker en Coolify) |
| **Aplicacion** | Next.js 14 con Dockerfile personalizado |

---

## 2. Estado Actual - Ya Completado

Los siguientes pasos ya fueron realizados y no necesitan repetirse:

- [x] VPS creado en Hetzner (CPX32, Helsinki, Ubuntu)
- [x] Dominio `kogozstaging.lat` comprado en Namecheap
- [x] Cuenta de Cloudflare creada
- [x] Registros DNS configurados en Cloudflare:
  - Registro A: `@` -> `135.181.34.192` (solo DNS, nube gris)
  - Registro A: `*` -> `135.181.34.192` (solo DNS, nube gris)
- [x] Nameservers de Namecheap cambiados a Cloudflare:
  - `celine.ns.cloudflare.com`
  - `guss.ns.cloudflare.com`
- [x] Dockerfile, .dockerignore, endpoint de salud y `next.config.mjs` con output standalone creados en el repositorio

> **Nota:** Los registros DNS estan en modo "Solo DNS" (nube gris) intencionalmente. Se activara el proxy de Cloudflare (nube naranja) despues de verificar que todo funciona correctamente.

---

## 3. Paso 1: Instalar Coolify en el VPS

### 3.1 Conectarse al VPS por SSH

```bash
ssh root@135.181.34.192
```

Si es la primera vez, aceptar la huella digital del servidor escribiendo `yes`.

### 3.2 Actualizar el sistema (recomendado)

```bash
apt update && apt upgrade -y
```

### 3.3 Instalar Coolify

Ejecutar el script de instalacion oficial:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Este script:
- Instala Docker si no esta presente
- Descarga e inicia los contenedores de Coolify
- Configura Traefik como reverse proxy
- Abre los puertos necesarios (8000 para panel web)

La instalacion toma aproximadamente 2-5 minutos. Al finalizar, se mostrara un mensaje confirmando que Coolify esta corriendo.

### 3.4 Acceder al Panel de Coolify

Abrir en el navegador:

```
http://135.181.34.192:8000
```

### 3.5 Configuracion Inicial del Wizard

1. **Crear cuenta de administrador**: Ingresar email y contrasena segura. Este sera el usuario principal de Coolify.
2. **Nombre de la instancia**: Poner algo descriptivo como "Lorito Killer Staging".
3. **Completar el wizard**: Seguir los pasos que muestre el asistente inicial.

> **Importante:** Guardar las credenciales de administrador de Coolify en un lugar seguro.

---

## 4. Paso 2: Configuracion Inicial de Coolify

### 4.1 Verificar el Servidor

Una vez dentro del panel de Coolify:

1. Ir a **Servers** en el menu lateral izquierdo.
2. Deberia aparecer **localhost** como servidor ya configurado (Coolify lo agrega automaticamente durante la instalacion).
3. Hacer clic en **localhost**.
4. Verificar que el estado muestre **"Running"** y que Docker este activo.

Si Docker no aparece como activo:

```bash
# En el VPS via SSH
systemctl status docker
systemctl start docker  # si no esta corriendo
```

### 4.2 Verificar Traefik

Coolify usa Traefik como reverse proxy. Verificar que este corriendo:

1. En el panel de Coolify, ir a **Servers** -> **localhost**.
2. En la seccion de **Proxy**, verificar que Traefik esta corriendo.
3. Si no esta corriendo, hacer clic en **Start** o **Restart**.

---

## 5. Paso 3: Crear Base de Datos PostgreSQL

### 5.1 Crear el Recurso de PostgreSQL

1. En el panel de Coolify, hacer clic en **+ Add Resource** (boton en la esquina superior o en el dashboard).
2. Seleccionar **Database**.
3. Seleccionar **PostgreSQL**.
4. Seleccionar la version **16** (o la mas reciente 16.x disponible).
5. Seleccionar el servidor **localhost**.

### 5.2 Configurar PostgreSQL

En la pantalla de configuracion del nuevo recurso PostgreSQL:

- **Name**: `lorito-killer-db` (nombre identificador en Coolify)
- **Postgres User**: `postgres` (o el que prefieras)
- **Postgres Password**: Generar una contrasena segura (ver [seccion de generacion de secretos](#13-generacion-de-secretos))
- **Postgres DB**: `lorito_killer_production`
- **Public Port**: **Dejar vacio o desactivado** (la base de datos NO debe ser accesible desde internet)

### 5.3 Iniciar PostgreSQL

1. Hacer clic en **Start** o **Deploy**.
2. Esperar a que el contenedor inicie y el estado cambie a **Running**.

### 5.4 Obtener la Cadena de Conexion Interna

Una vez que PostgreSQL este corriendo:

1. En la pagina del recurso PostgreSQL, buscar la seccion **Connection Strings** o **Internal Connection**.
2. Copiar la cadena de conexion interna. Tendra un formato similar a:

```
postgresql://postgres:TU_PASSWORD@lorito-killer-db:5432/lorito_killer_production
```

> **Critico:** El hostname interno (ej. `lorito-killer-db`) es el nombre del contenedor Docker. Solo funciona entre contenedores dentro del mismo servidor Coolify. Esto es correcto y deseado - la base de datos no debe ser accesible desde internet.

Guardar esta cadena de conexion; se necesitara al configurar las variables de entorno de la aplicacion.

---

## 6. Paso 4: Configurar Token de API de Cloudflare

Este token es necesario para que Coolify pueda solicitar certificados SSL wildcard usando el desafio DNS-01 de Let's Encrypt.

### 6.1 Crear el Token en Cloudflare

1. Ir a [dash.cloudflare.com](https://dash.cloudflare.com).
2. Hacer clic en el icono de perfil (esquina superior derecha) -> **My Profile**.
3. En el menu lateral, seleccionar **API Tokens**.
4. Hacer clic en **Create Token**.
5. Buscar la plantilla **"Edit zone DNS"** y hacer clic en **Use template**.

### 6.2 Configurar los Permisos del Token

Configurar de la siguiente manera:

| Campo | Valor |
|---|---|
| **Token name** | `Coolify DNS-01 - kogozstaging.lat` |
| **Permissions** | Zone - DNS - Edit |
| **Zone Resources** | Include - Specific zone - `kogozstaging.lat` |
| **IP Address Filtering** | (Opcional) Restringir a `135.181.34.192` |
| **TTL** | (Opcional) Sin fecha de expiracion o una fecha lejana |

6. Hacer clic en **Continue to summary**.
7. Revisar los permisos y hacer clic en **Create Token**.
8. **Copiar el token inmediatamente.** Solo se muestra una vez.

> **Guardar este token en un lugar seguro.** Se necesitara en el siguiente paso.

### 6.3 Verificar el Token (Opcional)

Cloudflare muestra un comando curl para verificar el token:

```bash
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json"
```

Deberia responder con `"status": "active"`.

---

## 7. Paso 5: Configurar SSL Wildcard en Coolify

Coolify usa Traefik como reverse proxy y puede gestionar certificados SSL automaticamente. Para dominios wildcard (`*.kogozstaging.lat`), es necesario usar el desafio DNS-01 en lugar del HTTP-01 estandar.

### 7.1 Configurar el Proveedor DNS en Coolify

1. En el panel de Coolify, ir a **Servers** -> **localhost**.
2. Ir a la pestana **Proxy** o **Configuration**.
3. Buscar la opcion para configurar **Traefik** o **Dynamic Configuration**.

> **Nota:** La interfaz exacta puede variar segun la version de Coolify. Si no encuentras una opcion directa para DNS challenge, continua con el paso 7.2.

### 7.2 Configurar el DNS Challenge via Traefik

Dependiendo de la version de Coolify, puede haber dos formas de hacerlo:

#### Opcion A: Via la interfaz de Coolify (versiones recientes)

1. En **Settings** (menu lateral) -> buscar configuracion de **SSL** o **Let's Encrypt**.
2. Seleccionar **DNS Challenge** como metodo de validacion.
3. Seleccionar **Cloudflare** como proveedor DNS.
4. Ingresar el token de API de Cloudflare.
5. Ingresar el email asociado a la cuenta de Cloudflare.
6. Guardar los cambios.

#### Opcion B: Via configuracion manual de Traefik

Si la opcion A no esta disponible, configurar directamente en Traefik:

1. En Coolify, ir a **Servers** -> **localhost** -> **Proxy**.
2. Buscar la opcion **Dynamic Configuration** o **Custom Configuration**.
3. Agregar la siguiente configuracion para el certificate resolver:

```yaml
# En la configuracion de entrypoints/certificateResolvers de Traefik
certificatesResolvers:
  letsencrypt:
    acme:
      email: tu-email@ejemplo.com
      storage: /data/acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
```

4. Agregar las variables de entorno de Cloudflare al contenedor de Traefik:

```
CF_DNS_API_TOKEN=tu-token-de-cloudflare
```

5. Reiniciar Traefik desde el panel de Coolify.

### 7.3 Verificar que SSL Funciona

Despues de configurar y desplegar la aplicacion (pasos siguientes), verificar:

```bash
# Desde tu maquina local
curl -I https://kogozstaging.lat
```

Deberia mostrar un certificado SSL valido de Let's Encrypt.

---

## 8. Paso 6: Desplegar la Aplicacion Next.js

### 8.1 Crear el Recurso de la Aplicacion

1. En el panel de Coolify, hacer clic en **+ Add Resource**.
2. Seleccionar **Application**.

### 8.2 Elegir la Fuente del Codigo

Hay dos opciones:

#### Opcion A: Repositorio Publico (mas simple)

1. Seleccionar **Public Repository**.
2. Ingresar la URL: `https://github.com/jorgeluis594/lorito-killer`
3. Branch: `main` (o `kds-management` para la version actual de staging)

#### Opcion B: Conectar GitHub (recomendado para despliegues automaticos)

1. Seleccionar **GitHub**.
2. Seguir el flujo de autorizacion de GitHub App.
3. Dar acceso al repositorio `jorgeluis594/lorito-killer`.
4. Seleccionar el repositorio y branch.

> **Recomendacion:** La Opcion B permite despliegues automaticos con cada push al branch configurado.

### 8.3 Configurar el Build Pack

1. En la configuracion del recurso, buscar **Build Pack**.
2. Seleccionar **Dockerfile**.
3. Coolify detectara automaticamente el `Dockerfile` en la raiz del repositorio.

### 8.4 Configurar los Dominios

En la seccion **Domains** o **FQDN** de la configuracion del recurso:

1. Agregar los dominios separados por coma:

```
https://kogozstaging.lat,https://*.kogozstaging.lat
```

> **Critico:** Ambos dominios son necesarios. El dominio base (`kogozstaging.lat`) para la pagina principal y el wildcard (`*.kogozstaging.lat`) para los subdominios multi-tenant. Cada subdominio corresponde a una empresa/tienda en el sistema.

### 8.5 Configurar el Puerto

Verificar que el puerto expuesto este configurado como **3000** (el puerto que usa la aplicacion Next.js segun el Dockerfile).

### 8.6 NO desplegar todavia

Antes de desplegar, es necesario configurar las variables de entorno (siguiente paso). Si se despliega sin variables, el build fallara.

---

## 9. Paso 7: Variables de Entorno

### 9.1 Entender la Diferencia: Build Args vs Runtime Vars

La aplicacion Next.js tiene dos tipos de variables:

| Tipo | Prefijo | Cuando se usa | Como configurar en Coolify |
|---|---|---|---|
| **Build Arguments** | `NEXT_PUBLIC_*` | Durante `npm run build` - se incrustan en el JavaScript del cliente | Como **Build Arguments** (args del Dockerfile) |
| **Runtime Variables** | Sin prefijo especial | Cuando el contenedor esta corriendo | Como **Environment Variables** normales |

> **Muy Importante:** Las variables `NEXT_PUBLIC_*` DEBEN configurarse como Build Arguments porque Next.js las reemplaza en tiempo de compilacion. Si se configuran solo como variables de entorno del runtime, no tendran efecto.

### 9.2 Configurar Build Arguments

En la configuracion del recurso de la aplicacion en Coolify, buscar la seccion **Build Arguments** o **Docker Build Args**:

```
NEXT_PUBLIC_REALTIME_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=<tu-url-de-supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-clave-anonima-de-supabase>
NEXT_PUBLIC_ALLOWED_DISCOUNT_COMPANY_IDS=<ids-separados-por-coma-si-aplica>
```

Estos corresponden a los `ARG` definidos en el Dockerfile:

```dockerfile
ARG NEXT_PUBLIC_REALTIME_PROVIDER
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_ALLOWED_DISCOUNT_COMPANY_IDS
```

### 9.3 Configurar Variables de Entorno (Runtime)

En la seccion **Environment Variables** del recurso:

```bash
# Base de datos (usar la cadena de conexion interna del paso 3.4)
DATABASE_URL=postgresql://postgres:TU_PASSWORD@lorito-killer-db:5432/lorito_killer_production

# Autenticacion
NEXTAUTH_SECRET=<generar-con-openssl>
NEXTAUTH_URL=https://kogozstaging.lat

# Inngest (jobs asincrono - configurar despues del paso 8)
INNGEST_EVENT_KEY=<desde-inngest-cloud>
INNGEST_SIGNING_KEY=<desde-inngest-cloud>

# Administrador del sistema
ADMIN_EMAIL=<email-del-admin>

# Upload de archivos
UPLOADTHING_SECRET=<desde-uploadthing>
UPLOADTHING_APP_ID=<desde-uploadthing>

# Telegram (notificaciones - opcional)
TELEGRAM_BOT_TOKEN=<token-del-bot>
TELEGRAM_CHAT_ID=<id-del-chat>

# Modo preview (IMPORTANTE: debe ser false en staging/produccion)
PREVIEW=false
```

### 9.4 Generar NEXTAUTH_SECRET

Ver la [seccion de generacion de secretos](#13-generacion-de-secretos) para generar un valor seguro.

### 9.5 Nota sobre PREVIEW

La variable `PREVIEW` controla como el middleware extrae el subdominio:

```typescript
// src/middleware.ts
const subdomain =
  process.env.PREVIEW === "true" ? "fantastidog" : hostname.split(".")[0];
```

- `PREVIEW=true`: Fuerza el subdominio a "fantastidog" (util para desarrollo local sin subdominios reales)
- `PREVIEW=false` (o no definido): Extrae el subdominio del hostname real (modo produccion/staging)

En staging con dominios wildcard reales, **siempre usar `PREVIEW=false`**.

### 9.6 Desplegar la Aplicacion

Una vez todas las variables esten configuradas:

1. Hacer clic en **Deploy** en la pagina del recurso.
2. Observar los logs de construccion (build) en tiempo real.
3. El proceso de build seguira estos pasos:
   - Clonar el repositorio
   - Ejecutar el Dockerfile (instalar deps, generar Prisma, build de Next.js)
   - Crear la imagen del contenedor
   - Iniciar el contenedor (que ejecuta `prisma migrate deploy` y luego `node server.js`)

El primer despliegue puede tomar 5-10 minutos dependiendo del build de la aplicacion.

---

## 10. Paso 8: Configurar Inngest Cloud

Inngest se usa para jobs en segundo plano (ej. envio de documentos a SUNAT).

### 10.1 Configurar en Inngest Cloud

1. Ir a [app.inngest.com](https://app.inngest.com).
2. Iniciar sesion o crear una cuenta.
3. Crear una nueva app o usar una existente.

### 10.2 Configurar el Webhook URL

1. En el dashboard de Inngest, ir a la configuracion de la app.
2. En la seccion de **App URL** o **Webhook**, configurar:

```
https://kogozstaging.lat/api/inngest
```

3. Inngest enviara un request a esta URL para descubrir las funciones registradas.

### 10.3 Obtener las Claves

1. En el dashboard de Inngest, ir a **Settings** o **Keys**.
2. Copiar:
   - **Event Key**: Para `INNGEST_EVENT_KEY`
   - **Signing Key**: Para `INNGEST_SIGNING_KEY`
3. Agregar ambos valores a las variables de entorno del recurso en Coolify.
4. Re-desplegar la aplicacion para que tome las nuevas variables.

### 10.4 Verificar la Conexion

Despues del re-despliegue:

1. En el dashboard de Inngest, ir a la seccion de **Apps** o **Functions**.
2. Deberia mostrar las funciones registradas de la aplicacion.
3. Si no aparecen, hacer clic en **Sync** o verificar que la URL del webhook sea accesible.

---

## 11. Paso 9: Verificacion del Despliegue

Realizar las siguientes verificaciones en orden:

### 11.1 Health Check

```bash
curl https://kogozstaging.lat/api/health
```

Respuesta esperada:
```json
{"status":"ok","database":"connected"}
```

Si la base de datos no esta conectada:
```json
{"status":"error","database":"disconnected"}
```

### 11.2 Pagina de Login de un Subdominio

Abrir en el navegador:

```
https://fantastidog.kogozstaging.lat/login
```

Deberia mostrar la pagina de login de la aplicacion. "fantastidog" es un subdominio de prueba (debe existir como empresa en la base de datos).

### 11.3 Dominio Base

Abrir:

```
https://kogozstaging.lat
```

Deberia responder sin errores (el contenido dependera de la configuracion de rutas).

### 11.4 Verificar Certificado SSL

```bash
# Verificar que el certificado es valido y cubre el wildcard
openssl s_client -connect kogozstaging.lat:443 -servername kogozstaging.lat < /dev/null 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"
```

Deberia mostrar `*.kogozstaging.lat` y `kogozstaging.lat` en los Subject Alternative Names.

### 11.5 Verificar Logs

En el panel de Coolify, ir al recurso de la aplicacion y revisar la pestana **Logs**:

- Verificar que `prisma migrate deploy` se ejecuto sin errores
- Verificar que `node server.js` inicio correctamente
- Buscar mensajes de error que indiquen problemas de conexion

---

## 12. Paso 10: Post-Despliegue y Seguridad

### 12.1 Activar Proxy de Cloudflare

Una vez verificado que todo funciona correctamente:

1. Ir al dashboard de Cloudflare -> zona `kogozstaging.lat` -> **DNS**.
2. Para el registro A de `@`:
   - Hacer clic en el icono de la nube gris.
   - Cambiar a **nube naranja** (Proxied).
3. Para el registro A de `*`:
   - Hacer clic en el icono de la nube gris.
   - Cambiar a **nube naranja** (Proxied).

> **Advertencia:** Activar el proxy de Cloudflare puede causar conflictos con los certificados SSL gestionados por Coolify/Traefik. Hay dos estrategias:
>
> **Estrategia 1 - SSL Full (Strict) en Cloudflare (Recomendado):**
> 1. En Cloudflare -> **SSL/TLS** -> seleccionar **Full (strict)**.
> 2. Esto hace que Cloudflare confie en el certificado Let's Encrypt de Traefik.
>
> **Estrategia 2 - Dejar en modo "Solo DNS" (nube gris):**
> 1. Mantener los registros sin proxy.
> 2. El trafico va directamente al VPS con SSL de Let's Encrypt.
> 3. No se obtienen los beneficios de CDN/proteccion DDoS de Cloudflare.

### 12.2 Configurar SSL en Cloudflare (Si se activa el proxy)

1. Ir a Cloudflare -> zona `kogozstaging.lat` -> **SSL/TLS**.
2. Seleccionar modo **Full (strict)**.
3. En **Edge Certificates** -> activar **Always Use HTTPS**.
4. (Opcional) Activar **Automatic HTTPS Rewrites**.

### 12.3 Configurar Backups de Base de Datos

En el panel de Coolify:

1. Ir al recurso de PostgreSQL.
2. Buscar la seccion **Backups** o **Scheduled Backups**.
3. Configurar:
   - **Frecuencia**: Diario (recomendado `0 3 * * *` para las 3 AM)
   - **Retencion**: Mantener al menos 7 backups
   - **Destino**: S3 compatible (Hetzner Object Storage, AWS S3, etc.) o almacenamiento local

#### Backup Manual via SSH

Si Coolify no ofrece backups automaticos integrados, configurar con cron:

```bash
# Conectarse al VPS
ssh root@135.181.34.192

# Crear script de backup
cat > /root/backup-db.sh << 'SCRIPT'
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups/postgres"
mkdir -p $BACKUP_DIR

# Obtener el nombre del contenedor de PostgreSQL
CONTAINER=$(docker ps --filter "name=lorito-killer-db" --format "{{.Names}}" | head -1)

if [ -z "$CONTAINER" ]; then
  echo "Error: No se encontro el contenedor de PostgreSQL"
  exit 1
fi

docker exec $CONTAINER pg_dump -U postgres lorito_killer_production | gzip > "$BACKUP_DIR/lorito_killer_$TIMESTAMP.sql.gz"

# Eliminar backups de mas de 14 dias
find $BACKUP_DIR -name "*.sql.gz" -mtime +14 -delete

echo "Backup creado: lorito_killer_$TIMESTAMP.sql.gz"
SCRIPT

chmod +x /root/backup-db.sh

# Agregar al crontab (ejecutar diariamente a las 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /root/backup-db.sh >> /root/backups/backup.log 2>&1") | crontab -
```

### 12.4 Seguridad del Servidor

Configuraciones recomendadas en el VPS:

```bash
# Firewall - permitir solo los puertos necesarios
ufw allow 22/tcp     # SSH
ufw allow 80/tcp     # HTTP (redirige a HTTPS)
ufw allow 443/tcp    # HTTPS
ufw allow 8000/tcp   # Panel de Coolify (considerar restringir por IP)
ufw enable

# (Opcional) Restringir acceso al panel de Coolify por IP
# Reemplazar TU_IP con tu IP publica
ufw delete allow 8000/tcp
ufw allow from TU_IP to any port 8000 proto tcp
```

### 12.5 Monitoreo

Coolify incluye herramientas de monitoreo integradas:

1. En el panel de Coolify, revisar el **Dashboard** para ver el uso de recursos.
2. Los **Logs** de cada recurso estan disponibles en tiempo real.
3. Los **Health Checks** del contenedor se ejecutan automaticamente cada 30 segundos (configurado en el Dockerfile).

---

## 13. Generacion de Secretos

### NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Ejemplo de salida: `K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=`

### Contrasena de PostgreSQL

```bash
openssl rand -base64 24
```

Ejemplo de salida: `dGhpcyBpcyBhIHNlY3VyZSBwYXNz`

### Clave generica segura

```bash
# 32 caracteres hexadecimales
openssl rand -hex 16

# 48 caracteres alfanumericos (mas fuerte)
openssl rand -base64 36
```

### Generar Multiples Secretos de Una Vez

```bash
echo "=== Secretos para Lorito Killer ==="
echo ""
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"
echo ""
echo "=== Guardar estos valores en un lugar seguro ==="
```

> **Advertencia:** Nunca commitear secretos al repositorio. Todos los secretos deben configurarse exclusivamente como variables de entorno en Coolify.

---

## 14. Resolucion de Problemas

### Problema: El build falla con "prisma generate" error

**Sintoma:** Error durante el build de Docker relacionado con Prisma.

**Solucion:**
1. Verificar que el directorio `prisma/` existe y contiene `schema.prisma`.
2. Verificar que el `Dockerfile` copia el directorio prisma antes de ejecutar `npx prisma generate`.
3. En Coolify, forzar una reconstruccion sin cache: buscar la opcion **Force Rebuild** o similar.

### Problema: "prisma migrate deploy" falla al iniciar el contenedor

**Sintoma:** El contenedor se reinicia continuamente. Los logs muestran un error de conexion a la base de datos.

**Solucion:**
1. Verificar que `DATABASE_URL` esta correctamente configurada como variable de entorno (no como build arg).
2. Verificar que el hostname de PostgreSQL en `DATABASE_URL` es el nombre interno del contenedor (ej. `lorito-killer-db`), no `localhost`.
3. Verificar que PostgreSQL esta corriendo: en Coolify, ir al recurso de PostgreSQL y verificar el estado.
4. Verificar que ambos recursos (app y DB) estan en la misma red Docker.

Para verificar la conectividad entre contenedores via SSH:

```bash
# Ver las redes Docker
docker network ls

# Verificar que ambos contenedores estan en la misma red
docker inspect <container-app> | grep -A 10 "Networks"
docker inspect <container-db> | grep -A 10 "Networks"
```

Si no estan en la misma red, en Coolify verificar la configuracion de red de ambos recursos.

### Problema: SSL wildcard no funciona / certificado invalido

**Sintoma:** El navegador muestra "Tu conexion no es privada" para subdominios.

**Solucion:**
1. Verificar que el token de Cloudflare tiene permisos de "Edit zone DNS" para la zona correcta.
2. Verificar que Traefik tiene las variables de entorno de Cloudflare configuradas.
3. Revisar los logs de Traefik: en Coolify -> Servers -> localhost -> Proxy -> Logs.
4. Buscar errores relacionados con ACME o Let's Encrypt.
5. Esperar unos minutos - la emision del certificado puede tomar tiempo.

```bash
# Verificar la propagacion DNS
dig kogozstaging.lat
dig fantastidog.kogozstaging.lat

# Verificar el certificado
echo | openssl s_client -connect kogozstaging.lat:443 -servername kogozstaging.lat 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

### Problema: Subdominio no carga / error 404

**Sintoma:** Al acceder a `https://mitienda.kogozstaging.lat`, muestra 404 o pagina en blanco.

**Solucion:**
1. Verificar que `PREVIEW=false` en las variables de entorno.
2. Verificar que la empresa con el subdominio `mitienda` existe en la base de datos.
3. Verificar que el dominio wildcard esta configurado en Coolify: `*.kogozstaging.lat`.
4. Verificar que el registro DNS wildcard (`*`) existe en Cloudflare.
5. Revisar los logs de la aplicacion para ver que subdominio esta recibiendo el middleware.

### Problema: Variables NEXT_PUBLIC_* no toman efecto

**Sintoma:** Las funciones que dependen de variables publicas (ej. Supabase Realtime) no funcionan en el navegador.

**Solucion:**
Las variables `NEXT_PUBLIC_*` se incrustan en el JavaScript durante el build. **No son variables de entorno en runtime.**

1. Verificar que estan configuradas como **Build Arguments** en Coolify, no solo como Environment Variables.
2. Re-desplegar la aplicacion (es necesario un nuevo build para que los cambios surtan efecto).
3. Verificar en el navegador: abrir DevTools -> Sources -> buscar el valor de la variable en los archivos JS del bundle.

### Problema: El contenedor se reinicia constantemente (CrashLoopBackOff)

**Sintoma:** El estado del recurso alterna entre Starting y Error.

**Solucion:**
1. Revisar los logs del contenedor en Coolify.
2. Causas comunes:
   - `DATABASE_URL` invalido o base de datos no accesible.
   - Migraciones de Prisma fallan (esquema incompatible).
   - Puerto 3000 en conflicto.
   - Falta alguna variable de entorno critica.

```bash
# Ver logs del contenedor directamente via SSH
docker logs <nombre-del-contenedor> --tail 100
```

### Problema: Coolify no accesible en puerto 8000

**Sintoma:** `http://135.181.34.192:8000` no carga.

**Solucion:**

```bash
# Verificar que Coolify esta corriendo
ssh root@135.181.34.192
docker ps | grep coolify

# Verificar el firewall
ufw status

# Si el firewall bloquea, abrir el puerto
ufw allow 8000/tcp

# Reiniciar Coolify si es necesario
cd /data/coolify/source
docker compose up -d
```

### Problema: DNS no resuelve al VPS

**Sintoma:** `dig kogozstaging.lat` no devuelve la IP `135.181.34.192`.

**Solucion:**
1. Verificar que los nameservers de Namecheap estan configurados a Cloudflare.
2. La propagacion DNS puede tomar hasta 48 horas (generalmente 1-2 horas).
3. Verificar en Cloudflare que la zona esta activa (no "Pending").
4. Verificar los registros DNS en Cloudflare.

```bash
# Verificar propagacion DNS
dig kogozstaging.lat @1.1.1.1
dig kogozstaging.lat @8.8.8.8

# Verificar nameservers
dig NS kogozstaging.lat
```

### Problema: Error de memoria durante el build

**Sintoma:** El build de Next.js falla con "JavaScript heap out of memory".

**Solucion:**

Agregar la variable de entorno al build:

```
NODE_OPTIONS=--max-old-space-size=4096
```

En Coolify, agregar como Build Argument:

```
NODE_OPTIONS=--max-old-space-size=4096
```

El VPS tiene 8GB RAM, asi que 4GB para el build deberia ser suficiente.

---

## 15. Arquitectura del Sistema

```
                    Internet
                       |
                 [Cloudflare DNS]
                 (kogozstaging.lat)
                 (*.kogozstaging.lat)
                       |
              [Hetzner VPS - 135.181.34.192]
                       |
                   [Coolify]
                       |
                   [Traefik]
                  (SSL/Routing)
                   /        \
          [Next.js App]    [PostgreSQL 16]
          (Puerto 3000)    (Solo red interna)
          (Dockerfile)     (lorito_killer_production)
               |
         [Inngest Cloud]
         (Jobs en segundo plano)
```

### Flujo de una Request Multi-tenant

```
1. Usuario accede a: https://mitienda.kogozstaging.lat/dashboard

2. Cloudflare DNS resuelve *.kogozstaging.lat -> 135.181.34.192

3. Traefik (Coolify) recibe la request en puerto 443
   - Termina SSL con certificado wildcard de Let's Encrypt
   - Enruta al contenedor de la aplicacion Next.js

4. Next.js Middleware (src/middleware.ts)
   - Lee el hostname: "mitienda.kogozstaging.lat"
   - Extrae el subdominio: "mitienda"
   - Reescribe la URL: /mitienda/dashboard
   - Verifica autenticacion y permisos de ruta

5. App Router de Next.js
   - Enruta a /src/app/[subdomain]/dashboard/
   - [subdomain] = "mitienda"
   - Todas las consultas a DB filtran por companyId asociado a "mitienda"
```

---

## Checklist Final

Usar esta lista para verificar que todo esta configurado correctamente:

- [ ] Coolify instalado y accesible en `http://135.181.34.192:8000`
- [ ] PostgreSQL 16 corriendo en Coolify (sin puerto publico)
- [ ] Token de Cloudflare creado con permisos DNS Edit
- [ ] SSL wildcard configurado en Coolify/Traefik con DNS-01 challenge
- [ ] Aplicacion Next.js desplegada con Dockerfile
- [ ] Dominios configurados: `kogozstaging.lat` y `*.kogozstaging.lat`
- [ ] Build Arguments configurados: `NEXT_PUBLIC_REALTIME_PROVIDER`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Variables de entorno configurados: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `ADMIN_EMAIL`, `PREVIEW=false`
- [ ] Health check responde: `https://kogozstaging.lat/api/health` -> `{"status":"ok","database":"connected"}`
- [ ] Subdominio de prueba funciona: `https://fantastidog.kogozstaging.lat/login`
- [ ] Inngest Cloud conectado con webhook URL
- [ ] Backups de base de datos configurados
- [ ] Firewall configurado (puertos 22, 80, 443, 8000)
- [ ] (Opcional) Proxy de Cloudflare activado con SSL Full (strict)
