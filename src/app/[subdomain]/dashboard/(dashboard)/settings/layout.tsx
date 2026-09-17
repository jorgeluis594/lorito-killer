import BreadCrumb from "@/shared/breadcrumb";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";

import NavItems from "@/shared/settings-nav-items";
import { getAuthorizedUser } from "@/authorization/server";

const breadcrumbItems = [{ title: "Configuraciones", link: "/" }];

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthorizedUser();

  return (
    <div className="flex-1 p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />
      <div className="flex items-start justify-between">
        <Heading
          title="Configuraciones"
          description="Edita tu perfil y configura tu empresa."
        />
      </div>
      <Separator className="mt-4" />
      <div className="flex flex-col space-y-16 lg:flex-row lg:space-x-12 lg:space-y-0 mt-8">
        <aside className="-mx-4 min-w-0 lg:w-1/5">
          <NavItems isAdmin={user.success && user.data.role === "ADMIN"} />
        </aside>
        <div className="mt-6 min-w-0 flex-1 lg:max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
