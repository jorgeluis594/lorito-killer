"use client";

import { Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export default function ExportProductsButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.open("/api/products/export")}
    >
      <Download className="h-4 w-4 mr-2" />
      Exportar
    </Button>
  );
}
