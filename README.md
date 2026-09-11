
# Desarrollo local con Docker

El entorno de desarrollo requiere un archivo `.env` y publica únicamente la
aplicación web. PostgreSQL, Redis, el worker y Bull Board quedan disponibles
solo dentro de la red de Docker Compose.

```sh
cp .env.example .env
docker compose up --build
```

Abre <http://localhost:3000>. Para usar otro puerto en el host:

```sh
APP_PORT=3005 docker compose up --build
```

Las migraciones se aplican automáticamente al iniciar. Para ejecutar comandos
Prisma manualmente, usa la imagen de desarrollo dentro de Compose:

```sh
docker compose run --rm migrate npx prisma migrate deploy
docker compose run --rm migrate npx prisma generate
```

Otros comandos útiles:

```sh
docker compose exec web npm run lint
docker compose ps
docker compose down
```
