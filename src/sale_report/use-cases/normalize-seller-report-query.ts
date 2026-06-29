import { TICKET, type DocumentType } from "@/document/types";
import { errorResponse } from "@/lib/utils";
import type { response } from "@/lib/types";
import type {
  SellerMode,
  SellerReportQuery,
  SellerReportStatus,
} from "@/sale_report/types";

type RawSellerReportQuery = Partial<SellerReportQuery> &
  Pick<SellerReportQuery, "companyId">;

const validStatuses = new Set<SellerReportStatus>([
  "paid",
  "cancelled",
  "all",
]);

const validSellerModes = new Set<SellerMode>([
  "all",
  "specific",
  "unassigned",
]);

const validDocumentTypes = new Set<DocumentType>([
  "invoice",
  "receipt",
  TICKET,
]);

export function normalizeSellerReportQuery(
  query: RawSellerReportQuery,
): response<SellerReportQuery> {
  if (!query.companyId) {
    return errorResponse("La compania es requerida");
  }

  if (query.startDate && query.endDate && query.startDate > query.endDate) {
    return errorResponse("La fecha inicial no puede ser mayor a la final");
  }

  const status = validStatuses.has(query.status as SellerReportStatus)
    ? (query.status as SellerReportStatus)
    : "paid";

  let sellerMode = validSellerModes.has(query.sellerMode as SellerMode)
    ? (query.sellerMode as SellerMode)
    : "all";

  const sellerId = query.sellerId?.trim() || undefined;
  if (sellerId && sellerMode !== "unassigned") {
    sellerMode = "specific";
  }

  if (sellerMode === "specific" && !sellerId) {
    return errorResponse("Seleccione un vendedor para filtrar");
  }

  const documentTypes = query.documentTypes?.filter((documentType) =>
    validDocumentTypes.has(documentType),
  );

  return {
    success: true,
    data: {
      companyId: query.companyId,
      startDate: query.startDate,
      endDate: query.endDate,
      sellerMode,
      sellerId: sellerMode === "specific" ? sellerId : undefined,
      status,
      documentTypes: documentTypes?.length ? documentTypes : undefined,
      customerId: query.customerId?.trim() || undefined,
    },
  };
}
