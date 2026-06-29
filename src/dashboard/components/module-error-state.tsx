import { AlertTriangle } from "lucide-react";

export function ModuleErrorState({
  message = "No pudimos cargar este resumen. Reintenta en unos segundos.",
}: {
  message?: string;
}) {
  return (
    <div className="flex min-h-[120px] items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
