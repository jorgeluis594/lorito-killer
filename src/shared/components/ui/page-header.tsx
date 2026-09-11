import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Root({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      className={cn("flex min-w-0 flex-col gap-8", className)}
      {...props}
    />
  );
}

function Navigation({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      className={cn(
        "flex flex-wrap items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function Main({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-8 gap-y-4", className)}
      {...props}
    />
  );
}

function Heading({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex min-w-0 flex-[1_1_20rem] flex-col gap-2", className)}
      {...props}
    />
  );
}

function Title({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[1.75rem] font-bold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}

function Description({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "max-w-prose text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}

function Actions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex max-w-full flex-wrap items-center gap-2 [&>*]:max-w-full [&>*]:h-auto [&>*]:min-h-11 [&>*]:whitespace-normal [&>*]:[overflow-wrap:anywhere]",
        className,
      )}
      {...props}
    />
  );
}

/** Stateless layout primitives. Compose interactive controls in the consuming page. */
export const PageHeader = Object.assign(Root, {
  Navigation,
  Main,
  Heading,
  Title,
  Description,
  Actions,
});
