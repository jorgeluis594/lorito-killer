import { Product, Photo } from "./types";
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

export const ProductSchema = z.object({
  id: z.string().optional(),
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
    }),
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

// Ensure that the schema and the type are identical
z.util.assertEqual<Product, z.infer<typeof ProductSchema>>(true);
z.util.assertEqual<Photo, z.infer<typeof PhotoSchema>>(true);
