import CashShiftClientTable, {
  type CashShiftsTableResult,
} from "@/cash-shift/components/data-table/client";
import OpenAndCloseButton from "@/cash-shift/components/open_and_close_button";
import { countCashShifts, getManyCashShifts } from "@/cash-shift/db_repository";
import { getSession } from "@/lib/auth";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import { DataTableSkeleton } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const skeletonColumns = [
  { id: "userName", header: "Vendedor", cell: () => null, mobile: "title" },
  {
    id: "openedAt",
    header: "Apertura",
    cell: () => null,
    mobile: "description",
  },
  {
    id: "closedAt",
    header: "Cierre",
    cell: () => null,
    mobile: "description",
  },
  { id: "initialAmount", header: "Saldo inicial", cell: () => null },
  {
    id: "finalAmount",
    header: "Saldo final",
    cell: () => null,
    mobile: "value",
  },
  {
    id: "status",
    header: "Estado",
    cell: () => null,
    mobile: "description",
  },
  { id: "actions", header: "Acciones", cell: () => null, mobile: "actions" },
] as const;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadCashShifts(
  companyId: string,
  page: number,
  pageSize: number,
  countPromise: Promise<number>,
): Promise<CashShiftsTableResult | null> {
  const [response, count] = await Promise.all([
    getManyCashShifts(companyId, { page, pageSize }),
    countPromise,
  ]);

  return response.success
    ? { data: response.data, pageCount: Math.ceil(count / pageSize) }
    : null;
}

async function CashShiftCount({
  countPromise,
}: {
  countPromise: Promise<number>;
}) {
  return <>{await countPromise}</>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const session = await getSession();
  if (!session.user) return <SignOutRedirection />;

  const requestedPage = Number(params.page);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 10;
  const countPromise = countCashShifts(session.user.companyId);
  const cashShiftsPromise = loadCashShifts(
    session.user.companyId,
    page,
    pageSize,
    countPromise,
  );

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-8 p-4 pt-6 md:p-8">
      <PageHeader>
        <PageHeader.Navigation aria-label="Ruta de navegación">
          <Link
            href="/dashboard"
            className="hover:text-foreground hover:underline"
          >
            Inicio
          </Link>
          <ChevronRight aria-hidden="true" className="size-4" />
          <span aria-current="page" className="text-foreground">
            Caja chica
          </span>
        </PageHeader.Navigation>
        <PageHeader.Main>
          <PageHeader.Heading>
            <PageHeader.Title>
              Caja chica
              <span className="text-base font-normal tabular-nums text-muted-foreground">
                <Suspense fallback="—">
                  <CashShiftCount countPromise={countPromise} />
                </Suspense>
              </span>
            </PageHeader.Title>
            <PageHeader.Description>
              Controla la apertura, el cierre y el historial de tus cajas.
            </PageHeader.Description>
          </PageHeader.Heading>
          <PageHeader.Actions>
            <OpenAndCloseButton />
          </PageHeader.Actions>
        </PageHeader.Main>
      </PageHeader>
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={skeletonColumns}
            caption="Historial de cajas"
          />
        }
      >
        <CashShiftClientTable cashShiftsPromise={cashShiftsPromise} />
      </Suspense>
    </main>
  );
}
