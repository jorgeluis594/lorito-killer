import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  copyReportSearchParams,
  type ReportSearchParams,
} from "@/sale_report/search-params";

type ReportViewTabsProps = {
  current: "sales" | "sellers";
  searchParams: ReportSearchParams;
};

function hrefFor(searchParams: ReportSearchParams, pathname: string) {
  const params = copyReportSearchParams(searchParams);
  const queryString = params.toString();

  return queryString ? `${pathname}?${queryString}` : pathname;
}

export default function ReportViewTabs({
  current,
  searchParams,
}: ReportViewTabsProps) {
  return (
    <nav className="inline-flex h-10 items-center rounded-md bg-muted p-1 text-muted-foreground">
      <Link
        href={hrefFor(searchParams, "/dashboard/sales_reports")}
        className={cn(
          "inline-flex h-8 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors",
          current === "sales" && "bg-background text-foreground shadow-sm",
        )}
      >
        Ventas
      </Link>
      <Link
        href={hrefFor(searchParams, "/dashboard/sales_reports/sellers")}
        className={cn(
          "inline-flex h-8 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors",
          current === "sellers" && "bg-background text-foreground shadow-sm",
        )}
      >
        Vendedores
      </Link>
    </nav>
  );
}
