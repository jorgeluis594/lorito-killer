import type { response } from "@/lib/types";

const SELLER_CODE_REGEX = /^\d{4}$/;

export type ResolveOrderSellerIdDependencies = {
  isFeatureEnabled: (companyId: string, key: "seller") => Promise<boolean>;
  findActiveSellerIdByCode: (
    sellerCode: string,
    companyId: string,
  ) => Promise<string | null>;
};

type ResolveOrderSellerIdInput = {
  companyId: string;
  sellerCode?: string | null;
};

export async function resolveOrderSellerId(
  { companyId, sellerCode }: ResolveOrderSellerIdInput,
  dependencies: ResolveOrderSellerIdDependencies,
): Promise<response<string | null>> {
  const sellerEnabled = await dependencies.isFeatureEnabled(
    companyId,
    "seller",
  );

  if (!sellerEnabled) {
    return { success: true, data: null };
  }

  const normalizedSellerCode =
    typeof sellerCode === "string" ? sellerCode.trim() : "";
  if (!SELLER_CODE_REGEX.test(normalizedSellerCode)) {
    return {
      success: false,
      message: "El codigo debe tener exactamente 4 digitos",
    };
  }

  const sellerId = await dependencies.findActiveSellerIdByCode(
    normalizedSellerCode,
    companyId,
  );
  if (!sellerId) {
    return {
      success: false,
      message: "Codigo de seller no encontrado",
    };
  }

  return { success: true, data: sellerId };
}
