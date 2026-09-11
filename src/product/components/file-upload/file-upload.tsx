"use client";

import { UploadDropzone } from "@/shared/uploadthing";
import { Trash } from "lucide-react";
import Image from "next/image";
import { IMG_MAX_LIMIT } from "@/product/constants";
import { Button } from "../../../shared/components/ui/button";
import { useToast } from "../../../shared/components/ui/use-toast";
import { Photo } from "@/product/types";

interface ImageUploadProps {
  onChange: (value: Photo[]) => void;
  value: Photo[];
}

export default function FileUpload({ onChange, value }: ImageUploadProps) {
  const { toast } = useToast();

  const onDeleteFile = (key: string) => {
    let filteredFiles = value.filter((item) => item.key !== key);
    onChange(filteredFiles);
  };

  const onUpdateFile = (newFiles: Photo[]) => {
    onChange([...value, ...newFiles]);
  };

  return (
    <div>
      <div>
        {value.length < IMG_MAX_LIMIT && (
          <UploadDropzone
            className="!m-0 !gap-1 !outline-primary ut-label:focus-within:!ring-0 ut-button:focus-within:!ring-0 !border-input !bg-card !p-4 ut-upload-icon:!size-7 ut-upload-icon:!text-primary ut-label:!mt-1 ut-label:!w-auto ut-label:!max-w-full ut-label:!text-sm ut-label:!text-foreground ut-allowed-content:!h-auto ut-allowed-content:!text-muted-foreground ut-button:!mt-2 ut-button:!h-11 ut-button:!w-auto ut-button:!px-4 ut-button:!text-sm ut-button:!bg-primary ut-button:after:!bg-primary-hover sm:!grid sm:!grid-cols-[auto_minmax(0,1fr)_auto] sm:!gap-x-4 sm:!text-left sm:ut-upload-icon:!row-span-2 sm:ut-label:!m-0 sm:ut-label:!justify-start sm:ut-allowed-content:!col-start-2 sm:ut-button:!col-start-3 sm:ut-button:!row-start-1 sm:ut-button:!row-span-2 sm:ut-button:!m-0"
            endpoint="imageUploader"
            config={{ mode: "auto" }}
            content={{
              button({ isUploading, uploadProgress }) {
                return isUploading
                  ? `Subiendo ${uploadProgress}%`
                  : "Elegir imagen";
              },
              allowedContent({ isUploading }) {
                return isUploading
                  ? "Subiendo imagen"
                  : "Máximo 4 MB por imagen";
              },
              label() {
                return "Arrastra una imagen aquí o selecciónala";
              },
            }}
            onClientUploadComplete={(res: any[] | undefined) => {
              if (res) {
                onUpdateFile(
                  res.map((item) => {
                    const { serverData, customId, ...photo } = item;
                    return photo;
                  }),
                );
              }
            }}
            onUploadError={(error: Error) => {
              toast({
                title: "Error",
                variant: "destructive",
                description: error.message,
              });
            }}
            onUploadBegin={(name: string) => {}}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {!!value.length &&
          value?.map((item) => (
            <div
              key={item.key}
              className="relative size-28 rounded-md overflow-hidden"
            >
              <div className="z-10 absolute top-2 right-2">
                <Button
                  type="button"
                  onClick={() => onDeleteFile(item.key)}
                  variant="destructive"
                  size="icon"
                  aria-label="Eliminar imagen"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Image
                  fill
                  className="object-cover item"
                  alt="Imagen del producto"
                  sizes="112px"
                  src={item.url || ""}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
