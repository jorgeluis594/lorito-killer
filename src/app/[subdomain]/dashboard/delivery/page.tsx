import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { requirePermission } from "@/authorization/server";
import { requireFeature } from "@/feature-flags/server";
import { listDeliveryOrders, todayInLima } from "@/delivery/db_repository";
import { DeliveryListFiltersSchema } from "@/delivery/schemas";
import DeliveryList from "@/delivery/components/delivery-list";
import DeliveryListFilters from "@/delivery/components/delivery-list-filters";

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function DeliveryContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const auth = await requirePermission("delivery", "read");
  if (!auth.success)
    return <p className="p-4 text-destructive">{auth.message}</p>;
  const feature = await requireFeature(auth.data.companyId, "restaurants");
  if (!feature.success)
    return <p className="p-4 text-destructive">{feature.message}</p>;

  const parsed = DeliveryListFiltersSchema.safeParse({
    date: first(searchParams.date) || undefined,
    status: first(searchParams.status) || undefined,
    search: first(searchParams.search) || undefined,
    cursor: first(searchParams.cursor) || undefined,
  });
  if (!parsed.success) return <p role="alert">Los filtros no son válidos.</p>;
  const result = await listDeliveryOrders(auth.data.companyId, parsed.data);
  if (!result.success) return <p role="alert">{result.message}</p>;

  const { items, nextCursor } = result.data;
  const next = new URLSearchParams();
  for (const key of ["date", "status", "search"] as const) {
    const value = first(searchParams[key]);
    if (value) next.set(key, value);
  }
  const home = next.toString();
  if (nextCursor) next.set("cursor", nextCursor);

  return (
    <>
      <DeliveryList items={items} />
      <div className="flex justify-between">
        {parsed.data.cursor ? (
          <Button variant="outline" asChild>
            <Link
              href={
                home ? `/dashboard/delivery?${home}` : "/dashboard/delivery"
              }
            >
              Volver al inicio
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {nextCursor && (
          <Button variant="outline" asChild>
            <Link href={`/dashboard/delivery?${next.toString()}`}>Ver más</Link>
          </Button>
        )}
      </div>
    </>
  );
}

export default async function DeliveryPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-4 px-4 py-5 md:px-8 md:py-8">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard" aria-label="Volver al dashboard">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Delivery</h1>
          <p className="text-sm text-muted-foreground">
            Pedidos del día, por despachar y en la calle
          </p>
        </div>
      </header>
      <DeliveryListFilters today={todayInLima()} />
      <Suspense
        key={JSON.stringify(searchParams)}
        fallback={<p className="py-8 text-center">Cargando pedidos…</p>}
      >
        <DeliveryContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
