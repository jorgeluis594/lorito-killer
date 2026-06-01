import { NextResponse } from "next/server";

import { getCompany } from "@/company/db_repository";
import { findBillingDocumentFor } from "@/document/db_repository";
import { getSession } from "@/lib/auth";
import { errorResponse } from "@/lib/utils";
import { findReceiptPrintOrder } from "@/order/db_repository";
import { buildReceiptPrintData } from "@/printing/receipt-builder";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const session = await getSession();

  if (!session.user) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated user" },
      { status: 401, headers: noStoreHeaders },
    );
  }

  const [companyResponse, orderResponse, documentResponse] = await Promise.all([
    getCompany(session.user.companyId),
    findReceiptPrintOrder(params.id, session.user.companyId),
    findBillingDocumentFor(params.id),
  ]);

  if (!companyResponse.success) {
    return NextResponse.json(errorResponse("No se encontro empresa"), {
      status: 404,
      headers: noStoreHeaders,
    });
  }

  if (!orderResponse.success || !documentResponse.success) {
    return NextResponse.json(
      errorResponse("No se encontro pedido o documento"),
      { status: 404, headers: noStoreHeaders },
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: buildReceiptPrintData({
        order: orderResponse.data,
        company: companyResponse.data,
        document: documentResponse.data,
      }),
    },
    { headers: noStoreHeaders },
  );
}
