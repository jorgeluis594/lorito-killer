import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { buildQuickActions } from "@/dashboard/use-cases/build-dashboard-summary";

export function QuickActions({
  restaurantsEnabled,
}: {
  restaurantsEnabled: boolean;
}) {
  const actions = buildQuickActions(restaurantsEnabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Accesos rapidos</CardTitle>
        <CardDescription>Entradas directas a operacion y detalle</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-3 text-sm transition-colors hover:bg-muted/60"
          >
            <span>
              <span className="block font-medium">{action.title}</span>
              <span className="text-xs text-muted-foreground">
                {action.description}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
