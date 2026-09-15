import type { response } from "@/lib/types";
import { hashCredential } from "./crypto";
import { authenticateCredential } from "./db_repository";
import type { PrintClientIdentity } from "./types";

export const authenticatePrintClient = async (
  authorization: string | null,
): Promise<response<PrintClientIdentity>> => {
  const credential = authorization?.match(/^Bearer (lpk_[A-Za-z0-9_-]{43})$/)?.[1];
  if (!credential) return { success: false, message: "Credencial invalida" };
  const client = await authenticateCredential(
    hashCredential(credential),
    new Date(),
  );
  return client
    ? { success: true, data: client }
    : { success: false, message: "Credencial invalida" };
};
