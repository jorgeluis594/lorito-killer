import Image from "next/image";
import {getSession} from "@/lib/auth";
import {getCompany as findCompany} from "@/company/db_repository";
import {notFound} from "next/navigation";

export async function LogoImage() {
  const session = await getSession();
  const companyResponse = await findCompany(session.user.companyId);

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
      <Image fill className="object-cover" alt="Image" src={logoUrl}/>
    </>
  );
}
