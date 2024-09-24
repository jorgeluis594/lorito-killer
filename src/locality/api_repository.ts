import { response } from "@/lib/types";
import {GetManyParamsLocality, InferLocalityType, LocalityType} from "@/locality/types";

export const getMany = async <T extends LocalityType | undefined>(
  params: GetManyParamsLocality<T> = {},
): Promise<response<InferLocalityType<T>[]>> => {
  const searchParams: any = {};
  if (params.q) searchParams["param"] = params.q;
  if (params.localityLevel) searchParams["level"] = params.localityLevel;
  const queryString = new URLSearchParams(searchParams).toString();

  const res = await fetch(`/api/locality?${queryString}`, {
    method: "GET",
  });

  if (!res.ok) {
    return { success: false, message: "Error fetching localities" };
  }
  return (await res.json()) as response<InferLocalityType<T>[]>;
};
