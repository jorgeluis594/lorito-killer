import { redirect } from "next/navigation";
import { requireRole } from "@/authorization/server";
import { DashboardPageContent } from "@/dashboard/components/dashboard-page-content";
import { findDashboardFilters } from "@/dashboard/db_repository";
import { normalizeDashboardQuery } from "@/dashboard/use-cases/normalize-dashboard-query";
import { ModuleErrorState } from "@/dashboard/components/module-error-state";
import SignOutRedirection from "@/shared/components/sign-out-redirection";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function Page(props: PageProps) {
  const [searchParams, auth] = await Promise.all([
    props.searchParams,
    requireRole("ADMIN"),
  ]);

  if (!auth.success) {
    if (auth.type === "AuthError") return <SignOutRedirection />;
    redirect("/dashboard/orders/new");
  }

  const query = normalizeDashboardQuery({
    companyId: auth.data.companyId,
    searchParams,
  });

  if (!query.success) {
    return (
      <div className="flex-1 p-4 pt-6 md:p-8">
        <ModuleErrorState message={query.message} />
      </div>
    );
  }

  const filters = await findDashboardFilters(query.data);
  if (!filters.success) {
    return (
      <div className="flex-1 p-4 pt-6 md:p-8">
        <ModuleErrorState message={filters.message} />
      </div>
    );
  }

  return (
    <DashboardPageContent
      query={query.data}
      filters={filters.data}
      generatedAt={new Date()}
    />
  );
}
