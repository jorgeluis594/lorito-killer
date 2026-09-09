import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterBar } from "./filter-bar";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

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
