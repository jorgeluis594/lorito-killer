import { getBillingCredentialsFor } from "@/document/db_repository";
import { getSession } from "@/lib/auth";
import DocumentSelector from "@/sale_report/components/filter/document-selector";
import { Separator } from "@/shared/components/ui/separator";
import CustomerSelector from "@/sale_report/components/filter/customer-selector";
import DateFilter from "@/sale_report/components/filter/date-filter";
import { findCustomer } from "@/customer/db_repository";
import { Customer } from "@/customer/types";
import SignOutRedirection from "@/shared/components/sign-out-redirection";

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
      <h2 className="text-xl font-bold tracking-tight mb-4">Filtros</h2>

      <DateFilter />
      <Separator className="my-5" />
      <DocumentSelector
        documentTypes={{
          ticket: true,
          invoice: !!billingCredentialsResponse.data.invoiceSerialNumber, // Fix, check if company has at least one invoice serial number to allow filter by invoice
          receipt: !!billingCredentialsResponse.data.receiptSerialNumber, // Fix, check if company has at least one receipt serial number to allow filter by receipt
        }}
      />
      <Separator className="my-5" />
      <CustomerSelector customer={customer} />
    </div>
  );
}
