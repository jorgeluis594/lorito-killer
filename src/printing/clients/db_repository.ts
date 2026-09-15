import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { PrintClientIdentity } from "./types";

export const createCode = async (input: {
  companyId: string;
  createdById: string;
  codeHash: string;
  expiresAt: Date;
  now: Date;
}): Promise<boolean> => {
  await prisma().printClientLinkCode.deleteMany({
    where: { expiresAt: { lte: input.now } },
  });
  try {
    const { now: _now, ...data } = input;
    await prisma().printClientLinkCode.create({ data });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return false;
    throw error;
  }
};

export const consumeCode = async (input: {
  codeHash: string;
  machineName: string;
  credentialHash: string;
  now: Date;
}): Promise<PrintClientIdentity | undefined> =>
  prisma().$transaction(async (db) => {
    await db.printClientLinkCode.deleteMany({
      where: { expiresAt: { lte: input.now } },
    });
    const code = await db.printClientLinkCode.findUnique({
      where: { codeHash: input.codeHash },
      select: { id: true, companyId: true, expiresAt: true },
    });
    if (!code || code.expiresAt <= input.now) return undefined;

    const consumed = await db.printClientLinkCode.deleteMany({
      where: { id: code.id, expiresAt: { gt: input.now } },
    });
    if (consumed.count !== 1) return undefined;

    return db.printClient.create({
      data: {
        companyId: code.companyId,
        machineName: input.machineName,
        credentialHash: input.credentialHash,
        lastSeenAt: input.now,
      },
      select: { id: true, companyId: true },
    });
  });

export const authenticateCredential = async (
  credentialHash: string,
  now: Date,
): Promise<PrintClientIdentity | undefined> => {
  const client = await prisma().printClient.findUnique({
    where: { credentialHash },
    select: { id: true, companyId: true, revokedAt: true },
  });
  if (!client || client.revokedAt) return undefined;
  const updated = await prisma().printClient.updateMany({
    where: { id: client.id, revokedAt: null },
    data: { lastSeenAt: now },
  });
  return updated.count === 1
    ? { id: client.id, companyId: client.companyId }
    : undefined;
};

export const registerInventory = async (
  client: PrintClientIdentity,
  localNames: string[],
  now: Date,
): Promise<boolean> =>
  prisma().$transaction(async (db) => {
    const active = await db.printClient.updateMany({
      where: { id: client.id, companyId: client.companyId, revokedAt: null },
      data: { lastInventoryAt: now, lastSeenAt: now },
    });
    if (active.count !== 1) return false;
    await Promise.all(
      localNames.map((localName) =>
        db.printer.upsert({
        where: {
          printClientId_localName: { printClientId: client.id, localName },
        },
        update: { lastDetectedAt: now },
        create: {
          companyId: client.companyId,
          printClientId: client.id,
          localName,
          lastDetectedAt: now,
        },
        }),
      ),
    );
    return true;
  });

export const getPrintClients = (companyId: string) =>
  prisma().printClient.findMany({
    where: { companyId },
    select: {
      id: true,
      machineName: true,
      revokedAt: true,
      lastSeenAt: true,
      lastInventoryAt: true,
      createdAt: true,
      printers: {
        select: {
          id: true,
          localName: true,
          status: true,
          lastDetectedAt: true,
        },
        orderBy: { localName: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

export const revokePrintClient = async (companyId: string, id: string) => {
  const result = await prisma().printClient.updateMany({
    where: { id, companyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count === 1;
};
