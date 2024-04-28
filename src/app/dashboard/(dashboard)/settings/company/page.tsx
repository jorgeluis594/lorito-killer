import { Separator } from "@/components/ui/separator";
import CompanyForm from "@/company/components/company-form";

export default async function CompanySettingsPage() {
  return (
    <div>
      <h3 className="text-lg font-medium">Empresa</h3>
      <p className="text-sm text-muted-foreground">
        Edita los datos de tu empresa y crea nuevos usuarios
      </p>
      <Separator className="my-4" />
      <CompanyForm />
      <Separator className="mt-6 mb-4" />
    </div>
  );
}
