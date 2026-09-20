import type { response } from "@/lib/types";
import type { Kitchen, KitchenOption, KitchenStatus } from "../types";

export type KitchenInput = {
  name: string;
  status: KitchenStatus;
  printerId?: string | null;
};

type Dependencies = {
  list: (
    companyId: string,
    activeOnly: boolean,
  ) => Promise<Kitchen[] | KitchenOption[]>;
  create: (
    companyId: string,
    input: KitchenInput,
  ) => Promise<response<Kitchen>>;
  update: (
    companyId: string,
    kitchenId: string,
    input: KitchenInput,
  ) => Promise<response<Kitchen>>;
};

export const getKitchens = (
  dependencies: Pick<Dependencies, "list">,
  companyId: string,
  variant: "PRODUCT_SELECTOR" | "ADMIN",
) => dependencies.list(companyId, variant === "PRODUCT_SELECTOR");

export const createKitchen = (
  dependencies: Pick<Dependencies, "create">,
  companyId: string,
  input: KitchenInput,
) => dependencies.create(companyId, input);

export const updateKitchen = (
  dependencies: Pick<Dependencies, "update">,
  companyId: string,
  kitchenId: string,
  input: KitchenInput,
) => dependencies.update(companyId, kitchenId, input);
