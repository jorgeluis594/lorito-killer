"use client";

import {Card, CardContent, CardHeader, CardTitle} from "@/shared/components/ui/card";
import {Banknote} from "lucide-react";
import React from "react";
import {formatPrice} from "@/lib/utils";

interface SalesExpenseProfitCardProps {
  sales: number;
  expenses: number;
  utility: number;
}

export function SalesExpenseProfitCard({sales, expenses, utility}:SalesExpenseProfitCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventas totales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-300">
              <Banknote size={40} color="#105d11"/>
            </div>
            <div className="text-2xl font-bold">{formatPrice(sales || 0)}</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gastos totales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-300">
              <Banknote size={40} color="#c10d0d"/>
            </div>
            <div className="text-2xl font-bold">{formatPrice(expenses || 0)}</div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Utilidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-300">
              <Banknote size={40} color="#105d11"/>
            </div>
            <div className="text-2xl font-bold">{formatPrice(utility || 0)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}