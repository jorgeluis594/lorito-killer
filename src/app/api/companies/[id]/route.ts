import {
  find as findCompany,
  updateCompany,
} from "@/company/db_repository";
import { SingleProduct } from "@/product/types";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { deleteCompnay } from "@/company/db_repository";
import { Company } from "@/company/types";
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  const companyData: Company = await req.json();

  const findCompanyResponse = await findCompany(params.id,);
  if (!findCompanyResponse.success) {
    return NextResponse.json(
      { success: false, message: "Company not found" },
      { status: 404 },
    );
  }

  const updateResponse = await updateCompany(companyData);
  revalidatePath("/companies/" + params.id);
  return NextResponse.json(updateResponse, {
    status: updateResponse.success ? 200 : 400,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const findCompanyResponse = await findCompany(
    params.id,
  );
  if (!findCompanyResponse.success) {
    return NextResponse.json(
      { success: false, message: "Company not found" },
      { status: 404 },
    );
  }

  revalidatePath("/api/companies");

  const response = await deleteCompnay(findCompanyResponse.data);
  return NextResponse.json(response, { status: response.success ? 200 : 400 });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  let response = await findCompany(params.id);

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}
