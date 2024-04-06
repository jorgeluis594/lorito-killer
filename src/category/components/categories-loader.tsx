"use client";

import { useEffect } from "react";
import { getMany as getManyCategories } from "@/category/api_repository";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { useToast } from "@/components/ui/use-toast";

export default function CategoriesLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setCategories } = useCategoryStore((store) => store);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchCategories() {
      const categoriesResponse = await getManyCategories();
      if (!categoriesResponse.success) {
        toast({
          title: "Error",
          description: "Error cargando las categorías",
        });
      } else {
        setCategories(categoriesResponse.data);
      }
    }

    fetchCategories();
  }, []);

  return <>{children}</>;
}
