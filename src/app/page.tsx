import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCompany } from "@/company/db_repository";

export default async function Page({ ...params }: any) {
  const session = await getSession();

  if (session) {
    const companyResponse = await getCompany(session.user.companyId);
    if (!companyResponse.success) {
      return;
    }

    return redirect(
      `${process.env.NODE_ENV === "development" ? "http" : "https"}://${companyResponse.data.subdomain}.${process.env.DOMAIN}/dashboard`,
    );
  } else {
    return (
      <h1>
        Ingresa tu subdominio en la barra de dirección. Ejemplo:
        https://market-chavez.kogoz.pe
      </h1>
    );
  }
}
