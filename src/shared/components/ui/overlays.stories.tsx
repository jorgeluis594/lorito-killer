import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { HelpTooltip } from "./help-tooltip";
import { Modal } from "./modal";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./popover";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const meta = { title: "UI/Overlays", parameters: { layout: "centered" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Dialogs: Story = {
  render: () => (
    <div className="flex gap-3">
      <Dialog>
        <DialogTrigger asChild><Button>Editar producto</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar producto</DialogTitle><DialogDescription>Actualiza la información visible.</DialogDescription></DialogHeader>
          <p>Contenido del formulario</p>
          <DialogFooter><Button>Guardar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog>
        <AlertDialogTrigger asChild><Button variant="destructive">Eliminar</Button></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction>Continuar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  ),
};

export const Dropdown: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline">Acciones</Button></DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup><DropdownMenuItem>Editar<DropdownMenuShortcut>⌘E</DropdownMenuShortcut></DropdownMenuItem></DropdownMenuGroup>
        <DropdownMenuCheckboxItem checked>Notificaciones</DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value="cash"><DropdownMenuRadioItem value="cash">Efectivo</DropdownMenuRadioItem></DropdownMenuRadioGroup>
        <DropdownMenuSub><DropdownMenuSubTrigger>Más</DropdownMenuSubTrigger><DropdownMenuSubContent><DropdownMenuItem>Duplicar</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const PopoversAndTooltips: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex items-center gap-6">
        <Popover><PopoverAnchor /><PopoverTrigger asChild><Button variant="outline">Abrir popover</Button></PopoverTrigger><PopoverContent>Contenido contextual</PopoverContent></Popover>
        <Tooltip><TooltipTrigger asChild><Button variant="ghost">Ayuda</Button></TooltipTrigger><TooltipContent>Información adicional</TooltipContent></Tooltip>
        <HelpTooltip text="Ayuda rápida" />
      </div>
    </TooltipProvider>
  ),
};

export const SideSheet: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild><Button>Abrir panel</Button></SheetTrigger>
      <SheetContent>
        <SheetHeader><SheetTitle>Filtros</SheetTitle><SheetDescription>Refina los resultados.</SheetDescription></SheetHeader>
        <div className="py-6">Opciones del panel</div>
        <SheetFooter><SheetClose asChild><Button>Aplicar</Button></SheetClose></SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

export const ControlledModal: Story = {
  render: () => <Modal title="Modal" description="Componente controlado" isOpen onClose={() => undefined}><p>Contenido reutilizable</p></Modal>,
};
