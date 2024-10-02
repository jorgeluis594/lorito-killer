import type {
  InferProductType,
  Photo,
  Product,
  ProductType,
  SortKey,
} from "./types";
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
    body: JSON.stringify({ ...product, sku: product.sku || "" }),
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

type photoApi = Omit<Photo, "createdAt"> & { createdAt: string };

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

  const storePhotoResponse: response<photoApi[]> = await res.json();
  if (!storePhotoResponse.success) {
    return storePhotoResponse;
  }

  const storedPhotos: Photo[] = storePhotoResponse.data.map((photo) => ({
    ...photo,
    createdAt: new Date(photo.createdAt),
  }));

  return { success: true, data: storedPhotos };
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

export type GetManyParams<T extends ProductType | undefined = undefined> = {
  q?: string | null;
  categoryId?: string | null;
  limit?: number;
  sortBy?: SortKey;
  productType?: T;
};

export const getMany = async <T extends ProductType | undefined>(
  params: GetManyParams<T> = {},
): Promise<response<InferProductType<T>[]>> => {
  const searchParams: any = {};
  if (params.q) searchParams["param"] = params.q;
  if (params.categoryId) searchParams["categoryId"] = params.categoryId;
  if (params.sortBy) searchParams["sortBy"] = params.sortBy;
  if (params.limit) searchParams["limit"] = params.limit;
  if (params.productType) searchParams["productType"] = params.productType;
  const queryString = new URLSearchParams(searchParams).toString();

  const res = await fetch(`/api/products?${queryString}`, {
    method: "GET",
  });

  if (!res.ok) {
    return { success: false, message: "Error fetching products" };
  }
  const data = (await res.json()) as response<Product[]>;
  if (!data.success) {
    return data;
  }

  return {
    ...data,
    data: data.data.map(
      (product): InferProductType<T> =>
        ({
          ...product,
          createdAt: new Date(product.createdAt!),
          updatedAt: new Date(product.updatedAt!),
          photos: (product.photos || []).map((photo) => ({
            ...photo,
            createdAt: new Date(photo.createdAt!),
          })),
        }) as InferProductType<T>,
    ),
  };
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

// acepta id o sku
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
      ...productResponse.data,
      price: parseFloat(productResponse.data.price),
      createdAt: new Date(productResponse.data.createdAt),
      updatedAt: new Date(productResponse.data.updatedAt),
    },
  };
};
