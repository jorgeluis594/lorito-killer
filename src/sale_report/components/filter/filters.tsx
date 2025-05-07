import { getBillingCredentialsFor } from "@/document/db_repository";
import { getSession } from "@/lib/auth";
import { findCustomer } from "@/customer/db_repository";
import { Customer } from "@/customer/types";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import FiltersWithHiddenButton from "@/sale_report/components/filter/filters-with-hidden-button";

type ParamsProps = {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
};

export default async function Filters({ searchParams }: ParamsProps) {
  const session = await getSession();
  if (!session.user) {
    return <SignOutRedirection />;
  }
  const billingCredentialsResponse = await getBillingCredentialsFor(
    session.user.companyId,
  );

  let customer: Customer | undefined = undefined;

  if (searchParams && searchParams.customerId) {
    const customerResponse = await findCustomer(
      searchParams.customerId as string,
      session.user.companyId,
    );

    if (customerResponse.success) {
      customer = customerResponse.data;
    }
  }

  if (!billingCredentialsResponse.success) {
    return <div>Error cargando los filtros, comuniquese con soporte</div>;
  }

  return (
    <div className="mt-6">
      <FiltersWithHiddenButton billingCredentials={billingCredentialsResponse.data} customer={customer} />
    </div>
  );
}
