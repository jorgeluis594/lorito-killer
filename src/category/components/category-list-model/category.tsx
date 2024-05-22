"use client"

import { Suspense, useEffect, useState } from "react"
import { Category } from "@/category/types"
import { getMany } from "@/category/api_repository"
import CategoriesClient from "@/category/components/data-table/client"

export const Categories = () => {
  const [categories, setCategories] = useState<null | Category[]>(null)
  const [error, setError] = useState<null | string>();
  const [isLoading, setIsLoading] = useState(true);
  const fetchCategories = async () => {
    const response = await getMany();
    setIsLoading(false);

    if (!response.success) {
      setError(response.message);
    } else {
      setCategories(response.data);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  const reloadCategories = () => {
    fetchCategories();
  };

  return (
    <>
      <CategoriesClient
        data={categories}
        isLoading={isLoading}
        onUpsertCategoryPerformed={reloadCategories} />
    </>
  )
}

export default function ListCategories() {
  return (
    <Suspense fallback={<p>Loading</p>}>
      <Categories />
    </Suspense>
  )
}
