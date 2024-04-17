import CashShiftForm from "@/cash-shift/components/form";

export default function CashShiftIsNotOpen() {
  return (
    <div className="flex text-center items-center justify-center h-full">
      <div>
        <p className="text-center text-lg text-gray-600">
          No tienes una caja abierta, abre una para generar ventas
        </p>
        <hr className="my-4" />
        <CashShiftForm />
      </div>
    </div>
  );
}
