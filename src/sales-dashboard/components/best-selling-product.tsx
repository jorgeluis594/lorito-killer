"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/shared/components/ui/card";
import {RecentSales} from "@/sales-dashboard/components/recent-sales";
import {findProductToSalesAction} from "@/sales-dashboard/actions";
import {useEffect, useState} from "react";
import {ProductToSales} from "@/sales-dashboard/type";
import {Photo} from "@/product/types";
import {errorResponse} from "@/lib/utils";
import {ScrollArea} from "@/shared/components/ui/scroll-area";

interface BestSellerProps {
  startDate: Date;
  endDate: Date;
}

export default function BestSeller({startDate,endDate}:BestSellerProps) {
  const [products, setProducts] = useState<Array<ProductToSales>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProductsToSale = async () => {
      const findProductToSales = await findProductToSalesAction(startDate,endDate);
      if (!findProductToSales.success) {
        setLoading(false);
        return;
      }
      setProducts(findProductToSales.data);
      setLoading(false);
    };
    fetchProductsToSale();
  }, [startDate,endDate]);

  return (
    <Card className="col-span-4 md:col-span-3">
      <CardHeader>
        <CardTitle>Producto más vendido</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          {
            products.map((product) => <RecentSales key={product.productId} data={product}/>)
          }
        </ScrollArea>
      </CardContent>
    </Card>
  );
}