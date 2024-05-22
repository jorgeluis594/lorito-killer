"use client"

import ListCategories from "./category";
import { Dialog, DialogContent, DialogTrigger } from "@/shared/components/ui/dialog";
import EditCategoryModal from "./edit-category-modal";
import { Button } from "@/shared/components/ui/button";
import { useCategoryStore } from "@/category/components/category-store-provider"
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Plus } from "lucide-react";

export default function CategoriesModal() {
  const {categories, updateCategory} = useCategoryStore(store => ({categories: store.categories, updateCategory: store.updateCategory}))


  return (
    <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="text-xs md:text-sm"><Plus className="mr-2 h-4 w-4" />Mostrar Categorías</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px] sm:h-[400px] w-full flex flex-col items-center p-0">
          { categories.map(category => (
            <div key={category.id} className="border-t broder-b  border-scale-50">
              {category.name}
              <EditCategoryModal category={category} onCategoryUpdated={(category => updateCategory(category))} />
            </div>
          ) ) }          
        </DialogContent>
      </Dialog>
  )
}
  
