"use client";

import { Separator } from "@/shared/components/ui/separator";
import { Category } from "@/category/types";
import { Checkbox } from "@/shared/components/ui/checkbox";
import React, { useEffect } from "react";
import { FormControl, FormLabel } from "@/shared/components/ui/form";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { Skeleton } from "@/shared/components/ui/skeleton";
import MultipleSelector, {
  Option,
} from "@/shared/components/ui/multiple-selector";

interface SelectCategoriesProps {
  value: Category[];
  onChange?: (categories: Category[]) => void;
  onCategoryAdded?: (category: Category) => void;
  onCategoryRemoved?: (category: Category) => void;
}

const CategoriesSkeleton = () => {
  return (
    <>
      {Array(7)
        .fill(0)
        .map((_, index) => (
          <Skeleton key={index} className="w-full h-[1.4rem] my-3" />
        ))}
    </>
  );
};

interface CategoryListProps {
  categories: Category[];
  value: Category[];
  onChange: (categories: Category[]) => void;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  value,
  onChange,
}) => {
  const createHandleCheckboxChange =
    (category: Category) => (checked: boolean) => {
      if (checked) {
        onChange([...value, category]);
      } else {
        onChange(value.filter((item) => item.id !== category.id));
      }
    };
  return (
    <>
      {categories.map((category) => (
        <div key={category.id}>
          <div className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                id={category.id}
                checked={value.some((item) => item.id === category.id)}
                onCheckedChange={createHandleCheckboxChange(category)}
              />
            </FormControl>
            <FormLabel className="text-sm font-normal" htmlFor={category.id}>
              {category.name}
            </FormLabel>
          </div>
          <Separator className="my-2" />
        </div>
      ))}
    </>
  );
};

const categoryToOption = (category: Category): Option => ({
  label: category.name,
  value: category.id!,
});

const CategoriesSelector: React.FC<SelectCategoriesProps> = ({
  value,
  onChange,
  onCategoryAdded,
  onCategoryRemoved,
}) => {
  const { categories, isLoading } = useCategoryStore((store) => store);

  const handelSelectedCategories = (options: Option[]) => {
    if (onCategoryAdded) {
      options
        .filter((option) => !value.some((c) => c.id === option.value))
        .forEach((option) =>
          onCategoryAdded(categories.find((c) => c.id === option.value)!),
        );
    }

    if (onCategoryRemoved) {
      value
        .filter((c) => !options.some((option) => option.value === c.id))
        .forEach((c) => onCategoryRemoved(c));
    }

    if (onChange) {
      const selectedCategories = options.map(
        (option) => categories.find((c) => c.id === option.value)!,
      );
      onChange(selectedCategories);
    }
  };

  return (
    <div className="w-full">
      <MultipleSelector
        options={categories.map(categoryToOption)}
        value={value.map(categoryToOption)}
        onChange={handelSelectedCategories}
        placeholder="Seleccione"
        emptyIndicator={
          <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
            No hay mas resultados.
          </p>
        }
      />
    </div>
  );
};

export default CategoriesSelector;
