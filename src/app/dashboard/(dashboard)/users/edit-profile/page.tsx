import BreadCrumb from "@/components/breadcrumb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

const breadcrumbItems = [
  { title: "Usuario", link: "/" },
  { title: "Editar perfil", link: "/users/edit-profile" },
];

export default function EditProfilePage() {
  return (
    <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
      <BreadCrumb items={breadcrumbItems} />
      <div className="flex items-start justify-between">
        <Heading title="Editar perfil" />
      </div>
      <Separator />
      <p>Hello world</p>
    </div>
  );
}
