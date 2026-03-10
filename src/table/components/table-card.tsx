"use client";

import { cn } from "@/lib/utils";
import { Users, Clock, User } from "lucide-react";
import type { TableWithSession } from "../types";
import { getTableDerivedStatus } from "../types";
import {
  TABLE_STATUS_BORDER_COLORS,
  TABLE_STATUS_BG_LIGHT,
  TABLE_STATUS_LABELS,
} from "../constants";
import { TableStatusBadge } from "./table-status-badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface TableCardProps {
  table: TableWithSession;
  onClick?: (table: TableWithSession) => void;
}

export function TableCard({ table, onClick }: TableCardProps) {
  const status = getTableDerivedStatus(table);
  const session = table.activeSession;

  return (
    <button
      onClick={() => onClick?.(table)}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all hover:shadow-md active:scale-95 min-h-[140px] w-full",
        TABLE_STATUS_BORDER_COLORS[status],
        TABLE_STATUS_BG_LIGHT[status],
      )}
    >
      <div className="text-2xl font-bold text-gray-800">
        {table.label || table.number}
      </div>
      {table.label && (
        <div className="text-xs text-gray-500">Mesa {table.number}</div>
      )}

      <div className="mt-2">
        <TableStatusBadge status={status} />
      </div>

      <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
        <Users className="h-3 w-3" />
        <span>{table.capacity}</span>
      </div>

      {session && (
        <div className="mt-1 space-y-0.5 text-center">
          {session.waiter?.name && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[100px]">{session.waiter.name}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(session.openedAt), {
                locale: es,
                addSuffix: false,
              })}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
