import type { response } from "@/lib/types";
import type { LinkedPrintClient } from "../types";

type Dependencies = {
  consumeCode: (input: {
    codeHash: string;
    machineName: string;
    credentialHash: string;
    now: Date;
  }) => Promise<
    { id: string; companyId: string; companyName: string | null } | undefined
  >;
  createCredential: () => string;
  hashCode: (code: string) => string;
  hashCredential: (credential: string) => string;
  now: () => Date;
};

export const linkPrintClient = async (
  dependencies: Dependencies,
  input: { code: string; machineName: string },
): Promise<response<LinkedPrintClient>> => {
  const credential = dependencies.createCredential();
  const client = await dependencies.consumeCode({
    codeHash: dependencies.hashCode(input.code),
    machineName: input.machineName,
    credentialHash: dependencies.hashCredential(credential),
    now: dependencies.now(),
  });

  return client
    ? { success: true, data: { ...client, credential } }
    : { success: false, message: "Codigo invalido o vencido" };
};
