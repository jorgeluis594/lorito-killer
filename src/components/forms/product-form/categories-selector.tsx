"use client";

import { Separator } from "@/components/ui/separator";
import { Category } from "@/category/types";
import { Checkbox } from "@/components/ui/checkbox";
import React, { useEffect } from "react";
import { FormControl, FormLabel } from "@/components/ui/form";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { Skeleton } from "@/components/ui/skeleton";
import MultipleSelector, { Option } from "@/components/ui/multiple-selector";

interface SelectCategoriesProps {
  value: Category[];
  onChange: (categories: Category[]) => void;
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

// const CategoryList: React.FC<CategoryListProps> = ({
//   categories,
//   value,
//   onChange,
// }) => {
//   const createHandleCheckboxChange =
//     (category: Category) => (checked: boolean) => {
//       if (checked) {
//         onChange([...value, category]);
//       } else {
//         onChange(value.filter((item) => item.id !== category.id));
//       }
//     };
    
//   return (
//     <>

//       {categories.map((category) => (
//         <div key={category.id}>
//           <div className="flex flex-row items-start space-x-3 space-y-0">
//             <FormControl>
//               <Checkbox
//                 id={category.id}
//                 checked={value.some((item) => item.id === category.id)}
//                 onCheckedChange={createHandleCheckboxChange(category)}
//               />
//             </FormControl>
//             <FormLabel className="text-sm font-normal" htmlFor={category.id}>
//               {category.name}
//             </FormLabel>
//           </div>
//           <Separator className="my-2" />
//         </div>
//       ))}
//     </>
//   );
// };

const CategoriesSelector: React.FC<SelectCategoriesProps> = ({
  value,
  onChange,
}) => {
  const { categories, isLoading } = useCategoryStore((store) => store);

  // useEffect(() => {
  //   categories.map(category => ({
  //     label: category.name,
  //     value: category.id
  //   }))
  // }, [categories]);

  const handelSelectedCategories = (options: Option[]) => {
    const selectedCategories = options.map(option => categories.find(c => c.id === option.value))
    onChange(selectedCategories as Category[])
  }

  return (
    <div className="w-full">
      <MultipleSelector
        defaultOptions={categories.map(category => ({
          label: `${category.name}`,
          value: `${category.id}`
        }))}
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
