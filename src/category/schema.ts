import * as z from "zod";
import { Category } from "./types";

export const CategorySchema = z.object({
  id: z.string().optional(),
  companyId: z.string(),
  name: z.string().min(4, {
    message: "El nombre de la categoría debe tener al menos 4 caracteres",
  }),
  updatedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date().optional(),
});

// Ensure that the schema and the type are identical
z.util.assertEqual<Category, z.infer<typeof CategorySchema>>(true);
