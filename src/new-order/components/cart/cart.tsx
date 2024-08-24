"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/shared/components/ui/tabs";
import Ticket from "@/new-order/components/document-view/ticket";
import Invoice from "@/new-order/components/document-view/invoice";
import Receipt from "@/new-order/components/document-view/receipt";
import {useOrderFormActions, useOrderFormStore} from "@/new-order/order-form-provider";
import { DocumentType } from "@/order/types";

export default function Cart() {

  const order = useOrderFormStore((state) => state.order);
  const { setDocumentType } = useOrderFormActions();

  return (
    <>
      <div className="border-l h-full">
        <Tabs value={order.documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ticket">Nota de Venta</TabsTrigger>
            <TabsTrigger value="receipt">Boleta</TabsTrigger>
            <TabsTrigger value="invoice">Factura</TabsTrigger>
          </TabsList>
          <TabsContent value="ticket" className="h-[40rem]">
            <Ticket/>
          </TabsContent>
          <TabsContent value="receipt" className="h-[40rem]">
            <Receipt/>
          </TabsContent>
          <TabsContent value="invoice" className="h-[40rem]">
            <Invoice/>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
