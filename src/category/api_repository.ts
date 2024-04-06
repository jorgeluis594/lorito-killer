import { Category } from "@/category/types";
import { response } from "@/lib/types";

export const getMany = async (): Promise<response<Category[]>> => {
  const res = await fetch("/api/categories");
  if (!res.ok) {
    return { success: false, message: "Failed to get categories" };
  }

  return await res.json();
};
