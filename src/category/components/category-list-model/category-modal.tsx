"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useCategoryStore } from "@/category/components/category-store-provider";
import CategoryContent from "./category-content";
import NewCategoryForm from "@/product/components/category/new-category-dialog";
import { Category } from "@/category/types";
import { List } from "lucide-react";

interface CategoriesModalProps {
  addCategory: (category: Category) => void;
}

export default function CategoriesModal({ addCategory }: CategoriesModalProps) {
  const categories = useCategoryStore((store) => store.categories);
  const updateCategory = useCategoryStore((store) => store.updateCategory);
  const isLoading = useCategoryStore((store) => store.isLoading);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-[var(--field-height)] shrink-0"
          aria-label="Administrar categorías"
        >
          <List aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-6 text-left">
          <DialogTitle>Categorías</DialogTitle>
          <DialogDescription>
            Organiza las categorías de tu catálogo.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p role="status" className="py-4 text-sm text-muted-foreground">
            Cargando categorías…
          </p>
        ) : categories.length ? (
          <ul
            aria-label="Categorías del catálogo"
            className="max-h-64 overflow-y-auto divide-y"
          >
            {categories.map((category) => (
              <CategoryContent
                key={category.id}
                category={category}
                onCategoryUpdated={updateCategory}
              />
            ))}
          </ul>
        ) : (
          <div className="py-4 text-sm">
            <p className="font-semibold">Aún no hay categorías</p>
            <p className="mt-1 text-muted-foreground">
              Crea la primera para agrupar tus productos.
            </p>
          </div>
        )}
        <div className="border-t pt-5">
          <NewCategoryForm addCategory={addCategory} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
