import { Separator } from "@/shared/components/ui/separator";
import CompanyForm from "@/company/components/company-form";
import { getSession } from "@/lib/auth";
import { getCompany } from "@/company/db_repository";
import { notFound } from "next/navigation";
import NewUserModal from "@/company/components/new-user-modal";
import { Label } from "@/shared/components/ui/label";

export const revalidate = 0;

export default async function CompanySettingsPage() {
  const session = await getSession();
  const companyResponse = await getCompany(session.user.companyId);

  if (!companyResponse.success) {
    notFound();
    return;
  }

  return (
    <div>
      <h3 className="text-lg font-medium">Empresa</h3>
      <p className="text-sm text-muted-foreground">
        Edita los datos de tu empresa y crea nuevos usuarios
      </p>
      <Separator className="my-4" />
      <CompanyForm company={companyResponse.data} />
      <Separator className="mt-6 mb-6" />
      <Label className="block mb-4">Agrega un usuario a tu empresa</Label>
      <NewUserModal />
    </div>
  );
}
