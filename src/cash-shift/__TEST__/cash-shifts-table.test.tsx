import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { CashShiftWithOutOrders } from "@/cash-shift/types";

const testContext = vi.hoisted(() => ({ page: "1" }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/cash_shifts",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(`page=${testContext.page}`),
}));
vi.mock("@/cash-shift/components/data-table/columns", () => ({ columns: [] }));
vi.mock("@/shared/components/ui/data-table", () => ({
  DataTable: ({ data }: { data: unknown[] }) => <div>Filas: {data.length}</div>,
}));

import CashShiftClientTable from "@/cash-shift/components/data-table/client";

const rows = (length: number) =>
  Array.from({ length }, (_, index) => ({
    id: `cash-shift-${index}`,
  })) as CashShiftWithOutOrders[];

function renderTable(data: CashShiftWithOutOrders[], pageCount: number) {
  return new Promise<string>((resolve, reject) => {
    let html = "";
    const output = new PassThrough();
    output.on("data", (chunk) => (html += chunk.toString()));
    output.on("end", () => resolve(html.replaceAll("<!-- -->", "")));
    output.on("error", reject);
    const stream = renderToPipeableStream(
      <CashShiftClientTable
        cashShiftsPromise={Promise.resolve({ data, pageCount })}
      />,
      {
        onAllReady: () => stream.pipe(output),
        onError: reject,
      },
    );
  });
}

describe("cash shift table pagination", () => {
  beforeEach(() => {
    testContext.page = "1";
  });

  test.for([0, 10])("hides controls with %i cash shifts", async (count) => {
    const html = await renderTable(rows(count), 1);

    expect(html).not.toContain("Página 1 de 1");
    expect(html).not.toContain("Página anterior");
  });

  test("shows two pages and disables the correct button for 11 cash shifts", async () => {
    const firstPage = await renderTable(rows(10), 2);
    expect(firstPage).toContain("10 cajas en esta página");
    expect(firstPage).toContain("Página 1 de 2");
    expect(firstPage).toMatch(/aria-label="Página anterior"[^>]*disabled/);
    expect(firstPage).not.toMatch(/aria-label="Página siguiente"[^>]*disabled/);

    testContext.page = "2";
    const secondPage = await renderTable(rows(1), 2);
    expect(secondPage).toContain("1 caja en esta página");
    expect(secondPage).toContain("Página 2 de 2");
    expect(secondPage).not.toMatch(/aria-label="Página anterior"[^>]*disabled/);
    expect(secondPage).toMatch(/aria-label="Página siguiente"[^>]*disabled/);
  });
});
