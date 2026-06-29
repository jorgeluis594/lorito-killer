import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/shared/components/ui/card";

export function KpiSummarySkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className="space-y-2 pb-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AlertSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-md" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card>
      <CardHeader className="space-y-2 pb-3">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <Skeleton className={compact ? "h-[260px]" : "h-[320px]"} />
      </CardContent>
    </Card>
  );
}

export function ListSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2 pb-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 rounded-md" />
        ))}
      </CardContent>
    </Card>
  );
}
