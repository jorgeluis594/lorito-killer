import { getBillingCredentialsFor } from "@/document/db_repository";
import { getSession } from "@/lib/auth";
import { Label } from "@/shared/components/ui/label";
import DocumentSelector from "@/sale_report/components/filter/document-selector";
import { Separator } from "@/shared/components/ui/separator";
import CustomerSelector from "@/sale_report/components/filter/customer-selector";
import DateFilter from "@/sale_report/components/filter/date-filter";

type FiltersProps = {};

export default async function Filters() {
  const session = await getSession();
  const billingCredentials = await getBillingCredentialsFor(
    session.user.companyId,
  );

  if (!billingCredentials.success) {
    return <div>Error cargando los filtros, comuniquese con soporte</div>;
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold tracking-tight mb-4">Filtros</h2>

      <DocumentSelector
        documentTypes={{
          ticket: true,
          invoice: !!billingCredentials.data.invoiceSerialNumber, // Fix, check if company has at least one invoice serial number to allow filter by invoice
          receipt: !!billingCredentials.data.receiptSerialNumber, // Fix, check if company has at least one receipt serial number to allow filter by receipt
        }}
      />
      <Separator className="my-4" />
      <CustomerSelector />
      <Separator className="my-4" />
      <DateFilter />
    </div>
  );
}
