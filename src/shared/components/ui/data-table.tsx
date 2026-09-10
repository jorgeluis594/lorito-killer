import * as React from "react";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

export type TableColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
};

type TableLayoutProps<T> = {
  columns: readonly TableColumn<T>[];
  caption: string;
  className?: string;
};

type TableContentProps<T> = TableLayoutProps<T> & {
  data: readonly T[];
  getRowId: (row: T) => string;
  emptyMessage?: string;
  isLoading?: boolean;
  skeletonRows?: number;
};

export type DataTableProps<T> = Omit<TableContentProps<T>, "data"> &
  (
    | { data: readonly T[]; loadData?: never }
    | { data?: never; loadData: () => Promise<readonly T[]> }
  );

const alignment = {
  left: "text-left",
  center: "text-center",
  right: "text-right tabular-nums",
};

function TableLayout<T>({
  columns,
  caption,
  children,
  className,
  isLoading = false,
}: TableLayoutProps<T> & { children: React.ReactNode; isLoading?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
      {isLoading && (
        <span role="status" className="sr-only">
          Cargando {caption}…
        </span>
      )}
      <Table role="table" aria-busy={isLoading} className="min-w-[40rem]">
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader role="rowgroup">
          <TableRow role="row">
            {columns.map((column) => (
              <TableHead
                key={column.id}
                scope="col"
                role="columnheader"
                className={alignment[column.align ?? "left"]}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody role="rowgroup">{children}</TableBody>
      </Table>
    </div>
  );
}

export function DataTableSkeleton<T>({
  columns,
  caption,
  className,
  rows = 5,
}: TableLayoutProps<T> & { rows?: number }) {
  return (
    <TableLayout
      columns={columns}
      caption={caption}
      className={className}
      isLoading
    >
      {Array.from({ length: rows }, (_, index) => (
        <TableRow key={index} role="row" aria-hidden="true">
          {columns.map((column) => (
            <TableCell key={column.id} role="cell" data-column={column.id}>
              <Skeleton className="h-5 w-full min-w-12" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableLayout>
  );
}

function TableContent<T>({
  data,
  columns,
  caption,
  getRowId,
  className,
  emptyMessage = "Sin resultados.",
}: TableContentProps<T>) {
  return (
    <TableLayout columns={columns} caption={caption} className={className}>
      {data.length ? (
        data.map((row) => (
          <TableRow key={getRowId(row)} role="row">
            {columns.map((column) => (
              <TableCell
                key={column.id}
                role="cell"
                data-column={column.id}
                className={alignment[column.align ?? "left"]}
              >
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow role="row">
          <TableCell
            role="cell"
            colSpan={columns.length}
            className="h-32 text-center text-muted-foreground"
          >
            {emptyMessage}
          </TableCell>
        </TableRow>
      )}
    </TableLayout>
  );
}

function PendingTable<T>({
  promise,
  ...props
}: Omit<TableContentProps<T>, "data"> & { promise: Promise<readonly T[]> }) {
  const data = React.use(promise);
  return <TableContent {...props} data={data} />;
}

/** Pass loadData from a Server Component; keep database queries on the server. */
export function DataTable<T>({
  data,
  loadData,
  isLoading,
  skeletonRows = 5,
  ...props
}: DataTableProps<T>) {
  const skeleton = <DataTableSkeleton {...props} rows={skeletonRows} />;
  if (isLoading) return skeleton;
  if (loadData) {
    // Read the promise below Suspense; retries reuse it instead of querying again.
    const promise = loadData();
    return (
      <React.Suspense fallback={skeleton}>
        <PendingTable {...props} promise={promise} />
      </React.Suspense>
    );
  }
  return <TableContent {...props} data={data} />;
}
