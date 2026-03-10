"use client";

import { cn } from "@/lib/utils";
import type { TableDerivedStatus } from "../types";
import {
  TABLE_STATUS_COLORS,
  TABLE_STATUS_LABELS,
} from "../constants";

export function TableStatusBadge({ status }: { status: TableDerivedStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white",
        TABLE_STATUS_COLORS[status],
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full bg-white",
          status === "AVAILABLE" && "animate-pulse",
        )}
      />
      {TABLE_STATUS_LABELS[status]}
    </span>
  );
}
