import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ReactNode } from "react";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "./page-header";
import { FilterBar } from "./filter-bar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Badge } from "./badge";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "./sheet";

const meta = {
  title: "Layout/PageHeader",
  component: PageHeader,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <main className="mx-auto w-full max-w-screen-xl p-[clamp(1rem,4vw,3rem)]">
        <Story />
      </main>
    ),
  ],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Minimal: Story = {
  render: () => (
    <PageHeader>
      <PageHeader.Title>Resumen</PageHeader.Title>
    </PageHeader>
  ),
};

export const WithActions: Story = {
  render: function WithActions() {
    const [message, setMessage] = useState("");
    return (
      <>
        <FilterExample
          overlay="drawer"
          header={
            <PageHeader>
              <PageHeader.Navigation aria-label="Ruta de navegación">
                <a href="#inicio" className="hover:underline">
                  Inicio
                </a>
                <ChevronRight aria-hidden="true" className="size-4" />
                <span aria-current="page">Biblioteca</span>
              </PageHeader.Navigation>
              <PageHeader.Main>
                <PageHeader.Heading>
                  <PageHeader.Title>
                    Biblioteca{" "}
                    <span className="text-base font-normal tabular-nums text-muted-foreground">
                      24
                    </span>
                  </PageHeader.Title>
                  <PageHeader.Description>
                    Documentos compartidos con tu equipo.
                  </PageHeader.Description>
                </PageHeader.Heading>
                <PageHeader.Actions>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setMessage("Exportación de ejemplo solicitada.")
                    }
                  >
                    Exportar
                  </Button>
                  <Button
                    onClick={() =>
                      setMessage("Creación de ejemplo solicitada.")
                    }
                  >
                    Crear documento
                  </Button>
                </PageHeader.Actions>
              </PageHeader.Main>
            </PageHeader>
          }
        />
        <p role="status" className="mt-6 text-sm text-muted-foreground">
          {message}
        </p>
      </>
    );
  },
};

const documents = [
  { name: "Carta de temporada", status: "Activos", author: "Ana" },
  { name: "Manual de atención", status: "Activos", author: "Luis" },
  { name: "Inventario anterior", status: "Archivados", author: "Ana" },
];

function FilterExample({
  overlay,
  header,
}: {
  overlay: "modal" | "drawer";
  header?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("Todos");
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("");
  const results = documents.filter(
    (document) =>
      (status === "Todos" || document.status === status) &&
      document.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      document.author.toLocaleLowerCase().includes(author.toLocaleLowerCase()),
  );
  const Overlay = overlay === "modal" ? Dialog : Sheet;
  const Trigger = overlay === "modal" ? DialogTrigger : SheetTrigger;
  const Content = overlay === "modal" ? DialogContent : SheetContent;
  const Title = overlay === "modal" ? DialogTitle : SheetTitle;
  const Description =
    overlay === "modal" ? DialogDescription : SheetDescription;

  return (
    <Overlay open={open} onOpenChange={setOpen}>
      <div className="flex min-w-0 flex-col gap-8">
        {header ?? (
          <PageHeader>
            <PageHeader.Main>
              <PageHeader.Heading>
                <PageHeader.Title>Documentos</PageHeader.Title>
                <PageHeader.Description>
                  Encuentra los documentos por nombre, estado o autor.
                </PageHeader.Description>
              </PageHeader.Heading>
            </PageHeader.Main>
          </PageHeader>
        )}
        <FilterBar
          role="group"
          aria-label="Filtros del listado"
          control={
            <Input
              aria-label="Buscar documentos"
              placeholder="Buscar por nombre…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          }
          action={
            <Trigger asChild>
              <FilterBar.FilterTrigger onClick={() => setOpen(true)}>
                <SlidersHorizontal aria-hidden="true" className="size-4" />{" "}
                Filtros
              </FilterBar.FilterTrigger>
            </Trigger>
          }
        >
          <FilterBar.QuickFilters>
            <ToggleGroup
              type="single"
              value={status}
              onValueChange={(value) => {
                if (value) setStatus(value);
              }}
              aria-label="Estado"
              className="flex-wrap justify-start"
            >
              {["Todos", "Activos", "Archivados"].map((value) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="h-auto min-h-11 py-2"
                >
                  {value}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </FilterBar.QuickFilters>
        </FilterBar>
        <section
          aria-label="Listado de documentos"
          className="min-w-0 overflow-hidden rounded-lg border-[0.0625rem] border-border bg-card"
        >
          <Table aria-label="Documentos de ejemplo">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead scope="col">Nombre</TableHead>
                <TableHead scope="col">Estado</TableHead>
                <TableHead scope="col">Autor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((document) => (
                <TableRow key={document.name}>
                  <TableCell className="py-4 font-medium">
                    {document.name}
                  </TableCell>
                  <TableCell>{document.status}</TableCell>
                  <TableCell>{document.author}</TableCell>
                </TableRow>
              ))}
              {results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center">
                    No hay documentos que coincidan con los filtros.{" "}
                    <Button
                      variant="link"
                      onClick={() => {
                        setStatus("Todos");
                        setQuery("");
                        setAuthor("");
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </div>
      <p role="status" className="sr-only">
        Estado: {status} · Nombre: {query || "Cualquiera"} · Autor:{" "}
        {author || "Cualquiera"}
      </p>
      <Content className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Title>Filtros</Title>
          <Description>
            Combina estos criterios con los filtros rápidos.
          </Description>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-author">Autor</Label>
          <Input
            id="filter-author"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
          />
        </div>
        <Button onClick={() => setOpen(false)}>Ver resultados</Button>
      </Content>
    </Overlay>
  );
}

export const FiltersWithModal: Story = {
  render: () => <FilterExample overlay="modal" />,
};
export const FiltersWithDrawer: Story = {
  render: () => <FilterExample overlay="drawer" />,
};

export const InPage: Story = {
  name: "En contexto: header, filtros y tabla",
  render: () => <FilterExample overlay="drawer" />,
};

export const LongContent: Story = {
  render: () => (
    <PageHeader>
      <PageHeader.Navigation aria-label="Regresar">
        <a href="#reportes" className="hover:underline">
          Volver a reportes
        </a>
      </PageHeader.Navigation>
      <PageHeader.Main>
        <PageHeader.Heading>
          <PageHeader.Title>
            Reporte consolidado de actividad de todas las sedes{" "}
            <Badge variant="secondary">Borrador</Badge>
          </PageHeader.Title>
          <PageHeader.Description>
            Revisa la actividad del periodo seleccionado antes de compartir los
            resultados con el equipo.
          </PageHeader.Description>
        </PageHeader.Heading>
        <PageHeader.Actions>
          <Button variant="ghost" asChild>
            <a href="#vista-previa">Vista previa</a>
          </Button>
          <Button disabled>Publicar reporte consolidado</Button>
        </PageHeader.Actions>
      </PageHeader.Main>
    </PageHeader>
  ),
};

export const NarrowContainer: Story = {
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
  render: () => <FilterExample overlay="drawer" />,
};
