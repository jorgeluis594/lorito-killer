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

export default function Cart() {

  return (
    <>
      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ticket">Nota de Venta</TabsTrigger>
          <TabsTrigger value="receipt">Boleta</TabsTrigger>
          <TabsTrigger value="invoice">Factura</TabsTrigger>
        </TabsList>
        <TabsContent value="ticket">
          <TicketView />
        </TabsContent>
        <TabsContent value="receipt">
          <ReceiptView />
        </TabsContent>
        <TabsContent value="invoice">
          <InvoiceView />
        </TabsContent>
      </Tabs>
    </>
  );
}
