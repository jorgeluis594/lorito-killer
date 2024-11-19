import { PrismaClient } from "@prisma/client";
import { response } from "@/lib/types";

let prismaClient: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prismaClient = new PrismaClient();
} else {
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient();
  }
  prismaClient = (global as any).prisma;
}

export const setPrismaClient = (newPrismaClient: PrismaClient) => {
  prismaClient = newPrismaClient;
};

export default function prisma(): PrismaClient {
  return prismaClient;
}

/**
 * Executes a given callback function within a database transaction context.
 * If the callback function resolves with a success response,
 * the transaction is committed; otherwise, it is rolled back.
 *
 * @param {Function} cb - A callback function that returns a promise of a response object.
 * @return {Promise<response<T>>} A promise that resolves with the response object returned by the callback function.
 */
export async function withinTransaction<T>(
  cb: () => Promise<response<T>>,
): Promise<response<T>> {
  const previousPrismaClient = prisma();
  let value: response;

  try {
    await previousPrismaClient.$transaction(async (tx) => {
      setPrismaClient(tx as any);
      value = await cb();
      if (!value.success) {
        throw new Error("rollback transaction");
      }
    });
  } catch (e) {
    console.error("transaction rolled back");
  } finally {
    setPrismaClient(previousPrismaClient); // Reset to the previous client
  }

  // @ts-ignore
  return value;
}
