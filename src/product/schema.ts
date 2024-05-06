import * as z from "zod";
import { IMG_MAX_LIMIT } from "@/product/constants";
import { CategorySchema } from "@/category/schema";

export const PhotoSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  size: z.number(),
  key: z.string(),
  type: z.string(),
  url: z.string(),
  createdAt: z.date().optional(),
});

export const SingleProductSchema = z.object({
  id: z.string().optional(),
  companyId: z.string(),
  name: z.string().min(3, {
    message: "El nombre del producto debe tener al menos 3 caracteres",
  }),
  price: z.coerce.number().gt(0, "El producto debe tener un precio"),
  purchasePrice: z.coerce.number().optional(),
  description: z.string(),
  sku: z
    .string()
    .min(3, { message: "El sku debe tener al menos 3 caracteres" })
    .regex(/^[a-zA-Z0-9_]*$/, {
      message: "SKU solo puede contener carácteres alfanuméricos y guión abajo",
    })
    .optional(),
  stock: z.coerce.number().refine((data) => data !== null, {
    message: "Stock is required",
  }),
  photos: z
    .array(PhotoSchema)
    .max(IMG_MAX_LIMIT, { message: "You can only add up to 5 images" })
    .optional(),
  categories: z.array(CategorySchema),
  updatedAt: z.date().optional(),
  createdAt: z.date().optional(),
});

export const ProductItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  quantity: z.number(),
});

export const PackageProductSchema = z.object({
  id: z.string().optional(),
  companyId: z.string(),
  name: z.string().min(3, {
    message: "El nombre del producto debe tener al menos 3 caracteres",
  }),
  price: z.coerce.number().gt(0, "El producto debe tener un precio"),
  description: z.string(),
  sku: z
    .string()
    .min(3, { message: "El sku debe tener al menos 3 caracteres" })
    .regex(/^[a-zA-Z0-9_]*$/, {
      message: "SKU solo puede contener carácteres alfanuméricos y guión abajo",
    })
    .optional(),
  photos: z
    .array(PhotoSchema)
    .max(IMG_MAX_LIMIT, { message: "You can only add up to 5 images" })
    .optional(),
  categories: z.array(CategorySchema),
  productItems: z
    .array(ProductItemSchema)
    .min(1, { message: "Debe agregar al menos un producto" }),
  updatedAt: z.date().optional(),
  createdAt: z.date().optional(),
});
