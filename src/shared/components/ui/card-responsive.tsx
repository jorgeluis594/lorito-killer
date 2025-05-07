import {flexRender, Table} from "@tanstack/react-table";

interface CardResponsiveProps<TData> {
   table:  Table<TData>;
}

export default function CardResponsive<TData>({table}:CardResponsiveProps<TData>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
      {table.getRowModel().rows.map((row) => (
        <div
          key={row.id}
          className="bg-white space-y-3 p-4 rounded-lg shadow relative w-full max-w-sm"
        >
          {row.getVisibleCells().map((cell, index, arr) => {
            const isLast = index === arr.length - 1;

            return (
              <div
                key={cell.id}
                className={`py-2 px-4 space-y-1 ${isLast ? 'absolute top-4 right-4 text-right w-fit max-w-[90%]' : ''}`}
              >
                {!isLast && (
                  <p className="text-xs text-gray-500 font-medium">
                    {typeof cell.column.columnDef.header === 'string'
                      ? cell.column.columnDef.header
                      : ''}
                  </p>
                )}
                <p className="text-sm text-gray-900 font-semibold">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </p>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
