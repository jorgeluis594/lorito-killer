import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { find } from "@/order/db_repository";
import { errorResponse } from "@/lib/utils";
import { getCompany } from "@/company/db_repository";
import { findBillingDocumentFor } from "@/document/db_repository";
import QRCode from "qrcode";
import { isBillableDocument } from "@/document/utils";
import generateInvoicePdfStream from "@/document/generate-invoice-pdf-stream";

const generateQRBase64 = (qrValue: string): Promise<string> =>
  new Promise((resolve, reject) => {
    QRCode.toDataURL(qrValue, function (err, code) {
      if (err) {
        reject(reject);
        return;
      }
      resolve(code);
    });
  });

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated user" },
      { status: 401 },
    );
  }
  const [companyResponse, orderResponse, documentResponse] = await Promise.all([
    getCompany(session.user.companyId),
    find(params.id, session.user.companyId),
    findBillingDocumentFor(params.id),
  ]);

  if (!companyResponse.success) {
    return NextResponse.json(errorResponse("No se encontro empresa"), {
      status: 505,
    });
  }

  if (!orderResponse.success || !documentResponse.success) {
    return NextResponse.json(
      errorResponse("No se encontro pedido o documento"),
      {
        status: 404,
      },
    );
  }

  const document = documentResponse.data;
  const qr = isBillableDocument(document)
    ? await generateQRBase64(document.qr)
    : undefined;

  const stream = await generateInvoicePdfStream(
    orderResponse.data,
    companyResponse.data,
    document,
    qr,
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const buffer = Buffer.concat(chunks);

  return new NextResponse(buffer, {
    headers: { "Content-Type": "application/pdf" },
  });
}
