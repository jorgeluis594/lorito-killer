"use client";

import { Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useSearchParams } from "next/navigation";

export default function DownloadXLSXButton() {
  const searchParams = useSearchParams();

  return (
    <Button
      type="button"
      onClick={() =>
        window.open(`/api/sale_reports?${searchParams.toString()}`)
      }
    >
      <Download className="h-4 w-4 mr-2" />
      Exportar
    </Button>
  );
}
