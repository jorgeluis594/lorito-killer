import {getSession} from "@/lib/auth";
import {NextResponse} from "next/server";
import {
  BusinessCustomerType,
  CustomerSortParams,
  NaturalCustomerType,
  sortOptionsCustomer, TypeBusinessCustomerType,
  TypeNaturalCustomerType,
  SortKeyCustomer,
} from "@/customer/types";
import {getMany} from "@/customer/db_repository";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const { user } = await getSession();
  const param = searchParams.get("param");
  const sortKey = searchParams.get("sortBy") as SortKeyCustomer | null;
  const limit = searchParams.get("limit");
  const customerType = searchParams.get("customerType") || undefined;

  let sortBy: CustomerSortParams =
    sortKey && sortOptionsCustomer[sortKey]
      ? sortOptionsCustomer[sortKey]!.value: { createdAt: "desc" };

  const response = await getMany({
    q: param,
    companyId: user.companyId,
    sortBy: sortBy,
    limit: limit ? parseInt(limit) : undefined,
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