import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, test } from "vitest";
import prisma from "@/lib/prisma";
import { createKitchenConfiguration } from "@/kitchen/db_repository";

const suffix = randomUUID();
const companyId = randomUUID();
const clientId = randomUUID();
const printerId = randomUUID();

beforeAll(async () => {
  await prisma().company.create({
    data: { id: companyId, address: "QA", name: `KIT-02 ${suffix}` },
  });
  await prisma().printClient.create({
    data: {
      id: clientId,
      companyId,
      machineName: `QA-${suffix}`,
      credentialHash: suffix,
      lastSeenAt: new Date(),
    },
  });
  await prisma().printer.create({
    data: {
      id: printerId,
      companyId,
      printClientId: clientId,
      localName: "PARRILLA",
      lastDetectedAt: new Date(),
    },
  });
});

afterAll(async () => {
  await prisma().kitchen.deleteMany({ where: { companyId } });
  await prisma().printer.deleteMany({ where: { companyId } });
  await prisma().printClient.deleteMany({ where: { companyId } });
  await prisma().company.deleteMany({ where: { id: companyId } });
  await prisma().$disconnect();
});

test("the database allows only one concurrent Kitchen assignment per printer", async () => {
  const results = await Promise.all([
    createKitchenConfiguration(companyId, {
      name: "Parrilla",
      status: "ACTIVE",
      printerId,
    }),
    createKitchenConfiguration(companyId, {
      name: "Cocina",
      status: "ACTIVE",
      printerId,
    }),
  ]);

  expect(results.filter((result) => result.success)).toHaveLength(1);
  expect(await prisma().kitchen.count({ where: { printerId } })).toBe(1);
});
