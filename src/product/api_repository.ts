import { Photo, Product } from "./types";
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

export const getMany = async (): Promise<response<Product[]>> => {
  const res = await fetch("/api/products");
  return await res.json();
};
