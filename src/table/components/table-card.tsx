"use client";

import { cn } from "@/lib/utils";
import { Users, Clock, User, Loader2 } from "lucide-react";
import type { TableWithSession } from "../types";
import { getTableDerivedStatus } from "../types";
import {
  TABLE_STATUS_STRIPE,
  TABLE_STATUS_BG_LIGHT,
  TABLE_STATUS_LABELS,
  TABLE_STATUS_TEXT_COLORS,
  getTimeUrgencyClass,
} from "../constants";
import { differenceInMinutes } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface TableCardProps {
  table: TableWithSession;
  onClick?: (table: TableWithSession) => void;
  isOpening?: boolean;
}

export function TableCard({ table, onClick, isOpening }: TableCardProps) {
  const status = getTableDerivedStatus(table);
  const session = table.activeSession;

  const elapsedMinutes = session
    ? differenceInMinutes(new Date(), new Date(session.openedAt))
    : 0;

  return (
    <button
      onClick={() => onClick?.(table)}
      disabled={isOpening}
      aria-label={`Mesa ${table.label || table.number}, ${TABLE_STATUS_LABELS[status]}`}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border border-border border-t-4 p-4 transition-all hover:shadow-md active:scale-[0.97] min-h-[140px] w-full select-none",
        TABLE_STATUS_STRIPE[status],
        TABLE_STATUS_BG_LIGHT[status],
        isOpening && "opacity-60 pointer-events-none",
      )}
    >
      <div className="text-3xl font-bold text-foreground">
        {table.label || table.number}
      </div>
      {table.label && (
        <div className="text-xs text-muted-foreground">Mesa {table.number}</div>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        {isOpening ? (
          <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
        ) : (
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              status === "AVAILABLE" && "bg-emerald-500 motion-safe:animate-pulse",
              status === "OCCUPIED" && "bg-red-500",
              status === "BILL_REQUESTED" && "bg-amber-500 motion-safe:animate-pulse",
            )}
          />
        )}
        <span
          className={cn(
            "text-sm font-semibold uppercase tracking-wide",
            TABLE_STATUS_TEXT_COLORS[status],
          )}
        >
          {isOpening ? "Abriendo..." : TABLE_STATUS_LABELS[status]}
        </span>
      </div>

      {session && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3 shrink-0" />
          <span className={cn(getTimeUrgencyClass(elapsedMinutes))}>
            {formatDistanceToNow(new Date(session.openedAt), {
              locale: es,
              addSuffix: false,
            })}
          </span>
        </div>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {session?.waiter?.name && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[80px]">{session.waiter.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 shrink-0" />
          <span>{table.capacity}</span>
        </div>
        {/* Round count badge for occupied tables */}
        {session && session.currentRound > 0 && (
          <span className="text-xs font-medium bg-muted rounded-full px-1.5">
            R{session.currentRound}
          </span>
        )}
      </div>
    </button>
  );
}
