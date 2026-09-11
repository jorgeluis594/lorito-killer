"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useForm } from "react-hook-form";
import { Button } from "./button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { Input } from "./input";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { Toaster } from "./toaster";
import { toast } from "./use-toast";

const meta = { title: "UI/Form and feedback", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function FormDemo() {
  const form = useForm<{ email: string }>({ defaultValues: { email: "ventas@lorito.pe" } });
  return (
    <Form {...form}>
      <form className="w-[360px]" onSubmit={form.handleSubmit(() => undefined)}>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Correo</FormLabel>
            <FormControl><Input type="email" {...field} /></FormControl>
            <FormDescription>Usaremos este correo para enviar el comprobante.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />
        <Button className="mt-4" type="submit">Guardar</Button>
      </form>
    </Form>
  );
}

export const FormFields: Story = { render: () => <FormDemo /> };

export const ToastMessage: Story = {
  render: () => (
    <ToastProvider>
      <Toast open>
        <div className="grid gap-1"><ToastTitle>Venta registrada</ToastTitle><ToastDescription>El comprobante se generó correctamente.</ToastDescription></div>
        <ToastAction altText="Ver venta">Ver</ToastAction>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  ),
};

export const ToastHook: Story = {
  render: () => (
    <>
      <Button onClick={() => toast({ title: "Guardado", description: "Los cambios fueron guardados." })}>Mostrar toast</Button>
      <Toaster />
    </>
  ),
};
