"use client";

import { useEffect } from "react";
import { getMany as getManyCategories } from "@/category/api_repository";
import { useCategoryStore } from "@/category/components/category-store-provider";
import { useToast } from "@/shared/components/ui/use-toast";

export default function CategoriesLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setCategories, setIsLoading } = useCategoryStore((store) => store);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);

    async function fetchCategories() {
      const categoriesResponse = await getManyCategories();
      setIsLoading(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
