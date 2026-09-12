import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { mocked } from "storybook/test";
import { ChevronRight } from "lucide-react";
import { TableConfigForm } from "./table-config-form";
import { createTablesAction, deleteTableAction } from "../actions";
import type { TableConfiguration } from "../types";

const configured: TableConfiguration = {
  tables: Array.from({ length: 12 }, (_, index) => ({
    id: String(index + 1),
    number: index + 1,
    label: null,
    inService: false,
  })),
  nextNumber: 13,
};

function Example({
  initial,
  fail = false,
}: {
  initial: TableConfiguration;
  fail?: boolean;
}) {
  const [configuration, setConfiguration] = useState(initial);
  useEffect(() => {
    mocked(createTablesAction).mockImplementation(
      async ({ quantity, startNumber }) => {
        await new Promise((resolve) => setTimeout(resolve, 350));
        if (fail)
          return {
            success: false,
            message:
              "Las mesas cambiaron. Actualiza la página y revisa la nueva numeración antes de agregar.",
          };
        setConfiguration((current) => ({
          nextNumber: startNumber + quantity,
          tables: [
            ...current.tables,
            ...Array.from({ length: quantity }, (_, index) => ({
              id: String(startNumber + index),
              number: startNumber + index,
              label: null,
              inService: false,
            })),
          ],
        }));
        return {
          success: true,
          data: {
            firstNumber: startNumber,
            lastNumber: startNumber + quantity - 1,
          },
        };
      },
    );
    mocked(deleteTableAction).mockImplementation(async (id) => {
      if (fail)
        return {
          success: false,
          message: "La mesa está en atención. No se puede retirar.",
        };
      setConfiguration((current) => ({
        ...current,
        tables: current.tables.filter((table) => table.id !== id),
      }));
      return { success: true, data: undefined };
    });
  }, [fail]);
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="flex h-[70px] items-center justify-between border-b px-6">
        <span className="text-xl font-bold">Lorito Killer</span>
        <span className="text-sm text-muted-foreground">Vista de prueba</span>
      </div>
      <div className="flex">
        <aside className="hidden min-h-[calc(100vh-70px)] w-72 shrink-0 border-r p-4 lg:block">
          <p className="px-3 py-4 text-lg font-bold">Administrador</p>
          {[
            "Dashboard",
            "Nueva venta",
            "Ventas",
            "Caja chica",
            "Productos",
            "Mesas",
            "Movimientos de stock",
          ].map((item) => (
            <div
              key={item}
              className={
                item === "Mesas"
                  ? "my-2 rounded-lg bg-secondary px-3 py-3"
                  : "my-2 px-3 py-3 text-muted-foreground"
              }
            >
              {item}
            </div>
          ))}
        </aside>
        <main className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col gap-8 p-4 pt-6 md:p-8">
            <nav
              aria-label="Ruta de navegación"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <span>Mesas</span>
              <ChevronRight className="size-4" />
              <span>Configurar mesas</span>
            </nav>
            <TableConfigForm configuration={configuration} canDelete />
          </div>
        </main>
      </div>
    </div>
  );
}

const meta = {
  title: "Restaurant/Configuración de mesas",
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const PrimeraConfiguracion: Story = {
  render: () => <Example initial={{ tables: [], nextNumber: 1 }} />,
};
export const MesasConfiguradas: Story = {
  render: () => <Example initial={configured} />,
};
export const MesaEnAtencion: Story = {
  render: () => (
    <Example
      initial={{
        ...configured,
        tables: configured.tables.map((table, index) => ({
          ...table,
          inService: index === 0,
        })),
      }}
    />
  ),
};
export const ErrorAlGuardar: Story = {
  render: () => <Example initial={configured} fail />,
};
