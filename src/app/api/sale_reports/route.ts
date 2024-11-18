import { getSession } from "@/lib/auth";
import { getMany } from "@/document/db_repository";
import { SearchParams } from "@/document/types";
import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { createWorkbookBuffer } from "@/document/renders/list_xlsx";

type ParamsProps = Record<string, string | string[] | undefined>;

const getSearchParams = async ({
  searchParams = {},
}: {
  searchParams: ParamsProps;
}): Promise<SearchParams> => {
  const session = await getSession();

  const params: SearchParams = {
    companyId: session.user.companyId,
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

export async function GET(_req: Request, { params }: { params: ParamsProps }) {
  const documentQuery = await getSearchParams({ searchParams: params });

  const documentsResponse = await getMany(documentQuery);

  if (!documentsResponse.success) {
    log.error("get_documents_failed", { response: documentsResponse });

    return NextResponse.json(
      { error: "Error al obtener los documentos" },
      { status: 500 },
    );
  }

  const buffer = await createWorkbookBuffer(documentsResponse.data);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte_ventas.xlsx"`,
    },
  });
}
