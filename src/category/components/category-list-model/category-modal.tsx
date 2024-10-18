"use client"

import { Dialog, DialogContent, DialogTrigger } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useCategoryStore } from "@/category/components/category-store-provider";
import CategoryContent from "./category-content";
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import NewCategoryDialog from "@/product/components/category/new-category-dialog";
import {Category} from "@/category/types";
import React from "react";
import { List } from 'lucide-react';

interface NewSectionDialogProps {
  addCategory: (category: Category) => void;
}

export default function CategoriesModal({
  addCategory,
}: NewSectionDialogProps) {
  const { categories, updateCategory } = useCategoryStore(store => ({
    categories: store.categories,
    updateCategory: store.updateCategory,
  }))

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="mb-2"
        >
          <List />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-96 sm:h-[429.5] w-full flex flex-col items-center p-0">
        <table className="min-w-96 rounded-2xl">
          <thead>
          <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
            <th className="py-3 px-6 text-left">Categoria</th>
          </tr>
          </thead>
          <tbody className="text-sm">
          <ScrollArea className="h-96">
            {categories.length ? (
              categories.map(category => (
                <CategoryContent key={category.id} category={category}
                                 onCategoryUpdated={(category) => updateCategory(category)}/>
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
        <NewCategoryDialog addCategory={addCategory}/>
      </DialogContent>
    </Dialog>
  )
}

