"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/shared/components/ui/card";
import {RecentSales} from "@/shared/recent-sales";

export default function BestSeller() {

  return(
    <Card className="col-span-4 md:col-span-3">
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
        <CardDescription>
          You made 265 sales this month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RecentSales />
      </CardContent>
    </Card>
  )
}