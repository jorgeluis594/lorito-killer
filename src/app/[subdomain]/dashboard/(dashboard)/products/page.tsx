import BreadCrumb from "@/shared/breadcrumb";
import ListProducts from "@/product/components/list-product";
import {ProductFormStoreProvider} from "@/product/components/form/product-form-store-provider";
import {ProductsStoreProvider} from "@/product/components/products-store-provider";
import DataTable from "@/product/components/data-table/data-table";
import {columns} from "@/product/components/data-table/columns";
import React, {Suspense} from "react";
import {SearchParams} from "@/product/types";
import {getSession} from "@/lib/auth";
import {getManyToRender, getTotal} from "@/product/db_repository";

const breadcrumbItems = [{title: "Productos", link: "/products"}];

type ParamsProps = {
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
};

const getSearchParams = async ({
                                 searchParams,
                               }: ParamsProps): Promise<SearchParams> => {
  const session = await getSession();

  const params: SearchParams = {
    companyId: session.user.companyId,
    pageNumber: Number(searchParams.page) || 1,
    pageSize: Number(searchParams.size) || 10,
  };

  return params;
};

async function ProductsWithSuspense({ searchParams }: ParamsProps) {
  const documentQuery = await getSearchParams({ searchParams });
  const [productsResponse, productCountResponse] = await Promise.all([
    getManyToRender(documentQuery),
    getTotal(documentQuery),
  ]);

  if (!productsResponse.success || !productCountResponse.success) {
    return <p>Error cargando los documentos, comuniquese con soporte</p>;
  }

  return (
    <DataTable
      searchKey="name"
      data={productsResponse.data}
      columns={columns}
      pageCount={Math.ceil(productCountResponse.data / documentQuery.pageSize)}
    />
  );
}

export default async function Page({ searchParams }: ParamsProps) {
  return (
    <ProductsStoreProvider>
      <ProductFormStoreProvider>
        <div className="flex-1 space-y-4  p-4 md:p-8 pt-6">
          <BreadCrumb items={breadcrumbItems}/>
          <ListProducts/>
          <Suspense
            fallback={<DataTable loading columns={columns} pageCount={1} />}
          >
            <ProductsWithSuspense searchParams={searchParams} />
          </Suspense>
        </div>
      </ProductFormStoreProvider>
    </ProductsStoreProvider>
  );
}
