"use client";

import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useState} from "react"
import { Category, Product } from "@/product/types"
import { labelVariants } from "@/components/ui/label"
import React from "react";

interface SelectCategoriesProps {
  availableCategories: Category[],
  product?: Product
}

const CategoriesSelector: React.FC<SelectCategoriesProps> = ({ availableCategories, product }) => {
  const [categories, setCategories] = useState<Category[]>(product?.categories || []);

  return (
    <div>
      <p className={`${labelVariants()} my-2`}>Categorías</p>
      <ScrollArea className="h-72 w-100 rounded-md border">
        <div className="p-4">
          {availableCategories.map((category) => (
            <>
              <div key={category.id} className="text-sm">
                {category.name}
              </div>
              <Separator className="my-2" />
            </>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default CategoriesSelector;