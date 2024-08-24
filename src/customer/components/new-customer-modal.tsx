"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";

import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Customer, DNI, RUC } from "@/customer/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {BusinessCustomer, NaturalCustomer} from "@/customer/types";
import { useToast } from "@/shared/components/ui/use-toast";
import { useUserSession } from "@/lib/use-user-session";
import {useOrderFormStore} from "@/new-order/order-form-provider";
import {useEffect, useState} from "react";
import {createCustomer} from "@/customer/actions";

const CustomerSchema = z.object({
  documentType: z.enum([DNI, RUC]).optional(),
  documentNumber: z.coerce.number(),
  geoCode: z.string().optional(),
  fullName: z.string(),
  address: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof CustomerSchema>;

const formValuesToCustomer = (
  values: CustomerFormValues,
  companyId: string,
): Customer => {
  if (values.documentType === DNI) {
    return {
      _branch: "NaturalCustomer",
      id: crypto.randomUUID(),
      companyId: companyId,
      documentType: DNI,
      documentNumber: values.documentNumber.toString(),
      geoCode: values.geoCode || "",
      fullName: values.fullName,
      address: values.address || "",
      email: values.email || "",
      phoneNumber: values.phoneNumber || "",
    };
  } else {
    return {
      _branch: "BusinessCustomer",
      id: crypto.randomUUID(),
      companyId: companyId,
      documentType: RUC,
      documentNumber: values.documentNumber.toString(),
      legalName: values.fullName,
      address: values.address || "",
      geoCode: values.geoCode || "",
      email: values.email || "",
      phoneNumber: values.phoneNumber || "",
    };
  }
};

export default function NewCustomerModal() {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerSchema),
  });
  const order = useOrderFormStore((state) => state.order);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const user = useUserSession();

  const resp = (res: any) => {
    if (res.success) {
      toast({
        description: "Cliente creado con éxito",
      });
      form.reset();
      setOpen(false)
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: "Error al crear el cliente " + res.message,
      });
    }
  }

  const onSubmit = async (data: CustomerFormValues) => {

    if(form.getValues("documentType") === "dni"){
      const res = await createCustomer(
        formValuesToCustomer(data, user!.companyId!) as NaturalCustomer,
      );
      resp(res)
    } else {
      const res = await createCustomer(
        formValuesToCustomer(data, user!.companyId!) as BusinessCustomer,
      );
      resp(res)
    }

  };

  useEffect(() => {
    const defaultDocumentType = order.documentType === "receipt" || order.documentType === "ticket" ? DNI : RUC;
    form.setValue("documentType", defaultDocumentType);
  }, [order.documentType, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="outline" size="icon">
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent variant="right" className="flex flex-col max-w-[35rem]">
        <DialogHeader>
          <DialogTitle>Datos generales</DialogTitle>
          <DialogDescription>
            Ingresa la información principal de tu cliente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="documentNumber"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Numero de documento</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem className="col-span-1">
                    <FormLabel>Tipo de Documento</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={ order.documentType === "receipt" || order.documentType === "ticket" ? DNI : RUC }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue/>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        { order.documentType === "receipt" || order.documentType === "ticket" ?
                          <SelectItem value={DNI}>DNI</SelectItem>
                          :
                          <SelectItem value={RUC}>RUC</SelectItem>
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{order.documentType === "ticket" || order.documentType === "receipt" ? "Nombre" : "Razón Social"}</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
        <DialogFooter className="mt-auto">
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
          <Button type="button" onClick={form.handleSubmit(onSubmit)}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
