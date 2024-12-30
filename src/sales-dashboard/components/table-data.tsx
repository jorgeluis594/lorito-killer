"use client";

import {Card, CardContent, CardHeader, CardTitle} from "@/shared/components/ui/card";
import {Overview} from "@/shared/overview";

export default function TableData() {

  return(
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Overview</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <Overview />
      </CardContent>
    </Card>
  )
}