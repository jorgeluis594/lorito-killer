"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
    >
      <RotateCw className={pending ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
      Actualizar
    </Button>
  );
}
