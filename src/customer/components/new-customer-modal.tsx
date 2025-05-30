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

import { Plus, Search } from "lucide-react";
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
import { BusinessCustomer, NaturalCustomer } from "@/customer/types";
import { useToast } from "@/shared/components/ui/use-toast";
import { useUserSession } from "@/lib/use-user-session";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/new-order/order-form-provider";
import { useEffect, useState } from "react";
import { createCustomer, searchCustomer } from "@/customer/actions";
import DistrictSelector from "@/locality/components/district_selector";
import { District } from "@/locality/types";

const CustomerSchema = z.object({
  documentType: z.enum([DNI, RUC]).optional(),
  documentNumber: z.coerce
    .string()
    .max(11, { message: "El número máximo de dígitos es 11." }),
  geoCode: z.string().optional(),
  fullName: z.string().min(3, {
    message: "El nombre del cliente debe tener al menos 3 caracteres",
  }),
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
      districtName: "", // Improve this, find a better way to handle localities
      provinceName: "", // Improve this, find a better way to handle localities
      departmentName: "", // Improve this, find a better way to handle localities
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
  const [locality, setLocality] = useState<District | undefined>();
  const { setCustomer } = useOrderFormActions();

  const onSubmit = async (data: CustomerFormValues) => {
    const res = await createCustomer(
      formValuesToCustomer(data, user!.companyId!),
    );
    if (res.success) {
      toast({
        description: "Cliente creado con éxito",
      });
      form.reset();
      setLocality(undefined);
      setOpen(false);
      setCustomer(res.data);
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: "El cliente ya esta registrado. ",
      });
    }
  };

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    setOpen(isOpen);
  };

  const handleSearch = async () => {
    const documentNumberSearch = form.watch("documentNumber");
    const res = await searchCustomer(
      String(documentNumberSearch),
      order.documentType,
    );
    if (res.success) {
      if (res.data._branch === "BusinessCustomer") {
        form.setValue("fullName", res.data.legalName);
        form.setValue("address", res.data.address);
        form.setValue("geoCode", res.data.geoCode);
        setLocality({
          _brand: "District",
          id: "",
          level: "District",
          geoCode: res.data.geoCode,
          provinceName: res.data.provinceName,
          departmentName: res.data.departmentName,
          name: res.data.districtName,
          parentId: "",
        });
      } else {
        form.setValue("fullName", res.data.fullName);
        form.setValue("address", res.data.address);
      }
    } else {
      toast({
        title: "Error",
        variant: "destructive",
        description: res.message,
      });
    }
  };

  useEffect(() => {
    const defaultDocumentType =
      order.documentType === "receipt" || order.documentType === "ticket"
        ? DNI
        : RUC;
    form.setValue("documentType", defaultDocumentType);
  }, [order.documentType, form]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
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
            <div className="grid grid-rows-2 md:grid-rows-none md:grid-cols-2 md:gap-4">
              <div className="flex items-center md:col-span-1">
                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({field}) => (
                    <FormItem className="flex-1">
                      <FormLabel>Numero de documento</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  className="mt-8 md:h-10 md:w-14 flex md:mt-8 items-center md:px-4"
                  onClick={handleSearch}
                >
                  <Search/>
                </Button>
              </div>
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({field}) => (
                    <FormItem className="col-span-1 mt-4">
                      <FormLabel>Tipo de Documento</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={
                          order.documentType === "receipt" ||
                          order.documentType === "ticket"
                            ? DNI
                            : RUC
                        }
                        disabled
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue/>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {order.documentType === "receipt" ||
                          order.documentType === "ticket" ? (
                            <SelectItem value={DNI}>DNI</SelectItem>
                          ) : (
                            <SelectItem value={RUC}>RUC</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
            </div>
              <FormField
                control={form.control}
                name="fullName"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>
                      {order.documentType === "ticket" ||
                      order.documentType === "receipt"
                        ? "Nombre"
                        : "Razón Social"}
                    </FormLabel>
                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <FormField
                    control={form.control}
                    name="geoCode"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Distrito</FormLabel>
                        <FormControl>
                          <DistrictSelector
                            value={locality}
                            onSelect={(locality) => {
                              setLocality(locality);
                              field.onChange({
                                target: {value: locality.geoCode},
                              });
                            }}
                          />
                        </FormControl>
                        <FormMessage/>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-1">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input autoComplete="off" {...field} />
                        </FormControl>
                        <FormMessage/>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Correo</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage/>
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
