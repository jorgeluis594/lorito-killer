import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DataTable, DataTableSkeleton, type TableColumn } from "./data-table";
import { Badge } from "./badge";
import { Button } from "./button";
import { MoreVertical } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { expect, userEvent, within } from "storybook/test";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
};
const products: Product[] = [
  {
    id: "1",
    name: "Lomo saltado",
    category: "Platos de fondo",
    price: 32,
    available: true,
  },
  {
    id: "2",
    name: "Chicha morada",
    category: "Bebidas",
    price: 8,
    available: true,
  },
  {
    id: "3",
    name: "Suspiro a la limeña",
    category: "Postres",
    price: 14,
    available: false,
  },
  {
    id: "4",
    name: "Arroz con mariscos y salsa criolla de la casa",
    category: "Platos de fondo",
    price: 42.5,
    available: true,
  },
];
const currency = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});
const columns: TableColumn<Product>[] = [
  { id: "name", header: "Producto", cell: (row) => row.name },
  { id: "category", header: "Categoría", cell: (row) => row.category },
  {
    id: "status",
    header: "Disponibilidad",
    cell: (row) => (
      <Badge variant={row.available ? "secondary" : "outline"}>
        {row.available ? "Disponible" : "Agotado"}
      </Badge>
    ),
  },
  {
    id: "price",
    header: "Precio",
    cell: (row) => currency.format(row.price),
    align: "right",
  },
];
const props = {
  columns,
  caption: "Productos de la carta",
  getRowId: (row: Product) => row.id,
};

const meta = {
  title: "UI/DataTable",
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="mx-auto w-full max-w-5xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {
  name: "Con datos",
  render: () => <DataTable {...props} data={products} />,
};
export const Empty: Story = {
  name: "Sin resultados",
  render: () => (
    <DataTable
      {...props}
      data={[]}
      emptyMessage="No hay productos que coincidan con tu búsqueda."
    />
  ),
};
export const Skeleton: Story = {
  render: () => (
    <DataTableSkeleton columns={columns} caption={props.caption} rows={4} />
  ),
};
export const ControlledLoading: Story = {
  name: "Carga controlada",
  render: () => (
    <DataTable {...props} data={products} isLoading skeletonRows={4} />
  ),
};
export const Mobile: Story = {
  name: "Móvil",
  render: () => (
    <div className="max-w-[375px]">
      <DataTable {...props} data={products} />
    </div>
  ),
};
export const Dark: Story = {
  name: "Tema oscuro",
  render: () => (
    <div className="dark bg-background p-4">
      <DataTable {...props} data={products} />
    </div>
  ),
};

function SuspenseExample() {
  const [request, setRequest] = React.useState(0);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button
          variant="outline"
          onClick={() => setRequest((value) => value + 1)}
        >
          Volver a cargar
        </Button>
      </div>
      <DataTable
        key={request}
        {...props}
        skeletonRows={4}
        loadData={() =>
          new Promise<Product[]>((resolve) =>
            setTimeout(() => resolve(products), 1800),
          )
        }
      />
    </div>
  );
}
export const SuspenseLoading: Story = {
  name: "Suspense automático",
  render: () => <SuspenseExample />,
};

function ActionsExample() {
  const [selected, setSelected] = React.useState<string>();
  const actionColumns: TableColumn<Product>[] = [
    ...columns,
    {
      id: "actions",
      header: "Acciones",
      align: "right",
      cell: (row) => (
        <Button
          variant="ghost"
          aria-label={`Ver ${row.name}`}
          onClick={() => setSelected(row.name)}
        >
          Ver
        </Button>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <DataTable {...props} columns={actionColumns} data={products} />
      <p role="status" className="text-sm text-muted-foreground">
        {selected
          ? `Producto seleccionado: ${selected}`
          : "Selecciona un producto para ver su nombre."}
      </p>
    </div>
  );
}
export const Actions: Story = {
  name: "Acciones por fila",
  render: () => <ActionsExample />,
};

// Storybook trial: product-specific composition, pending adoption in DataTable's API.
function ProductsListTrial({ mobileOnly = false, loading = false }) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("Todas");
  const [sort, setSort] = React.useState("name");
  const [items, setItems] = React.useState(products);
  const [selected, setSelected] = React.useState<Product>();
  const detailTrigger = React.useRef<HTMLElement | null>(null);
  const visible = items
    .filter(
      (product) =>
        product.name
          .toLocaleLowerCase("es-PE")
          .includes(query.trim().toLocaleLowerCase("es-PE")) &&
        (category === "Todas" || product.category === category),
    )
    .sort((a, b) =>
      sort === "price"
        ? a.price - b.price
        : a.name.localeCompare(b.name, "es-PE"),
    );

  function showDetail(product: Product) {
    detailTrigger.current = document.activeElement as HTMLElement;
    setSelected(product);
  }

  function actions(product: Product) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Acciones de ${product.name}`}
          >
            <MoreVertical aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="min-h-11"
              onSelect={() =>
                setItems((current) =>
                  current.map((item) =>
                    item.id === product.id
                      ? { ...item, available: !item.available }
                      : item,
                  ),
                )
              }
            >
              {product.available
                ? "Marcar como agotado"
                : "Marcar como disponible"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const responsiveColumns: TableColumn<Product>[] = [
    {
      ...columns[0],
      cell: (row) => (
        <button
          className="min-h-11 text-left hover:underline"
          onClick={() => showDetail(row)}
        >
          {row.name}
        </button>
      ),
    },
    columns[1],
    {
      ...columns[2],
      cell: (row) => (
        <Badge
          data-available={row.available}
          variant={row.available ? "secondary" : "outline"}
        >
          {row.available ? "Disponible" : "Agotado"}
        </Badge>
      ),
    },
    columns[3],
    {
      id: "actions",
      header: <span className="sr-only">Acciones</span>,
      cell: actions,
      align: "right",
    },
  ];

  return (
    <section
      aria-label="Prueba de lista de productos"
      className={cn(
        "product-table-trial flex flex-col gap-5 text-foreground",
        mobileOnly && "mx-auto max-w-[390px]",
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight">Productos</h2>
        <span role="status" className="text-sm text-muted-foreground">
          {loading
            ? "Cargando…"
            : `${visible.length} ${visible.length === 1 ? "producto" : "productos"}`}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-2 text-sm">
          Buscar producto
          <Input
            type="search"
            placeholder="Nombre del producto"
            value={query}
            disabled={loading}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading}>
                Categoría: {category}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Categoría</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={category}
                  onValueChange={setCategory}
                >
                  {["Todas", "Platos de fondo", "Bebidas", "Postres"].map(
                    (value) => (
                      <DropdownMenuRadioItem
                        key={value}
                        value={value}
                        className="min-h-11"
                      >
                        {value}
                      </DropdownMenuRadioItem>
                    ),
                  )}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" disabled={loading}>
                Orden: {sort === "name" ? "Nombre" : "Precio"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                  <DropdownMenuRadioItem value="name" className="min-h-11">
                    Nombre: A–Z
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="price" className="min-h-11">
                    Precio: menor a mayor
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {!loading && visible.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-y py-8">
          <p className="font-bold">No encontramos productos</p>
          <p className="text-sm text-muted-foreground">
            Prueba con otro nombre o elimina el filtro de categoría.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setCategory("Todas");
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <DataTable
          {...props}
          className="product-table-layout"
          columns={responsiveColumns}
          data={visible}
          isLoading={loading}
          skeletonRows={4}
        />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(undefined);
        }}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            detailTrigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle className="pr-6">{selected?.name}</DialogTitle>
            <DialogDescription>
              Detalle del producto de demostración.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <dt className="text-muted-foreground">Categoría</dt>
              <dd>{selected.category}</dd>
              <dt className="text-muted-foreground">Precio</dt>
              <dd className="tabular-nums">
                {currency.format(selected.price)}
              </dd>
              <dt className="text-muted-foreground">Disponibilidad</dt>
              <dd>{selected.available ? "Disponible" : "Agotado"}</dd>
            </dl>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Volver a productos</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export const ResponsiveProducts: Story = {
  name: "Prueba · Productos adaptables",
  render: () => <ProductsListTrial />,
};
export const MobileList: Story = {
  name: "Prueba · Lista móvil",
  render: () => <ProductsListTrial mobileOnly />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelectorAll("table")).toHaveLength(1);
    await expect(canvasElement.querySelectorAll("tbody > tr")).toHaveLength(4);
    await expect(
      canvasElement.querySelectorAll('button[aria-label^="Acciones de"]'),
    ).toHaveLength(4);
    const search = canvas.getByRole("searchbox", { name: "Buscar producto" });
    await userEvent.type(search, "chicha");
    await expect(canvasElement.querySelectorAll("tbody > tr")).toHaveLength(1);
    await userEvent.clear(search);
    await userEvent.type(search, "inexistente");
    await expect(canvas.getByText("No encontramos productos")).toBeVisible();
    await userEvent.click(
      canvas.getByRole("button", { name: "Limpiar filtros" }),
    );
    await expect(canvasElement.querySelectorAll("tbody > tr")).toHaveLength(4);
  },
};
export const MobileListLoading: Story = {
  name: "Prueba · Lista móvil cargando",
  render: () => <ProductsListTrial mobileOnly loading />,
};
