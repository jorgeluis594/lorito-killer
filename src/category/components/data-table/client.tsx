"use client";

import { DataTable } from "./data-table";
import { columns } from "./columns";
import { Category } from "@/category/types";
interface CategoriesClientProps {
  data: Category[] | null,
  isLoading: boolean,
  onUpsertCategoryPerformed: () => void
}

export default function CategoriesClient({
  data,
  isLoading,
  onUpsertCategoryPerformed,
}: CategoriesClientProps) {
  return (
    <DataTable
      searchKey="name"
      columns={columns}
      data={data ?? []}
      isLoading={isLoading}
      onActionPerformed={onUpsertCategoryPerformed}
    />
  )
}
