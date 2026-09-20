import type { response } from "@/lib/types";
import type { PrintClientIdentity, PrinterInventory } from "../types";

type Dependencies = {
  registerInventory: (
    client: PrintClientIdentity,
    localNames: string[],
    now: Date,
  ) => Promise<boolean>;
  now: () => Date;
};

export const registerPrinterInventory = async (
  dependencies: Dependencies,
  client: PrintClientIdentity,
  inventory: PrinterInventory,
): Promise<response<{ registered: number; lastInventoryAt: Date }>> => {
  const now = dependencies.now();
  const localNames = [
    ...new Set(inventory.printers.map(({ localName }) => localName)),
  ];
  if (!(await dependencies.registerInventory(client, localNames, now))) {
    return { success: false, message: "Credencial invalida" };
  }
  return {
    success: true,
    data: { registered: localNames.length, lastInventoryAt: now },
  };
};
