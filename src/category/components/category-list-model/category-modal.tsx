"use client"

import { Dialog, DialogContent, DialogTrigger } from "@/shared/components/ui/dialog";
import EditCategoryModal from "./edit-category-modal";
import { Button } from "@/shared/components/ui/button";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { Plus } from "lucide-react";
import DeleteCategoryModal from "./delete-category-modal";
import CategoryContent from "./category-content";

export default function CategoriesModal() {
  const { categories, updateCategory} = useCategoryStore(store => ({
    categories: store.categories,
    updateCategory: store.updateCategory,
  }))

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-xs md:text-sm"><Plus className="mr-2 h-4 w-4" />Mostrar Categorías</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] sm:h-[400px] w-full flex flex-col items-center p-0">
        <table className="min-w-full bg-white border rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Categoria</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {categories.map(category => (
              <CategoryContent category={category} onCategoryUpdated={(category) => updateCategory(category)} />
            ))}
          </tbody>
        </table>

      </DialogContent>
    </Dialog>
  )
}

