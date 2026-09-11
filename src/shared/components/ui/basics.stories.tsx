import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { Button, LoadingButton } from "./button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Checkbox } from "./checkbox";
import { Heading } from "./heading";
import { Input, MoneyInput } from "./input";
import { Label } from "./label";
import { Separator } from "./separator";
import { Skeleton } from "./skeleton";
import { Switch } from "./switch";
import { Textarea } from "./textarea";
import { Toggle } from "./toggle";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const meta = {
  title: "UI/Basics",
  parameters: { layout: "centered" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Buttons: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Principal</Button>
      <Button variant="secondary">Secundario</Button>
      <Button variant="outline">Contorno</Button>
      <Button variant="destructive">Eliminar</Button>
      <LoadingButton loading>Cargando</LoadingButton>
    </div>
  ),
};

export const BadgesAndAvatar: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="Usuario" />
        <AvatarFallback>LK</AvatarFallback>
      </Avatar>
      <Badge>Activo</Badge>
      <Badge variant="secondary">Pendiente</Badge>
      <Badge variant="destructive">Anulado</Badge>
      <Badge variant="outline">Borrador</Badge>
    </div>
  ),
};

export const CardsAndHeading: Story = {
  render: () => (
    <div className="w-[420px]">
      <Heading title="Productos" description="Administra el catálogo." />
      <Card>
        <CardHeader>
          <CardTitle>Producto destacado</CardTitle>
          <CardDescription>Disponible en el punto de venta.</CardDescription>
        </CardHeader>
        <CardContent>S/ 24.90</CardContent>
        <CardFooter>
          <Button className="w-full">Agregar</Button>
        </CardFooter>
      </Card>
    </div>
  ),
};

export const Inputs: Story = {
  render: () => (
    <div className="grid w-[360px] gap-4">
      <div className="grid gap-1">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" placeholder="Arroz con pollo" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="price">Precio</Label>
        <MoneyInput id="price" value={2490} readOnly />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" placeholder="Indicaciones adicionales" />
      </div>
    </div>
  ),
};

export const Choices: Story = {
  render: () => (
    <div className="grid gap-5">
      <label className="flex items-center gap-2"><Checkbox defaultChecked /> Seleccionado</label>
      <label className="flex items-center gap-2"><Switch defaultChecked /> Disponible</label>
      <Toggle aria-label="Negrita">Negrita</Toggle>
      <ToggleGroup type="single" defaultValue="day" aria-label="Vista">
        <ToggleGroupItem value="day">Día</ToggleGroupItem>
        <ToggleGroupItem value="week">Semana</ToggleGroupItem>
        <ToggleGroupItem value="month">Mes</ToggleGroupItem>
      </ToggleGroup>
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div className="grid w-[360px] gap-3">
      <Skeleton className="h-8 w-1/2" />
      <Separator />
      <Skeleton className="h-20 w-full" />
    </div>
  ),
};
