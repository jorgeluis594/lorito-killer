import Image from "next/image";
import {getSession} from "@/lib/auth";
import {getCompany } from "@/company/db_repository";
import {notFound} from "next/navigation";

export async function LogoImage() {
  const session = await getSession();
  const companyResponse = await getCompany(session.user.companyId);

  if (!companyResponse.success) {
    notFound();
    return;
  }

  const logoUrl = companyResponse.data.logo?.url || "";

  if (!logoUrl) {
    return null;
  }

  return (
    <>
      <Image fill className="object-left object-contain w-full h-full" alt="Image" src={logoUrl}/>
    </>
  );
}
