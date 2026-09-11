import { Package } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function ProductThumbnail({
  src,
  className,
}: {
  src?: string;
  className?: string;
}) {
  return (
    <Avatar
      className={cn("size-20 rounded-md bg-white", className)}
      aria-hidden="true"
    >
      <AvatarImage src={src} alt="" className="object-contain" loading="lazy" />
      <AvatarFallback className="rounded-md">
        <Package className="size-6 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
}
