import { removeLogo, find as findCompany } from "@/company/db_repository";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; logoId: string } },
) {
  const findCompanyResponse = await findCompany(params.id);
  if (!findCompanyResponse.success) {
    return NextResponse.json(
      { success: false, message: "Company not found" },
      { status: 404 },
    );
  }

  const response = await removeLogo(
    findCompanyResponse.data.id as string,
    params.logoId,
  );

  return NextResponse.json(response, { status: response.success ? 200 : 400 });
}
