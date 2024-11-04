import BreadCrumb from "@/shared/breadcrumb";
import { ProductFormStoreProvider } from "@/product/components/form/product-form-store-provider";
import { Heading } from "@/shared/components/ui/heading";
import { Button } from "@/shared/components/ui/button";
import { Boxes, Plus } from "lucide-react";
import { HelpTooltip } from "@/shared/components/ui/help-tooltip";
import { Separator } from "@/shared/components/ui/separator";
import DataTable from "@/sale_report/components/table/client";
import { columns } from "@/product/components/data-table/columns";
import React, { Suspense } from "react";
import { getMany, GetManyParams, getTotal } from "@/product/db_repository";
import { getSession } from "@/lib/auth";
import ProductModalForm from "@/product/components/form/product-modal-form";
import AddProductButtons from "@/product/components/add-single-product-button";
const breadcrumbItems = [{ title: "Productos", link: "/products" }];

type ParamsProps = {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
};

async function ProductsWithSuspense({ searchParams }: ParamsProps) {
  const session = await getSession();
  const params: GetManyParams = {
    companyId: session.user.companyId,
    pageNumber: Number(searchParams.page) || 1,
    limit: Number(searchParams.size) || 10,
  };

  if (searchParams.q) {
    params.q = searchParams.q as string;
  }

  const [productsResponse, productsCountResponse] = await Promise.all([
    getMany(params),
    getTotal({ companyId: session.user.companyId }),
  ]);

  if (!productsResponse.success || !productsCountResponse.success) {
    return <p>Error cargando los documentos, comuniquese con soporte</p>;
  }

  return (
    <DataTable
      data={productsResponse.data}
      columns={columns}
      searchTextPlaceholder={"Buscar producto por nombre o sku"}
      pageCount={Math.ceil(
        productsCountResponse.data / (Number(searchParams.size) || 10),
      )}
      allowSearch
    />
  );
}

export default async function Page({ searchParams }: ParamsProps) {
  const session = await getSession();
  const totalResponse = await getTotal({ companyId: session.user.companyId });

  return (
    <ProductFormStoreProvider>
      <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
        <BreadCrumb items={breadcrumbItems} />
        <div className="flex items-start justify-between">
          <Heading
            title={`Productos de prueba (${totalResponse.success ? totalResponse.data : "-"})`}
            description="Gestiona tus productos!"
          />
          <AddProductButtons />
        </div>
        <Separator />
        <ProductModalForm />
        <Suspense
          fallback={<DataTable loading columns={columns} pageCount={1} />}
        >
          <ProductsWithSuspense searchParams={searchParams} />
        </Suspense>
      </div>
    </ProductFormStoreProvider>
  );
}
