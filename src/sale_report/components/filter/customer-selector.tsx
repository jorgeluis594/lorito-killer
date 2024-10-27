"use client";

import { Label } from "@/shared/components/ui/label";
import CustomerApiSelector from "@/customer/components/customer-selector";
import { Customer } from "@/customer/types";
import { useState } from "react";
import useUpdateQueryString from "@/lib/use-update-query-string";

interface CustomerSelectorProps {
  customer?: Customer;
}

export default function CustomerSelector({ customer }: CustomerSelectorProps) {
  const updateRoute = useUpdateQueryString();
  const [currentCustomer, setCurrentCustomer] = useState<Customer | undefined>(
    customer,
  );

  const onCustomerChange = (customer: Customer) => {
    setCurrentCustomer(customer);
    updateRoute({ customerId: customer.id });
  };

  return (
    <section className="mb-2">
      <Label>Cliente</Label>
      <p className="text-sm text-muted-foreground">
        Busqueda por ruc, razon social, nombre o dni
      </p>
      <div className="mt-2">
        <CustomerApiSelector
          value={currentCustomer}
          placeHolder="Seleccione cliente"
          onSelect={onCustomerChange}
        />
      </div>
    </section>
  );
}
