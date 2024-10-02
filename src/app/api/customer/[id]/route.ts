import {getSession} from "@/lib/auth";
import {find as findProduct, findBy} from "@/product/db_repository";
import {NextResponse} from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSession();
  let response = await findProduct(params.id, session.user.companyId);
  if (!response.success) {
    response = await findBy({
      sku: params.id,
      companyId: session.user.companyId,
    });
  }

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}