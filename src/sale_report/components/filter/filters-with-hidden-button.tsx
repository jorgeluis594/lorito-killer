"use client";

import DocumentSelector from "@/sale_report/components/filter/document-selector";
import { Separator } from "@/shared/components/ui/separator";
import CustomerSelector from "@/sale_report/components/filter/customer-selector";
import DateFilter from "@/sale_report/components/filter/date-filter";
import {ChevronDown} from "lucide-react";
import {Button} from "@/shared/components/ui/button";
import {useEffect, useState} from "react";
import {Customer} from "@/customer/types";
import {BillingCredentials} from "@/document/types";
import {useMediaQuery} from "usehooks-ts";

interface FiltersWithHiddenButtonProps {
  billingCredentials: BillingCredentials;
  customer: Customer | undefined;
}

export default function FiltersWithHiddenButton({billingCredentials, customer}:FiltersWithHiddenButtonProps) {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight md:mb-4">Filtros</h2>
        <div className="md:hidden">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => setIsVisible(prev => !prev)}
          >
            <ChevronDown
              className={`transition-transform duration-300 ${isVisible ? '' : 'rotate-180'}`}
            />
          </Button>
        </div>
      </div>
      {isVisible && (
        <div>
          <DateFilter />
          <Separator className="my-5" />
          <DocumentSelector
            documentTypes={{
              ticket: true,
              invoice: !!billingCredentials.invoiceSerialNumber,
              receipt: !!billingCredentials.receiptSerialNumber,
            }}
          />
          <Separator className="my-5" />
          <CustomerSelector customer={customer} />
        </div>
      )}
    </>
  );
}
