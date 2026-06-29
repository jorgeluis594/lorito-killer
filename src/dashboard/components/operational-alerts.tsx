import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  DashboardQuery,
  OperationalAlert,
  OperationalAlertSeverity,
} from "@/dashboard/types";
import { findOperationalAlerts } from "@/dashboard/db_repository";
import { ModuleErrorState } from "@/dashboard/components/module-error-state";

const severityClasses: Record<OperationalAlertSeverity, string> = {
  critical: "border-destructive/40 bg-destructive/5 text-destructive",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  neutral: "border-slate-200 bg-slate-50 text-slate-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

const severityIcon = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  neutral: Info,
  success: CheckCircle2,
} satisfies Record<OperationalAlertSeverity, typeof AlertTriangle>;

function AlertItem({ alert }: { alert: OperationalAlert }) {
  const Icon = severityIcon[alert.severity];

  return (
    <Link
      href={alert.href}
      className={cn(
        "block rounded-md border p-4 transition-colors hover:bg-muted/70",
        severityClasses[alert.severity],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{alert.title}</p>
          <p className="mt-2 text-2xl font-semibold">{alert.value}</p>
        </div>
        <Icon className="h-5 w-5 shrink-0" />
      </div>
      <p className="mt-2 text-xs opacity-80">{alert.description}</p>
    </Link>
  );
}

export async function OperationalAlerts({
  query,
  restaurantsEnabled,
}: {
  query: DashboardQuery;
  restaurantsEnabled: boolean;
}) {
  const response = await findOperationalAlerts(query, { restaurantsEnabled });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Alertas operativas</CardTitle>
      </CardHeader>
      <CardContent>
        {!response.success ? (
          <ModuleErrorState message={response.message} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {response.data.items.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
