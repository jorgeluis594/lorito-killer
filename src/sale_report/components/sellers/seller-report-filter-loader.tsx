import { findCustomer } from "@/customer/db_repository";
import type { Customer } from "@/customer/types";
import { getBillingCredentialsFor } from "@/document/db_repository";
import { getSession } from "@/lib/auth";
import { findSellers } from "@/seller/db_repository";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import SellerReportFilters from "@/sale_report/components/sellers/seller-report-filters";
import {
  searchParamAsString,
  type ReportSearchParams,
} from "@/sale_report/search-params";

type SellerReportFilterLoaderProps = {
  searchParams: ReportSearchParams;
};

export default async function SellerReportFilterLoader({
  searchParams,
}: SellerReportFilterLoaderProps) {
  const session = await getSession();
  if (!session.user) {
    return <SignOutRedirection />;
  }

  const [billingCredentialsResponse, sellersResponse] = await Promise.all([
    getBillingCredentialsFor(session.user.companyId),
    findSellers(session.user.companyId),
  ]);

  let customer: Customer | undefined = undefined;
  const customerId = searchParamAsString(searchParams.customerId);

  if (customerId) {
    const customerResponse = await findCustomer(
      customerId,
      session.user.companyId,
    );

    if (customerResponse.success) {
      customer = customerResponse.data;
    }
  }

  if (!billingCredentialsResponse.success || !sellersResponse.success) {
    return <div>Error cargando los filtros, comuniquese con soporte</div>;
  }

  return (
    <SellerReportFilters
      billingCredentials={billingCredentialsResponse.data}
      customer={customer}
      sellers={sellersResponse.data}
    />
  );
}
