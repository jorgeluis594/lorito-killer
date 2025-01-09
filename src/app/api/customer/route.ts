import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  BusinessCustomerType,
  NaturalCustomerType,
  TypeBusinessCustomerType,
  TypeNaturalCustomerType,
} from "@/customer/types";
import { getMany } from "@/customer/db_repository";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const { user } = await getSession();
  const param = searchParams.get("param");
  const customerType = searchParams.get("customerType") || undefined;

  if (!user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const response = await getMany({
    q: param,
    companyId: user.companyId,
    customerType: ensureCustomerType(customerType),
  });

  return NextResponse.json(response, { status: response.success ? 200 : 404 });
}

const ensureCustomerType = (
  type?: string,
): TypeNaturalCustomerType | TypeBusinessCustomerType | undefined => {
  return type === NaturalCustomerType || type === BusinessCustomerType
    ? type
    : undefined;
};
