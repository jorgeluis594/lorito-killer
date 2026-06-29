import { getSession } from "@/lib/auth";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import { findSellerSaleFacts } from "@/sale_report/db_repository";
import SellerReportView from "@/sale_report/components/sellers/seller-report-view";
import { buildSellerPerformanceReportCreator } from "@/sale_report/use-cases/build-seller-performance-report";
import {
  sellerReportQueryFromSearchParams,
  type ReportSearchParams,
} from "@/sale_report/search-params";

type SellerReportContentProps = {
  searchParams: ReportSearchParams;
};

export default async function SellerReportContent({
  searchParams,
}: SellerReportContentProps) {
  const session = await getSession();
  if (!session.user) {
    return <SignOutRedirection />;
  }

  const buildSellerPerformanceReport = buildSellerPerformanceReportCreator({
    findSellerSaleFacts,
  });

  const reportResponse = await buildSellerPerformanceReport(
    sellerReportQueryFromSearchParams(searchParams, session.user.companyId),
  );

  if (!reportResponse.success) {
    return (
      <p className="rounded-md border p-6 text-sm text-destructive">
        {reportResponse.message}
      </p>
    );
  }

  return (
    <SellerReportView
      report={reportResponse.data}
      searchParams={searchParams}
    />
  );
}
