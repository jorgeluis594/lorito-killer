import { Suspense } from "react";
import BreadCrumb from "@/shared/breadcrumb";
import { Heading } from "@/shared/components/ui/heading";
import { Separator } from "@/shared/components/ui/separator";
import ReportViewTabs from "@/sale_report/components/report-view-tabs";
import SellerReportContent from "@/sale_report/components/sellers/seller-report-content";
import SellerReportFilterLoader from "@/sale_report/components/sellers/seller-report-filter-loader";

export const dynamic = "force-dynamic";

const breadcrumbItems = [
  { title: "Reporte de ventas", link: "/sales_reports" },
  { title: "Vendedores", link: "/sales_reports/sellers" },
];

type PageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <BreadCrumb items={breadcrumbItems} />

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <Heading title="Reporte de ventas" />
        <ReportViewTabs current="sellers" searchParams={searchParams} />
      </div>
      <Separator />

      <div className="items-center md:mt-8 md:flex md:flex-row md:space-x-12 md:space-y-0">
        <aside className="md:w-1/5">
          <Suspense
            fallback={
              <div className="mt-6 rounded-md border p-4 text-sm text-muted-foreground">
                Cargando filtros...
              </div>
            }
          >
            <SellerReportFilterLoader searchParams={searchParams} />
          </Suspense>
        </aside>
        <div className="mt-6 flex-1 lg:max-w-7xl">
          <Suspense
            fallback={
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                Cargando reporte de vendedores...
              </div>
            }
          >
            <SellerReportContent searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
