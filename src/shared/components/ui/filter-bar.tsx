import type { ComponentProps, ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type FilterBarProps = ComponentProps<"div"> & {
  control?: ReactElement;
  action?: ReactNode;
};

function Root({
  control,
  action,
  children,
  className,
  ...props
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-6 gap-y-4 rounded-lg border-[0.0625rem] border-border bg-card p-5 text-card-foreground",
        className,
      )}
      {...props}
    >
      {children}
      {control || action ? (
        <div className="ml-auto flex w-full min-w-0 flex-wrap items-center gap-3 md:w-auto">
          {control ? (
            <div className="min-w-0 flex-[1_1_18rem] md:w-96 md:flex-none [&>*]:w-full">
              {control}
            </div>
          ) : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}

function QuickFilters({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-[1_1_20rem] flex-wrap items-center gap-3 [&>*]:max-w-full",
        className,
      )}
      {...props}
    />
  );
}

/** The caller owns the label, icon, click handler and overlay. */
function FilterTrigger({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-auto min-h-11 max-w-full gap-2 whitespace-normal [overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}

/** Independent filter surface; the consuming page owns filter state. */
export const FilterBar = Object.assign(Root, { QuickFilters, FilterTrigger });
