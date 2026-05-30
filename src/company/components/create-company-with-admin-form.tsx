"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { createCompanyWithAdmin } from "@/company/components/actions";
import {
  CreateCompanyWithAdminInput,
  CreateCompanyWithAdminSchema,
} from "@/company/schemas/create-company-with-admin-schema";
import { useUserSession } from "@/lib/use-user-session";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { useToast } from "@/shared/components/ui/use-toast";

const allowedEmails = (process.env.NEXT_PUBLIC_COMPANY_SETUP_ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const defaultValues: CreateCompanyWithAdminInput = {
  name: "",
  subName: "",
  ruc: "",
  address: "",
  district: "",
  provincial: "",
  department: "",
  phone: "",
  email: "",
  subdomain: "",
  billingToken: "",
  customerSearchToken: "",
  invoiceSerialNumber: "",
  invoiceStartsOnNumber: undefined,
  receiptSerialNumber: "",
  receiptStartsOnNumber: undefined,
  ticketSerialNumber: "",
  establishmentCode: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  adminRepeatPassword: "",
};

export default function CreateCompanyWithAdminForm() {
  const session = useUserSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isAllowed = !!session?.email &&
    allowedEmails.includes(session.email.toLowerCase());

  const form = useForm<CreateCompanyWithAdminInput>({
    resolver: zodResolver(CreateCompanyWithAdminSchema),
    defaultValues,
  });

  if (!isAllowed) return null;

  const onSubmit = async (data: CreateCompanyWithAdminInput) => {
    setLoading(true);
    const response = await createCompanyWithAdmin({
      ...data,
      subdomain: data.subdomain.toLowerCase(),
      adminEmail: data.adminEmail.toLowerCase(),
    });
    setLoading(false);

    if (!response.success) {
      if (response.message?.includes("email")) {
        form.setError("adminEmail", {
          type: "manual",
          message: response.message,
        });
        return;
      }

      if (response.message?.includes("subdominio")) {
        form.setError("subdomain", {
          type: "manual",
          message: response.message,
        });
        return;
      }

      toast({
        title: "Error",
        description: response.message || "No se pudo crear la empresa",
        variant: "destructive",
      });
      return;
    }

    form.reset(defaultValues);
    toast({
      title: "Empresa creada",
      description: `${response.data.companyName || "Empresa"} fue creada con ${response.data.userEmail} como administrador.`,
    });
  };

  return (
    <Card className="max-w-5xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5" />
          Crear empresa
        </CardTitle>
        <CardDescription>
          Registra una empresa nueva con su usuario administrador inicial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <section className="space-y-3">
              <h4 className="text-sm font-medium">Empresa</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razón social</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre comercial</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ruc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RUC</FormLabel>
                      <FormControl>
                        <Input disabled={loading} maxLength={11} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subdomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subdominio</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value.toLowerCase())
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distrito</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="provincial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provincia</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2 lg:col-span-3">
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-sm font-medium">Facturación</h4>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="billingToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing token</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerSearchToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer search token</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="establishmentCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de establecimiento</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceSerialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serie de factura</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceStartsOnNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inicio de factura</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          disabled={loading}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="receiptSerialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serie de boleta</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="receiptStartsOnNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inicio de boleta</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          disabled={loading}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ticketSerialNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serie de ticket</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-sm font-medium">Administrador</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="adminName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          disabled={loading}
                          {...field}
                          onChange={(event) =>
                            field.onChange(event.target.value.toLowerCase())
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adminPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adminRepeatPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repetir contraseña</FormLabel>
                      <FormControl>
                        <Input type="password" disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Creando..." : "Crear empresa"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
