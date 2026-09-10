import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SlidersHorizontal } from "lucide-react";
import { FilterBar } from "./filter-bar";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const mobileViewports = {
  mobile390: {
    name: "Mobile 390",
    styles: { width: "390px", height: "844px" },
    type: "mobile",
  },
  mobile320: {
    name: "Mobile 320",
    styles: { width: "320px", height: "568px" },
    type: "mobile",
  },
};

const meta = {
  title: "Layout/FilterBar",
  component: FilterBar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FilterBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const QuickFiltersOnly: Story = {
  render: () => (
    <FilterBar>
      <FilterBar.QuickFilters>
        <ToggleGroup
          type="single"
          defaultValue="all"
          aria-label="Estado"
          className="flex-wrap justify-start"
        >
          <ToggleGroupItem value="all">Todos</ToggleGroupItem>
          <ToggleGroupItem value="active">Activos</ToggleGroupItem>
          <ToggleGroupItem value="archived">Archivados</ToggleGroupItem>
        </ToggleGroup>
      </FilterBar.QuickFilters>
    </FilterBar>
  ),
};

export const MobileQuickFilters: Story = {
  globals: { viewport: "mobile390" },
  parameters: { viewport: { options: mobileViewports } },
  render: () => (
    <FilterBar>
      <FilterBar.QuickFilters>
        <ToggleGroup
          type="single"
          defaultValue="all"
          aria-label="Estado"
          className="flex-wrap justify-start"
        >
          <ToggleGroupItem value="all">Todos</ToggleGroupItem>
          <ToggleGroupItem value="active">Activos</ToggleGroupItem>
          <ToggleGroupItem value="archived">Archivados</ToggleGroupItem>
        </ToggleGroup>
      </FilterBar.QuickFilters>
    </FilterBar>
  ),
};

export const MobileWithSearchAndTrigger: Story = {
  globals: { viewport: "mobile390" },
  parameters: { viewport: { options: mobileViewports } },
  render: () => (
    <FilterBar
      role="group"
      aria-label="Filtros de productos"
      control={
        <Input aria-label="Buscar productos" placeholder="Buscar productos…" />
      }
      action={
        <FilterBar.FilterTrigger>
          <SlidersHorizontal aria-hidden="true" />
          Filtros
        </FilterBar.FilterTrigger>
      }
    />
  ),
};

export const WithInput: Story = {
  render: () => (
    <FilterBar
      control={
        <Input aria-label="Buscar productos" placeholder="Buscar productos…" />
      }
      action={<FilterBar.FilterTrigger>Filtros</FilterBar.FilterTrigger>}
    />
  ),
};

export const WithSelect: Story = {
  render: () => (
    <FilterBar
      control={
        <Select defaultValue="all">
          <SelectTrigger aria-label="Categoría">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            <SelectItem value="food">Comida</SelectItem>
          </SelectContent>
        </Select>
      }
      action={<FilterBar.FilterTrigger>Filtros</FilterBar.FilterTrigger>}
    />
  ),
};

export const MobileManyFilters: Story = {
  globals: { viewport: "mobile320" },
  parameters: { viewport: { options: mobileViewports } },
  render: () => (
    <FilterBar>
      <FilterBar.QuickFilters>
        <ToggleGroup
          type="single"
          defaultValue="all"
          aria-label="Disponibilidad"
          className="flex-wrap justify-start"
        >
          {["Todos", "Disponibles", "Agotados", "Ocultos", "Promociones"].map(
            (label) => (
              <ToggleGroupItem key={label} value={label.toLowerCase()}>
                {label}
              </ToggleGroupItem>
            ),
          )}
        </ToggleGroup>
      </FilterBar.QuickFilters>
    </FilterBar>
  ),
};
