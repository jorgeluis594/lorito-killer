import { getSession } from "@/lib/auth";
import { find as findProduct, findBy } from "@/product/db_repository";
import { NextResponse } from "next/server";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getSession();
  if (!session.user) {
    return NextResponse.json(
      { success: false, message: "Unauthenticated user" },
      { status: 401 },
    );
  }
  let response = await findProduct(params.id, session.user.companyId);
  if (!response.success) {
    response = await findBy({
      sku: params.id,
      companyId: session.user.companyId,
    });
  }

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
