import { Category } from "@/category/types";
import { response } from "@/lib/types";

export const getMany = async (): Promise<response<Category[]>> => {
  const res = await fetch("/api/categories");
  if (!res.ok) {
    return { success: false, message: "Failed to get categories" };
  }

  return await res.json();
};

export const update = async (category: Category): Promise<response<Category>> => {
  if (!category.id) return { success: false, message: "Category id is required" };

  const res = await fetch(`/api/categories/${category.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return await res.json();
};

export const deleteCategory = async (
  category: Category,
): Promise<response<Category>> => {
  if (!category.id) return { success: false, message: "Category id is required" };

  const res = await fetch(`/api/categories/${category.id}`, {
    method: "DELETE",
  });

  return await res.json();
};