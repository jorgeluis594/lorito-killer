"use client";

import {UploadDropzone} from "@/shared/uploadthing";
import {Trash} from "lucide-react";
import Image from "next/image";
import {Button} from "@/shared/components/ui/button";
import {useToast} from "@/shared/components/ui/use-toast";
import { Logo } from "@/company/types";

interface LogoUploadProps {
  onChange: (value: Logo) => void;
  value: Logo | undefined;
}

export default function LogoUpload({
  onChange,
  value,
}: LogoUploadProps) {
  const { toast } = useToast();

  const onDeleteFile = () => {
    onChange(undefined!);
  };

  const onUpdateFile = (newFile: Logo) => {
    onChange(newFile);
  };

  return (
    <div>
      {!value && ( // Solo mostrar el UploadDropzone si no hay imagen cargada
        <UploadDropzone
          className="dark:bg-zinc-800 py-2 ut-label:text-sm ut-allowed-content:ut-uploading:text-red-300"
          endpoint="imageUploader"
          config={{ mode: "auto" }}
          content={{
            allowedContent({ isUploading }) {
              return isUploading ? "Subiendo imagen" : "Máximo imagenes de 4mb";
            },
            label() {
              return "Arrastra y suelta o haz clic para subir tu Logo";
            },
          }}
          onClientUploadComplete={(res: any | undefined) => {
            if (res) {
              onUpdateFile(res[0]);
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

      {value && ( // Mostrar la imagen solo si hay un valor
        <div className="my-4 flex items-center justify-center gap-4">
          <div
            key={value.key}
            className="relative w-[180px] h-[180px] rounded-md overflow-hidden"
          >
            <div className="z-10 absolute top-2 right-2">
              <Button
                type="button"
                onClick={onDeleteFile}
                variant="destructive"
                size="sm"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
            <Image
              fill
              className="object-cover item"
              alt="Image"
              src={value.url || ""}
            />
          </div>
        </div>
      )}
    </div>
  );
}
