"use client";

import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useState} from "react"
import { Category, Product } from "@/product/types"
import { Checkbox } from "@/components/ui/checkbox"

import React from "react";
import {FormControl, FormLabel} from "@/components/ui/form";

interface SelectCategoriesProps {
  availableCategories: Category[],
  value: Category[],
  onChange: (categories: Category[]) => void,
}

const CategoriesSelector: React.FC<SelectCategoriesProps> = ({ availableCategories, value, onChange }) => {
  const createHandleCheckboxChange = (category: Category) => (checked: boolean) => {
    if (checked) {
      onChange([...value, category]);
    } else {
      onChange(value.filter((item) => item.id !== category.id));
    }
  }

  return (
    <div>
      <ScrollArea className="h-72 w-100 rounded-md border">
        <div className="p-4">
          {availableCategories.map((category) => (
            <div key={category.id}>
              <div className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={value.some((item) => item.id === category.id)}
                    onCheckedChange={createHandleCheckboxChange(category)}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal">
                  {category.name}
                </FormLabel>
              </div>
              <Separator className="my-2" />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default CategoriesSelector;