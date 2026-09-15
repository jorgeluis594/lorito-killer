import type { response } from "@/lib/types";
import { DishProductType } from "@/product/types";
import type { RoundLineInput, SendRoundResult } from "../types";

export type RoundProduct = {
  id: string;
  name: string;
  price: number;
  type: string;
  kitchenId: string | null;
};

export type PersistedRoundLine = RoundLineInput & {
  productName: string;
  productPrice: number;
  kitchenId: string | null;
};

export type SendRoundDependencies = {
  findExisting: (roundId: string) => Promise<{
    orderId: string;
    requestHash: string;
    result: SendRoundResult;
  } | null>;
  findProducts: (productIds: string[]) => Promise<RoundProduct[]>;
  persist: (lines: PersistedRoundLine[]) => Promise<SendRoundResult>;
};

export async function sendRound(
  input: {
    companyId: string;
    orderId: string;
    roundId: string;
    requestHash: string;
    items: RoundLineInput[];
  },
  dependencies: SendRoundDependencies,
): Promise<response<SendRoundResult>> {
  const existing = await dependencies.findExisting(input.roundId);
  if (existing) {
    return existing.orderId === input.orderId &&
      existing.requestHash === input.requestHash
      ? { success: true, data: existing.result }
      : {
          success: false,
          message: "El identificador de ronda ya se usó para otro envío.",
        };
  }

  if (!input.items.length || input.items.some((item) => item.quantity <= 0)) {
    return { success: false, message: "Revisa los productos y cantidades." };
  }

  const products = await dependencies.findProducts([
    ...new Set(input.items.map((item) => item.productId)),
  ]);
  const productMap = new Map(products.map((product) => [product.id, product]));
  if (
    productMap.size !== new Set(input.items.map((item) => item.productId)).size
  ) {
    return {
      success: false,
      message: "Un producto ya no está disponible. Retíralo para continuar.",
    };
  }

  const lines: PersistedRoundLine[] = [];
  for (const item of input.items) {
    const product = productMap.get(item.productId)!;
    const line = {
      ...item,
      notes: item.notes?.trim() || undefined,
      productName: product.name,
      productPrice: product.price,
      kitchenId: product.kitchenId,
    };
    if (product.type === DishProductType) lines.push(line);
    else {
      const existingLine = lines.find(
        (candidate) => candidate.productId === item.productId,
      );
      if (existingLine) existingLine.quantity += item.quantity;
      else lines.push(line);
    }
  }

  return { success: true, data: await dependencies.persist(lines) };
}
