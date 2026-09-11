import { ProductFormStoreProvider } from "@/product/components/form/product-form-store-provider";
import { PageHeader } from "@/shared/components/ui/page-header";
import { DataTableSkeleton } from "@/shared/components/ui/data-table";
import React, { Suspense } from "react";
import { getMany, GetManyParams, getTotal } from "@/product/db_repository";
import { getSession } from "@/lib/auth";
import ProductModalForm from "@/product/components/form/product-modal-form";
import AddProductButtons from "@/product/components/add-single-product-button";
import SignOutRedirection from "@/shared/components/sign-out-redirection";
import { ProductsTableFilters } from "@/product/components/data-table/products-table-filters";
import {
  ProductsDataTable,
  type ProductsTableResult,
} from "@/product/components/data-table/products-data-table";
import ExportProductsButton from "@/product/components/export-products-button";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const skeletonColumns = [
  { id: "name", header: "Producto", cell: () => null, mobile: "title" },
  {
    id: "category",
    header: "Categorías",
    cell: () => null,
    mobile: "description",
  },
  {
    id: "status",
    header: "Stock",
    align: "right",
    cell: () => null,
    mobile: "description",
  },
  {
    id: "price",
    header: "Precio de venta",
    align: "right",
    cell: () => null,
    mobile: "value",
  },
  {
    id: "purchasePrice",
    header: "Precio de compra",
    align: "right",
    cell: () => null,
  },
  { id: "sku", header: "Código", cell: () => null },
  {
    id: "actions",
    header: "Acciones",
    align: "right",
    cell: () => null,
    mobile: "actions",
  },
] as const;

type PageProps = {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};

async function loadProducts(
  companyId: string,
  searchParams: { [key: string]: string | string[] | undefined },
): Promise<ProductsTableResult | null> {
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  const categoryId =
    typeof searchParams.categoryId === "string"
      ? searchParams.categoryId
      : undefined;

  const params: GetManyParams = {
    companyId,
    pageNumber: Number(searchParams.page) || 1,
    limit: Number(searchParams.size) || 10,
    categoryId,
    includeHidden: searchParams.showHidden === "true",
    stock: searchParams.stock === "zero" ? "zero" : undefined,
  };

  if (q) {
    params.q = q;
  }

  const [productsResponse, productsCountResponse] = await Promise.all([
    getMany(params),
    getTotal({
      companyId,
      q,
      categoryId,
      includeHidden: searchParams.showHidden === "true",
      stock: searchParams.stock === "zero" ? "zero" : undefined,
    }),
  ]);

  if (!productsResponse.success || !productsCountResponse.success) {
    return null;
  }

  return {
    data: productsResponse.data,
    pageCount: Math.ceil(
      productsCountResponse.data / (Number(searchParams.size) || 10),
    ),
  };
}

async function ProductCount({
  totalPromise,
}: {
  totalPromise: ReturnType<typeof getTotal>;
}) {
  const totalResponse = await totalPromise;
  return totalResponse.success ? totalResponse.data : "—";
}

export default async function Page(props: PageProps) {
  const searchParams = await props.searchParams;
  const session = await getSession();
  if (!session.user) return <SignOutRedirection />;

  const totalPromise = getTotal({ companyId: session.user.companyId });
  const productsPromise = loadProducts(session.user.companyId, searchParams);

  return (
    <ProductFormStoreProvider>
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
              Productos
            </span>
          </PageHeader.Navigation>
          <PageHeader.Main>
            <PageHeader.Heading>
              <PageHeader.Title>
                Productos
                <span className="text-base font-normal tabular-nums text-muted-foreground">
                  <Suspense fallback="—">
                    <ProductCount totalPromise={totalPromise} />
                  </Suspense>
                </span>
              </PageHeader.Title>
              <PageHeader.Description>
                Administra el catálogo, precios y disponibilidad del punto de
                venta.
              </PageHeader.Description>
            </PageHeader.Heading>
            <PageHeader.Actions>
              <ExportProductsButton />
              <AddProductButtons />
            </PageHeader.Actions>
          </PageHeader.Main>
        </PageHeader>
        <ProductModalForm />
        <ProductsTableFilters />
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={skeletonColumns}
              caption="Productos del catálogo"
            />
          }
        >
          <ProductsDataTable resultPromise={productsPromise} />
        </Suspense>
      </main>
    </ProductFormStoreProvider>
  );
}
