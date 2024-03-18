import { Product, Photo } from "./types";
import * as z from "zod";
import {IMG_MAX_LIMIT} from "@/product/constants";

export const PhotoSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  size: z.number(),
  key: z.string(),
  url: z.string(),
  createdAt: z.date().optional(),
});

export const CategorySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  updatedAt: z.date().optional(),
  createdAt: z.date().optional(),
});

export const ProductSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(3, { message: "El nombre del producto debe tener al menos 3 caracteres" }),
  price: z.coerce.number(),
  sku: z.string().min(3, { message: "El sku debe tener al menos 3 caracteres" }),
  stock: z.coerce.number(),
  photos: z
    .array(PhotoSchema)
    .max(IMG_MAX_LIMIT, { message: "You can only add up to 5 images" })
    .min(1, { message: "At least one image must be added." })
    .optional(),
  categories: z.array(CategorySchema),
  updatedAt: z.date().optional(),
  createdAt: z.date().optional(),
});

// Ensure that the schema and the type are identical
z.util.assertEqual<Product, z.infer<typeof ProductSchema>>(true);
z.util.assertEqual<Photo, z.infer<typeof PhotoSchema>>(true);

