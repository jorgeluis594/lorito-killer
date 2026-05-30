"use client";

import { Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useSearchParams } from "next/navigation";

export default function ExportProductsButton() {
  const searchParams = useSearchParams();

  const onExport = () => {
    const exportParams = new URLSearchParams();
    const q = searchParams.get("q");
    const categoryId = searchParams.get("categoryId");
    const showHidden = searchParams.get("showHidden");

    if (q) exportParams.set("q", q);
    if (categoryId) exportParams.set("categoryId", categoryId);
    if (showHidden === "true") exportParams.set("showHidden", "true");

    const query = exportParams.toString();
    const url = query
      ? `/api/products/export?${query}`
      : "/api/products/export";

    window.open(url);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onExport}
    >
      <Download className="h-4 w-4 mr-2" />
      Exportar
    </Button>
  );
}
