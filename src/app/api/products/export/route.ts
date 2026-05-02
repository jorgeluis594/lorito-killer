import { getMany } from "@/product/db_repository";
import { SingleProduct, SingleProductType } from "@/product/types";
import { createWorkbookBuffer } from "@/product/renders/products_xlsx";
import { NextResponse } from "next/server";
import { log } from "@/lib/log";
import { format } from "date-fns";
import { protectedRoute } from "@/authorization/server";

export const GET = protectedRoute(
  { resource: "products", action: "export" },
  async (_req, user) => {
    const productsResponse = await getMany({
      companyId: user.companyId,
      productType: SingleProductType,
      includeHidden: false,
    });

    if (!productsResponse.success) {
      log.error("get_products_for_export_failed", {
        response: productsResponse,
      });

      return NextResponse.json(
        { error: "Error al obtener los productos" },
        { status: 500 },
      );
    }

    const singleProducts = productsResponse.data as SingleProduct[];
    const buffer = await createWorkbookBuffer(singleProducts);
    const dateStr = format(new Date(), "dd-MM-yyyy");
    const filename = `stock_productos_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
);
