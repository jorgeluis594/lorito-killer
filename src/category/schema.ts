import * as z from "zod";
import { Category } from "./types";


export const CategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(4, { message: "El nombre de la categoría debe tener al menos 4 caracteres" }),
  updatedAt: z.date().optional(),
  createdAt: z.date().optional(),
});

// Ensure that the schema and the type are identical
z.util.assertEqual<Category, z.infer<typeof CategorySchema>>(true);