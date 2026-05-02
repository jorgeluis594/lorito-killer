import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sistema en mantenimiento",
};

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-slate-950">
      <section className="w-full max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Mantenimiento
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
          El sistema está temporalmente en mantenimiento
        </h1>
        <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
          Estamos realizando ajustes para mejorar el servicio. Por favor,
          vuelve a intentarlo en unos minutos.
        </p>
      </section>
    </main>
  );
}
