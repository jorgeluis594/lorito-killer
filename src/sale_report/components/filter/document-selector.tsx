"use client";

import { DocumentType } from "@/document/types";
import { Label } from "@/shared/components/ui/label";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Checkbox } from "@/shared/components/ui/checkbox";
import useUpdateQueryString from "@/lib/use-update-query-string";

type DocumentSelectorProps = {
  documentTypes: Record<DocumentType, boolean>;
};

const DocumentTranslations: Record<DocumentType, string> = {
  invoice: "Factura",
  receipt: "Boleta",
  ticket: "Nota de venta",
};

export default function DocumentSelector({
  documentTypes,
}: DocumentSelectorProps) {
  const searchParams = useSearchParams();
  const updateRoute = useUpdateQueryString();

  const defaultValues: Record<DocumentType, boolean> = Object.keys(
    documentTypes,
  ).reduce(
    (acc, key) => {
      const documentKey = key as DocumentType;
      acc[documentKey] =
        documentTypes[documentKey] && searchParams?.get("key") === "true";
      return acc;
    },
    {} as Record<DocumentType, boolean>,
  );

  const [selectedDocuments, setSelectedDocuments] = useState(defaultValues);

  return (
    <section>
      <div className="mb-2">
        <Label>Documento tributario</Label>
        <p className="text-sm text-muted-foreground">
          Seleccione los tipos de documento a filtrar
        </p>
      </div>
      <div className="space-y-2">
        {Object.entries(documentTypes).map(([documentType, available]) => {
          return (
            <div
              key={documentType}
              className="flex flex-row items-start space-x-3 space-y-0"
            >
              <Checkbox
                checked={selectedDocuments[documentType as DocumentType]}
                disabled={!available}
                onCheckedChange={(checked) => {
                  setSelectedDocuments({
                    ...selectedDocuments,
                    [documentType]: checked,
                  });
                  updateRoute(documentType, checked ? "true" : null);
                }}
              />
              <Label className="font-normal">
                {DocumentTranslations[documentType as DocumentType]}
              </Label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
