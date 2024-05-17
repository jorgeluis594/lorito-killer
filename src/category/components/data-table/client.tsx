import { Category } from '@/category/types'
import React from 'react'

interface CategoriesClientProps {
  data: Category[] | null,
  isLoading: boolean,
  onUpsertProductPerformed: () => void
}

export default function CategoriesClient({
  data,
  isLoading,
  onUpsertProductPerformed
}: CategoriesClientProps) {
  return (
    <div>client Cate</div>
  )
}
