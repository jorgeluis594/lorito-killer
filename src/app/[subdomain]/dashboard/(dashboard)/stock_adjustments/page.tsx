import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { find as findProduct } from "@/product/db_repository";
import { isSingleProduct } from "@/product/types";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import { DataTableSkeleton } from "@/shared/components/ui/data-table";
import { PageHeader } from "@/shared/components/ui/page-header";
import AddStockAdjustmentModal from "@/stock-transfer/components/add-stock-adjustment-modal";
import {
  StockTransfersDataTable,
  type StockTransfersTableResult,
} from "@/stock-transfer/components/table/client";
import { getMany, total } from "@/stock-transfer/db_repository";

const skeletonColumns = [
  {
    id: "productName",
    header: "Producto",
    cell: () => null,
    mobile: "title",
  },
  {
    id: "type",
    header: "Tipo",
    cell: () => null,
    mobile: "description",
  },
  {
    id: "value",
    header: "Variación",
    align: "right",
    cell: () => null,
    mobile: "value",
  },
  { id: "userName", header: "Usuario", cell: () => null },
  {
    id: "createdAt",
    header: "Fecha",
    cell: () => null,
    mobile: "description",
  },
] as const;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function loadStockTransfers(
  companyId: string,
  page: number,
  pageSize: number,
  productId: string | undefined,
  totalCountPromise: Promise<number>,
): Promise<StockTransfersTableResult | null> {
  const [transfersResponse, totalCount, productResponse] = await Promise.all([
    getMany({ companyId, page, pageLimit: pageSize, productId }),
    totalCountPromise,
    productId ? findProduct(productId, companyId) : Promise.resolve(null),
  ]);

  if (!transfersResponse.success) return null;

  return {
    data: transfersResponse.data,
    pageCount: Math.ceil(totalCount / pageSize),
    selectedProduct:
      productResponse?.success && isSingleProduct(productResponse.data)
        ? productResponse.data
        : undefined,
  };
}

async function TransferCount({
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

  const page = Math.max(Number(params.page) || 1, 1);
  const pageSize = 10;
  const productId =
    typeof params.productId === "string" ? params.productId : undefined;
  const countPromise = total(session.user.companyId, productId);
  const transfersPromise = loadStockTransfers(
    session.user.companyId,
    page,
    pageSize,
    productId,
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
            Movimientos de stock
          </span>
        </PageHeader.Navigation>
        <PageHeader.Main>
          <PageHeader.Heading>
            <PageHeader.Title>
              Movimientos de stock
              <span className="text-base font-normal tabular-nums text-muted-foreground">
                <Suspense fallback="—">
                  <TransferCount countPromise={countPromise} />
                </Suspense>
              </span>
            </PageHeader.Title>
            <PageHeader.Description>
              Revisa y registra aumentos o disminuciones del inventario.
            </PageHeader.Description>
          </PageHeader.Heading>
          <PageHeader.Actions>
            <AddStockAdjustmentModal />
          </PageHeader.Actions>
        </PageHeader.Main>
      </PageHeader>
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={skeletonColumns}
            caption="Movimientos de stock"
          />
        }
      >
        <StockTransfersDataTable resultPromise={transfersPromise} />
      </Suspense>
    </main>
  );
}
