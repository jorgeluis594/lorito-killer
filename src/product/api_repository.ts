import type { Photo, Product, SortKey } from "./types";
import { response } from "@/lib/types";

export const create = async (product: Product): Promise<response<Product>> => {
  const res = await fetch("/api/products", {
    method: "POST",
    body: JSON.stringify(product),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return await res.json();
};

export const update = async (product: Product): Promise<response<Product>> => {
  if (!product.id) return { success: false, message: "Product id is required" };

  const res = await fetch(`/api/products/${product.id}`, {
    method: "PUT",
    body: JSON.stringify(product),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return await res.json();
};

export const deleteProduct = async (
  product: Product,
): Promise<response<Product>> => {
  if (!product.id) return { success: false, message: "Product id is required" };

  const res = await fetch(`/api/products/${product.id}`, {
    method: "DELETE",
  });

  return await res.json();
};

export const storePhotos = async (
  productId: string,
  photos: Photo[],
): Promise<response<Photo[]>> => {
  const res = await fetch(`/api/products/${productId}/photos`, {
    method: "POST",
    body: JSON.stringify(photos),
    headers: {
      "Content-Type": "application/json",
    },
  });

  return await res.json();
};

export const removePhoto = async (
  productId: string,
  photoId: string,
): Promise<response<Photo>> => {
  const res = await fetch(`/api/products/${productId}/photos/${photoId}`, {
    method: "DELETE",
  });

  return await res.json();
};

export type GetManyParams = {
  q?: string | null;
  categoryId?: string | null;
  sortBy?: SortKey;
};

export const getMany = async (
  params: GetManyParams = {},
): Promise<response<Product[]>> => {
  const searchParams: any = {};
  if (params.q) searchParams["param"] = params.q;
  if (params.categoryId) searchParams["categoryId"] = params.categoryId;
  if (params.sortBy) searchParams["sortBy"] = params.sortBy;
  const queryString = new URLSearchParams(searchParams).toString();

  const res = await fetch(`/api/products?${queryString}`, {
    method: "GET",
  });

  if (!res.ok) {
    return { success: false, message: "Error fetching products" };
  }

  return await res.json();
};

export const search = async (
  q: string,
  categoryId?: string | null,
): Promise<response<Product[]>> => {
  const searchParams: any = { param: q };
  if (categoryId) searchParams["categoryId"] = categoryId;
  const params = new URLSearchParams(searchParams).toString();

  const res = await fetch(`/api/products/search?${params}`, {
    method: "GET",
  });

  if (!res.ok) {
    return { success: false, message: "Error fetching products" };
  }

  return await res.json();
};

export const findProduct = async (id: string): Promise<response<Product>> => {
  const res = await fetch(`/api/products/${id}`, {
    method: "GET",
  });

  if (res.status === 404) {
    return { success: false, message: "Producto no encontrado" };
  }

  const productResponse = await res.json();

  return {
    ...productResponse,
    data: {
      ...productResponse,
      createdAt: new Date(productResponse.createdAt),
      updatedAt: new Date(productResponse.updatedAt),
    },
  };
};
