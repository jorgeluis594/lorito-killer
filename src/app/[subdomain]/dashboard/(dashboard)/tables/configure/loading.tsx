import { Skeleton } from "@/shared/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" className="flex flex-col gap-6 p-8">
      <span className="sr-only">Cargando mesas…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
