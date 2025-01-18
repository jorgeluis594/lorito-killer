"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/shared/components/ui/card";
import {RecentSales} from "@/sales-dashboard/components/recent-sales";

export default function BestSeller() {

  return(
    <Card className="col-span-4 md:col-span-3">
      <CardHeader>
        <CardTitle>Producto más vendido</CardTitle>
      </CardHeader>
      <CardContent>
        <RecentSales />
      </CardContent>
    </Card>
  )
}