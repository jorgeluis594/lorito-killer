"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { DNI, RUC } from "@/customer/types";

const CustomerSchema = z.object({
  documentType: z.enum([DNI, RUC]).optional(),
  documentNumber: z.string().optional(),
  geoCode: z.string().optional(),
  fullName: z.string(),
  address: z.string().optional(),
  email: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof CustomerSchema>;

export default function NewCustomerModal() {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerSchema),
  });

  return (
    <Dialog>
      <DialogTrigger>
        <Button variant="outline" size="icon">
          <Plus />
        </Button>
      </DialogTrigger>
      <DialogContent variant="right">
        <DialogHeader>
          <DialogTitle>Datos generales</DialogTitle>
          <DialogDescription>
            Ingresa la información principal de tu cliente
          </DialogDescription>
        </DialogHeader>

        {
          <Form {...form}>
            <form onSubmit={form.handleSubmit()} className="mx-auto space-y-8">
              <div className="">
                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
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
                    <FormItem>
                      <FormLabel>Tipo de documento</FormLabel>
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
        }
      </DialogContent>
    </Dialog>
  );
}
