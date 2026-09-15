import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test } from "vitest";
import prisma from "@/lib/prisma";
import {
  authorizePrintJob,
  findPrintJob,
  recordPrintJobResult,
  reserveDuePrintJobs,
} from "@/kitchen/db_repository";

const ids = {
  company: randomUUID(),
  user: randomUUID(),
  client: randomUUID(),
  printer1: randomUUID(),
  printer2: randomUUID(),
  order: randomUUID(),
  round: randomUUID(),
  kitchens: [randomUUID(), randomUUID(), randomUUID()],
  tickets: [randomUUID(), randomUUID(), randomUUID()],
  jobs: [randomUUID(), randomUUID(), randomUUID()],
};

beforeAll(async () => {
  const db = prisma();
  await db.company.create({ data: { id: ids.company, address: "QA" } });
  await db.user.create({
    data: {
      id: ids.user,
      companyId: ids.company,
      email: `kit-04-${ids.company}@example.test`,
      password: "test",
    },
  });
  await db.printClient.create({
    data: {
      id: ids.client,
      companyId: ids.company,
      machineName: "KIT-04",
      credentialHash: randomUUID(),
      lastSeenAt: new Date(),
    },
  });
  await db.printer.createMany({
    data: [ids.printer1, ids.printer2].map((id, index) => ({
      id,
      companyId: ids.company,
      printClientId: ids.client,
      localName: `KIT-04-${index}`,
      lastDetectedAt: new Date(),
    })),
  });
  await db.kitchen.createMany({
    data: ids.kitchens.map((id, index) => ({
      id,
      companyId: ids.company,
      name: `Kitchen ${index}`,
    })),
  });
  await db.order.create({
    data: {
      id: ids.order,
      companyId: ids.company,
      orderType: "DINE_IN",
      status: "PENDING",
      discountAmount: 0,
      netTotal: 0,
      total: 0,
    },
  });
  await db.orderRound.create({
    data: {
      id: ids.round,
      orderId: ids.order,
      number: 1,
      responsibleUserId: ids.user,
      requestHash: randomUUID(),
    },
  });
  await db.kitchenTicket.createMany({
    data: ids.tickets.map((id, index) => ({
      id,
      orderRoundId: ids.round,
      kitchenId: ids.kitchens[index],
    })),
  });
  await db.kitchetTicketPrintJob.createMany({
    data: ids.jobs.map((id, index) => ({
      id,
      companyId: ids.company,
      kitchenTicketId: ids.tickets[index],
      printerId: index < 2 ? ids.printer1 : ids.printer2,
      content: Buffer.from([index, 255]),
      requestedById: ids.user,
      createdAt: new Date(Date.now() + index),
    })),
  });
});

afterAll(async () => {
  const db = prisma();
  await db.kitchetTicketPrintJob.deleteMany({
    where: { companyId: ids.company },
  });
  await db.kitchenTicket.deleteMany({ where: { orderRoundId: ids.round } });
  await db.orderRound.deleteMany({ where: { id: ids.round } });
  await db.order.deleteMany({ where: { id: ids.order } });
  await db.kitchen.deleteMany({ where: { companyId: ids.company } });
  await db.printer.deleteMany({ where: { companyId: ids.company } });
  await db.printClient.deleteMany({ where: { companyId: ids.company } });
  await db.user.deleteMany({ where: { companyId: ids.company } });
  await db.company.deleteMany({ where: { id: ids.company } });
});

test("parallel workers reserve only the oldest job per free printer", async () => {
  const reservations = (
    await Promise.all([
      reserveDuePrintJobs(new Date()),
      reserveDuePrintJobs(new Date()),
    ])
  ).flat();
  expect(reservations).toHaveLength(2);
  expect(new Set(reservations.map((job) => job.printClientId))).toEqual(
    new Set([ids.client]),
  );
  expect(reservations.map((job) => job.id)).toContain(ids.jobs[0]);
  expect(reservations.map((job) => job.id)).toContain(ids.jobs[2]);

  const reserved = await findPrintJob(ids.jobs[0]);
  expect(reserved?.claimRequestedAt).not.toBeNull();
  const authorized = await authorizePrintJob({
    jobId: ids.jobs[0],
    clientId: ids.client,
    expectedClaimRequestedAt: reserved!.claimRequestedAt!,
    now: new Date(),
  });
  expect(authorized).toMatchObject({ status: "PROCESSING", attempts: 1 });

  const retried = await recordPrintJobResult({
    jobId: ids.jobs[0],
    clientId: ids.client,
    attemptNumber: 1,
    status: "PENDING",
    nextAttemptAt: new Date(Date.now() + 5000),
    error: "sin bytes enviados",
  });
  expect(retried).toMatchObject({
    status: "PENDING",
    attempts: 1,
    claimRequestedAt: null,
    processingStartedAt: null,
  });
  expect(Buffer.from(retried!.content)).toEqual(Buffer.from([0, 255]));
});

test("the partial index rejects another active job for the same ticket", async () => {
  await expect(
    prisma().kitchetTicketPrintJob.create({
      data: {
        companyId: ids.company,
        kitchenTicketId: ids.tickets[1],
        printerId: ids.printer1,
        content: Buffer.from([1]),
        requestedById: ids.user,
      },
    }),
  ).rejects.toMatchObject({ code: "P2002" });
});
