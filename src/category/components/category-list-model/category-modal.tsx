"use client"

import { Dialog, DialogContent, DialogTrigger } from "@/shared/components/ui/dialog";
import EditCategoryModal from "./edit-category-modal";
import { Button } from "@/shared/components/ui/button";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { MenuSquare, Plus } from "lucide-react";
import DeleteCategoryModal from "./delete-category-modal";
import CategoryContent from "./category-content";
import { ScrollArea } from '@/shared/components/ui/scroll-area';

export default function CategoriesModal() {
  const { categories, updateCategory } = useCategoryStore(store => ({
    categories: store.categories,
    updateCategory: store.updateCategory,
  }))

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-xs md:text-sm"><MenuSquare className="mr-2 h-4 w-4" />Mostrar Categorías</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-96 sm:h-[429.5] w-full flex flex-col items-center p-0">
          <table className="min-w-96 shadow-md rounded-2xl">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Categoria</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <ScrollArea className="h-96">
                {categories.length ? (
                  categories.map(category => (
                    <CategoryContent key={category.id} category={category} onCategoryUpdated={(category) => updateCategory(category)} />
                  ))
                ) : (
                  <tr className=" text-black">
                    <td className="h-96">
                      <div className="flex items-center justify-center h-full">No hay categorias</div>
                    </td>
                  </tr>
                )}
              </ScrollArea>
            </tbody>
          </table>
      </DialogContent>
    </Dialog>
  )
}

