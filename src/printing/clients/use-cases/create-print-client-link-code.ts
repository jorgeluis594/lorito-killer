import type { response } from "@/lib/types";

type Dependencies = {
  createCode: (input: {
    companyId: string;
    createdById: string;
    codeHash: string;
    expiresAt: Date;
    now: Date;
  }) => Promise<boolean>;
  generateCode: () => string;
  hashCode: (code: string) => string;
  now: () => Date;
};

export const createPrintClientLinkCode = async (
  dependencies: Dependencies,
  input: { companyId: string; createdById: string },
): Promise<response<{ code: string; expiresAt: Date }>> => {
  const now = dependencies.now();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = dependencies.generateCode();
    if (
      await dependencies.createCode({
        ...input,
        codeHash: dependencies.hashCode(code),
        expiresAt,
        now,
      })
    ) {
      return { success: true, data: { code, expiresAt } };
    }
  }

  return { success: false, message: "No se pudo generar el codigo" };
};
