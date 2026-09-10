import * as React from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream, renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import {
  DataTable,
  DataTableSkeleton,
  type DataTableProps,
} from "../components/ui/data-table";

type Row = { id: string; name: string };
const props = {
  caption: "Productos",
  columns: [{ id: "name", header: "Producto", cell: (row: Row) => row.name }],
  getRowId: (row: Row) => row.id,
};

test("renders data, an empty message and accessible loading without stale rows", () => {
  const data = [{ id: "1", name: "Lomo saltado" }];
  expect(renderToStaticMarkup(<DataTable {...props} data={data} />)).toContain(
    "Lomo saltado",
  );
  expect(renderToStaticMarkup(<DataTable {...props} data={[]} />)).toContain(
    "Sin resultados.",
  );
  const loading = renderToStaticMarkup(
    <DataTable {...props} data={data} isLoading skeletonRows={3} />,
  );
  expect(loading).not.toContain("Lomo saltado");
  expect(loading).toContain('aria-busy="true"');
  expect(loading.match(/aria-hidden="true"/g)).toHaveLength(3);
  expect(loading).toBe(
    renderToStaticMarkup(<DataTableSkeleton {...props} rows={3} />),
  );
});

test("streams the skeleton before resolving data and calls the loader only once", async () => {
  let resolve!: (rows: Row[]) => void;
  const loadData = vi.fn(
    () =>
      new Promise<Row[]>((done) => {
        resolve = done;
      }),
  );
  let html = "";
  const output = new PassThrough();
  output.on("data", (chunk) => {
    html += chunk.toString();
  });
  const finished = new Promise<void>((done, reject) => {
    output.on("end", done);
    output.on("error", reject);
  });
  await new Promise<void>((done, reject) => {
    const stream = renderToPipeableStream(
      <main>
        <DataTable {...props} loadData={loadData} />
      </main>,
      {
        onShellReady() {
          output.once("data", () => done());
          stream.pipe(output);
        },
        onError: reject,
      },
    );
  });
  expect(html.replaceAll("<!-- -->", "")).toContain("Cargando Productos");
  expect(html).not.toContain("Lomo saltado");
  resolve([{ id: "1", name: "Lomo saltado" }]);
  await finished;
  expect(html).toContain("Lomo saltado");
  expect(loadData).toHaveBeenCalledTimes(1);
});

// The API must reject ambiguous sources at compile time.
// @ts-expect-error data and loadData are mutually exclusive
const invalid: DataTableProps<Row> = {
  ...props,
  data: [],
  loadData: async () => [],
};
void invalid;

test("renders each cell once and forwards the same layout to loading", () => {
  const cell = vi.fn((row: Row) => row.name);
  const html = renderToStaticMarkup(
    <DataTable
      {...props}
      className="product-table-layout"
      columns={[{ id: "name", header: "Producto", cell }]}
      data={[{ id: "1", name: "Lomo saltado" }]}
    />,
  );
  expect(cell).toHaveBeenCalledTimes(1);
  expect(html.match(/<table\b/g)).toHaveLength(1);
  expect(html.match(/data-column="name"/g)).toHaveLength(1);
  const loading = renderToStaticMarkup(
    <DataTable
      {...props}
      className="product-table-layout"
      data={[]}
      isLoading
    />,
  );
  expect(loading).toContain("product-table-layout");
  expect(loading.match(/<table\b/g)).toHaveLength(1);
});
