"use client";

import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Combobox, type Option as ComboboxOption } from "./commbobox";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";
import { DialogDescription, DialogTitle } from "./dialog";
import MultipleSelector, { type Option } from "./multiple-selector";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Label } from "./label";

const options = [
  { value: "lima", label: "Lima" },
  { value: "arequipa", label: "Arequipa" },
  { value: "cusco", label: "Cusco" },
];

const meta = { title: "UI/Selection", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function ComboboxDemo() {
  const [selected, setSelected] = useState<ComboboxOption>();
  return <Combobox value={selected?.value} options={options} placeholder="Selecciona ciudad" onChange={setSelected} />;
}

export const ComboBox: Story = { render: () => <ComboboxDemo /> };

export const CommandMenu: Story = {
  render: () => (
    <Command className="w-[360px] rounded-lg border shadow-md">
      <CommandInput placeholder="Buscar acción..." />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Acciones">
          <CommandItem>Nueva venta<CommandShortcut>⌘N</CommandShortcut></CommandItem>
          <CommandItem>Buscar producto<CommandShortcut>⌘K</CommandShortcut></CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Cuenta"><CommandItem>Configuración</CommandItem></CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const CommandPalette: Story = {
  render: () => (
    <CommandDialog open>
      <DialogTitle className="sr-only">Comandos</DialogTitle>
      <DialogDescription className="sr-only">Busca una acción disponible.</DialogDescription>
      <CommandInput placeholder="Buscar comando..." />
      <CommandList><CommandGroup><CommandItem>Nueva venta</CommandItem></CommandGroup></CommandList>
    </CommandDialog>
  ),
};

function MultipleSelectorDemo() {
  const [value, setValue] = useState<Option[]>([options[0]]);
  return <div className="w-[420px]"><MultipleSelector value={value} defaultOptions={options} placeholder="Selecciona ciudades" onChange={setValue} /></div>;
}

export const Multiple: Story = { render: () => <MultipleSelectorDemo /> };

export const Selects: Story = {
  render: () => (
    <div className="grid w-[280px] gap-6">
      <Select defaultValue="cash">
        <SelectTrigger><SelectValue placeholder="Método de pago" /></SelectTrigger>
        <SelectContent><SelectGroup><SelectLabel>Métodos</SelectLabel><SelectItem value="cash">Efectivo</SelectItem><SelectSeparator /><SelectItem value="card">Tarjeta</SelectItem></SelectGroup></SelectContent>
      </Select>
      <RadioGroup defaultValue="delivery">
        <div className="flex items-center gap-2"><RadioGroupItem value="delivery" id="delivery" /><Label htmlFor="delivery">Delivery</Label></div>
        <div className="flex items-center gap-2"><RadioGroupItem value="pickup" id="pickup" /><Label htmlFor="pickup">Recojo</Label></div>
      </RadioGroup>
    </div>
  ),
};

export const TabbedContent: Story = {
  render: () => (
    <Tabs defaultValue="products" className="w-[420px]">
      <TabsList><TabsTrigger value="products">Productos</TabsTrigger><TabsTrigger value="orders">Pedidos</TabsTrigger></TabsList>
      <TabsContent value="products">Catálogo de productos</TabsContent>
      <TabsContent value="orders">Historial de pedidos</TabsContent>
    </Tabs>
  ),
};
