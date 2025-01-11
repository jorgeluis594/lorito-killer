import { getSession } from "@/lib/auth";
import { getLastOpenCashShift } from "@/cash-shift/db_repository";
import SignOutRedirection from "@/shared/components/sign-out-redirection";

export default async function Page() {
  const session = await getSession();
  if (!session.user) return <SignOutRedirection />;
  const cashShiftResponse = await getLastOpenCashShift(session.user.id);

  if (!cashShiftResponse.success) {
    return <div>No tienes una caja abierta</div>;
  }

  return (
    <div className="h-[calc(100vh-theme(space.14))]">Escoge una venta</div>
  );
}
