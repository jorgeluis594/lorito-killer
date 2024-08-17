"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/shared/components/ui/tabs";
import TicketView from "@/new-order/components/document-view/ticket-view";
import InvoiceView from "@/new-order/components/document-view/invoice-view";
import ReceiptView from "@/new-order/components/document-view/receipt-view";
import {useOrderFormActions, useOrderFormStore} from "@/new-order/order-form-provider";

export default function Cart() {

  const order = useOrderFormStore((state) => state.order);
  const { setDocumentType } = useOrderFormActions();

  return (
    <>
      <div className="border-l h-full">
        <Tabs defaultValue={order.documentType} onValueChange={(value) => setDocumentType(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ticket">Nota de Venta</TabsTrigger>
            <TabsTrigger value="receipt">Boleta</TabsTrigger>
            <TabsTrigger value="invoice">Factura</TabsTrigger>
          </TabsList>
          <TabsContent value="ticket" className="h-[40rem]">
            <p>{order.documentType}</p>
            <TicketView/>
          </TabsContent>
          <TabsContent value="receipt" className="h-[40rem]">
            <p>{order.documentType}</p>
            <ReceiptView/>
          </TabsContent>
          <TabsContent value="invoice" className="h-[40rem]">
            <p>{order.documentType}</p>
            <InvoiceView/>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
