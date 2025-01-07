"use client";

import { Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export default function DownloadXLSXButton({
  queryString,
}: {
  queryString: string;
}) {
  return (
    <Button
      type="button"
      onClick={() => window.open(`/api/sale_reports?${queryString}`)}
    >
      <Download className="h-4 w-4 mr-2" />
      Exportar
    </Button>
  );
}
