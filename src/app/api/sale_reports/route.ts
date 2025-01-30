import { getMany } from "@/document/db_repository";
import { SearchParams } from "@/document/types";
import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { createWorkbookBuffer } from "@/document/renders/list_xlsx";
import { User } from "@/user/types";
import { getSession } from "@/lib/auth";
import {createWorkbookBufferSire} from "@/document/renders/sire_list_xlsx";
import {getCompany} from "@/company/db_repository";

type ParamsProps = Record<string, string | string[] | undefined>;

const getSearchParams = async ({
  searchParams = {},
  user,
}: {
  searchParams: ParamsProps;
  user: User;
}): Promise<SearchParams> => {
  const params: SearchParams = {
    companyId: user.companyId,
  };

  if (searchParams.series && searchParams.number) {
    params.correlative = {
      number: searchParams.number as string,
      series: searchParams.series as string,
    };
  }

  if (searchParams.invoice && searchParams.invoice == "true") {
    params.invoice = true;
  }

  if (searchParams.receipt && searchParams.receipt == "true") {
    params.receipt = true;
  }

  if (searchParams.ticket && searchParams.ticket == "true") {
    params.ticket = true;
  }

  if (searchParams.start) {
    params.startDate = new Date(searchParams.start as string);
  }

  if (searchParams.end) {
    params.endDate = new Date(searchParams.end as string);
  }

  if (searchParams.customerId) {
    params.customerId = searchParams.customerId as string;
  }

  return params;
};
// https://nextjs.org/docs/pages/building-your-application/routing/api-routes
// https://0918-38-253-158-33.ngrok-free.app/api/sale_reports?ticket=true&start=2024-12-12T05%3A00%3A00.000Z&end=2025-01-08T04%3A59%3A59.999Z
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated user" },
      { status: 401 },
    );
  }
  const documentQuery = await getSearchParams({
    searchParams: Object.fromEntries(searchParams),
    user: session.user,
  });

  const companyResponse = await getCompany(session.user.companyId)

  if(!companyResponse.success) {
    log.error("get_company_failed", { response: companyResponse });

    return NextResponse.json(
      { error: "Error al obtener datos de la compañia" },
      { status: 500 },
    );
  }

  console.log(companyResponse.data)

  const documentsResponse = await getMany(documentQuery);

  if (!documentsResponse.success) {
    log.error("get_documents_failed", { response: documentsResponse });

    return NextResponse.json(
      { error: "Error al obtener los documentos" },
      { status: 500 },
    );
  }

  const buffer = await createWorkbookBufferSire(documentsResponse.data, companyResponse.data);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte_ventas.xlsx"`,
    },
  });
}
