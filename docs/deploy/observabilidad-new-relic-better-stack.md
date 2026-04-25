# Observabilidad con New Relic Free y Better Stack Free

Esta guia cubre los pasos manuales para activar APM, logs y uptime checks en produccion.

## 1. Crear cuentas y credenciales

1. Crea una cuenta en New Relic.
2. Copia tu `NEW_RELIC_LICENSE_KEY`.
3. Crea una cuenta en Better Stack.
4. En Better Stack Logs, crea un Source para JavaScript/Node.js.
5. Copia el `Source token` y el `Ingesting host`.

Referencias oficiales:

- New Relic Node.js agent: https://docs.newrelic.com/docs/apm/agents/nodejs-agent/installation-configuration/install-nodejs-agent/
- Better Stack Pino transport: https://betterstack.com/docs/logs/javascript/pino/
- Better Stack uptime monitor: https://betterstack.com/docs/uptime/uptime-monitor/

## 2. Configurar Coolify

Agrega estas variables al servicio de la app Next.js:

```env
NEW_RELIC_ENABLED=true
NEW_RELIC_LICENSE_KEY=<license-key-de-new-relic>
NEW_RELIC_APP_NAME=lorito-killer-production

BETTER_STACK_SOURCE_TOKEN=<source-token-de-better-stack>
BETTER_STACK_INGESTING_HOST=<ingesting-host-de-better-stack>
BETTER_STACK_LOG_LEVEL=warn
```

Agrega estas variables al servicio del worker:

```env
NEW_RELIC_ENABLED=true
NEW_RELIC_LICENSE_KEY=<license-key-de-new-relic>
NEW_RELIC_APP_NAME=lorito-killer-worker-production

BETTER_STACK_SOURCE_TOKEN=<source-token-de-better-stack>
BETTER_STACK_INGESTING_HOST=<ingesting-host-de-better-stack>
BETTER_STACK_LOG_LEVEL=warn
```

Usa `warn` para proteger la cuota gratuita de Better Stack. Sube a `info` solo temporalmente para investigar incidentes.

## 3. Desplegar y validar

1. Despliega primero la app Next.js.
2. Despliega el worker.
3. Abre New Relic y valida que aparezcan:
   - `lorito-killer-production`
   - `lorito-killer-worker-production`
4. En Better Stack Logs, abre Live tail y valida que lleguen logs `warn` o `error`.
5. Prueba el health check profundo:

```bash
curl https://TU_DOMINIO/api/health/deep
```

La respuesta correcta debe tener estado HTTP `200`:

```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

## 4. Crear monitor y status page en Better Stack

1. En Better Stack Uptime, crea un monitor HTTP.
2. URL: `https://TU_DOMINIO/api/health/deep`.
3. Método: `GET`.
4. Expected status: `200`.
5. Crea una status page y conecta el monitor.
6. Configura alertas por email o Slack.

El endpoint `/api/health` queda como health check basico del contenedor Docker. Usa `/api/health/deep` para Better Stack porque valida PostgreSQL y Redis.

## 5. Notas de operacion

- Si falta `NEW_RELIC_LICENSE_KEY`, el agente queda deshabilitado y la app sigue arrancando.
- Si falta `BETTER_STACK_SOURCE_TOKEN`, los logs siguen saliendo por stdout de Docker/Coolify.
- Los campos sensibles comunes se redactan antes de emitir logs: passwords, tokens, secrets, cookies, authorization headers y billing credentials.
- No se envian logs del navegador a Better Stack en esta fase.
- Para investigar un incidente, cambia temporalmente `BETTER_STACK_LOG_LEVEL=info` y vuelve a `warn` al terminar.
