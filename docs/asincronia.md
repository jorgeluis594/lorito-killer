# Asincronismo

El proyecto usa BullMQ para ejecutar trabajos lentos fuera del flujo principal de Next.js.

## Resumen

- Next.js encola jobs desde codigo server-side.
- Redis funciona como broker de BullMQ.
- `src/worker.ts` corre en un proceso separado y procesa los modulos registrados.
- Bull Board se levanta desde el worker para inspeccionar las colas.

## Arquitectura

- `src/lib/queue/connection.ts`: conexion Redis compartida.
- `src/lib/queue/queue.ts`: helper base para crear colas BullMQ.
- `src/lib/queue/worker.ts`: helper base para crear workers con logs comunes.
- `src/lib/queue/domain-queue.ts`: API principal para declarar jobs de un dominio.
- `src/lib/queue/module.ts`: contrato usado por `src/worker.ts` para registrar colas y workers.

Cada dominio declara sus jobs en un solo archivo. El ejemplo actual es `src/document/jobs.ts`.

## Convenciones

- Crear una cola por dominio con `createDomainQueue`.
- Declarar cada job con `domainQueue.job(name, config, handler)`.
- Exportar el job y usar `job.enqueue(data)` desde otros modulos server-side.
- No llamar `queue.add` directamente fuera del helper.
- Definir idempotencia con `idempotency` cuando el job no debe duplicarse.
- Exportar `domainQueue.module()` y registrarlo en `queueModules` dentro de `src/worker.ts`.
- Mantener la logica de negocio en casos de uso; el job solo adapta BullMQ al caso de uso.

Los nombres finales de jobs usan este formato:

```txt
BULLMQ_JOB_PREFIX:dominio:job
```

Si `BULLMQ_JOB_PREFIX` no existe, se usa:

```txt
dominio:job
```

## Configuracion

Variables de entorno:

- `REDIS_URL`: conexion a Redis.
- `BULLMQ_JOB_PREFIX`: prefijo opcional para nombres de jobs.
- `BULL_BOARD_PORT`: puerto opcional de Bull Board. Default: `3001`.

Configuracion de un job:

- `idempotency`: funcion opcional que genera una llave estable para evitar duplicados.
- `options`: opciones BullMQ del job. Puede ser un objeto fijo o una funcion basada en `data`.
- `logContext`: datos extra para logs de `completed` y `failed`.

Ejemplo:

```ts
export const exampleJob = documentQueue.job<ExampleJobData>(
  "example-job",
  {
    idempotency: (data) => data.documentId,
    options: {
      attempts: 2,
      delay: 5000,
      priority: 1,
    },
    logContext: (data) => ({ documentId: data.documentId }),
  },
  async (data) => {
    return runExampleUseCase(data.documentId);
  },
);
```

`enqueue` tambien acepta opciones BullMQ. Estas opciones tienen prioridad sobre `options` del job:

```ts
await exampleJob.enqueue(data, {
  delay: 10000,
});
```

Si el job define `idempotency`, el `jobId` se genera asi:

```txt
nombre-final-del-job:valor-de-idempotency
```

Un `jobId` enviado en `enqueue` tiene prioridad sobre el generado por `idempotency`.

## Como agregar un job

1. Crear o reutilizar la cola del dominio.

```ts
const documentQueue = createDomainQueue("document");
```

2. Declarar el job con su input, configuracion y callback.

```ts
type ExampleJobData = {
  companyId: string;
  documentId: string;
};

export const exampleJob = documentQueue.job<ExampleJobData>(
  "example-job",
  {
    idempotency: (data) => data.documentId,
    logContext: (data) => ({ documentId: data.documentId }),
  },
  async (data, job) => {
    return runExampleUseCase(data.documentId);
  },
);
```

3. Exportar el modulo del dominio.

```ts
export const documentJobs = documentQueue.module();
```

4. Registrar el modulo en `src/worker.ts`.

```ts
const queueModules = [documentJobs];
```

5. Encolar desde codigo server-side.

```ts
await exampleJob.enqueue({
  companyId,
  documentId,
});
```

Con eso el job queda disponible para enqueue, procesamiento en background, shutdown controlado y Bull Board.
