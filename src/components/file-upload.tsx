"use client";

import {UploadDropzone} from "@/components/uploadthing";
import {Trash} from "lucide-react";
import Image from "next/image";
import {IMG_MAX_LIMIT} from "@/product/constants";
import {Button} from "./ui/button";
import {useToast} from "./ui/use-toast";

interface ImageUploadProps {
  onChange?: any;
  onRemove: (key: string) => void;
  value: any[];
}

export default function FileUpload({
                                     onChange,
                                     onRemove,
                                     value,
                                   }: ImageUploadProps) {
  const { toast } = useToast();

  const onUpdateFile = (newFiles: any[]) => {
    onChange([...value, ...newFiles]);
  };
  return (
    <div>
      <div>
        {value.length < IMG_MAX_LIMIT && (
          <UploadDropzone
            className="dark:bg-zinc-800 py-2 ut-label:text-sm ut-allowed-content:ut-uploading:text-red-300"
            endpoint="imageUploader"
            config={{mode: "auto"}}
            content={{
              allowedContent({isUploading}) {
                return isUploading ? "Subiendo imagen" : "Máximo imagenes de 4mb"
              },
              label() {
                return "Arrastra y suelta o haz clic para subir";
              }
            }}
            onClientUploadComplete={(res: any[] | undefined) => {
              if (res) {
                onUpdateFile(res);
              }
            }}
            onUploadError={(error: Error) => {
              toast({
                title: "Error",
                variant: "destructive",
                description: error.message,
              });
            }}
            onUploadBegin={(name: string) => {
            }}
          />
        )}
      </div>
      <div className="my-4 flex items-center gap-4">
        {!!value.length &&
          value?.map((item) => (
            <div
              key={item.key}
              className="relative w-[100px] h-[100px] rounded-md overflow-hidden"
            >
              <div className="z-10 absolute top-2 right-2">
                <Button
                  type="button"
                  onClick={() => onRemove(item.key)}
                  variant="destructive"
                  size="sm"
                >
                  <Trash className="h-4 w-4"/>
                </Button>
              </div>
              <div>
                <Image
                  fill
                  className="object-cover"
                  alt="Image"
                  src={item.url || ""}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
