import type { response } from "@/lib/types";
import type {
  SellerPerformanceReport,
  SellerReportQuery,
  SellerSaleFact,
} from "@/sale_report/types";
import { calculateSellerPerformanceReport } from "@/sale_report/use-cases/calculate-seller-performance-report";
import { normalizeSellerReportQuery } from "@/sale_report/use-cases/normalize-seller-report-query";

type SellerPerformanceDependencies = {
  findSellerSaleFacts: (
    query: SellerReportQuery,
  ) => Promise<response<SellerSaleFact[]>>;
};

export function buildSellerPerformanceReportCreator(
  dependencies: SellerPerformanceDependencies,
) {
  return async function buildSellerPerformanceReport(
    query: Partial<SellerReportQuery> & Pick<SellerReportQuery, "companyId">,
  ): Promise<response<SellerPerformanceReport>> {
    const normalizedQueryResponse = normalizeSellerReportQuery(query);
    if (!normalizedQueryResponse.success) return normalizedQueryResponse;

    const factsResponse = await dependencies.findSellerSaleFacts(
      normalizedQueryResponse.data,
    );
    if (!factsResponse.success) return factsResponse;

    return calculateSellerPerformanceReport(
      normalizedQueryResponse.data,
      factsResponse.data,
    );
  };
}
