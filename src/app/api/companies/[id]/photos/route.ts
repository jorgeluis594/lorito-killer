import { Logo } from "@/company/types"; 
import { find as findCompany, storeLogos } from "@/company/db_repository";
import {NextResponse} from "next/server";

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const logosData = await req.json() as Logo[]
  const { success: isCompanyFound} = await findCompany(params.id)
  if (!isCompanyFound) {
    return NextResponse.json({ success: false, message: "Company not found" }, { status: 404 })
  }

  const response = await storeLogos(params.id, logosData)

  return NextResponse.json(response, { status: response.success ? 200 : 400 })
}