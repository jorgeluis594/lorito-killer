import {response} from "@/lib/types";
import {Customer, CustomerType, GetManyParamsCustomer, InferCustomerType} from "@/customer/types";

export const getMany = async <T extends CustomerType | undefined>(
  params: GetManyParamsCustomer<T> = {},
): Promise<response<InferCustomerType<T>[]>> => {
  const searchParams: any = {};
  if (params.q) searchParams["param"] = params.q;
  if (params.sortBy) searchParams["sortBy"] = params.sortBy;
  if (params.limit) searchParams["limit"] = params.limit;
  if (params.customerType) searchParams["customerType"] = params.customerType;
  const queryString = new URLSearchParams(searchParams).toString();

  const res = await fetch(`/api/customer?${queryString}`, {
    method: "GET",
  });

  if (!res.ok) {
    return { success: false, message: "Error fetching customers" };
  }
  const data = (await res.json()) as response<Customer[]>;
  if (!data.success) {
    return data;
  }

  return {
    ...data,
    data: data.data.map(
      (customer): InferCustomerType<T> =>
        (customer) as InferCustomerType<T>,
    ),
  };
};