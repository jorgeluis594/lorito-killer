"use client";

import {
  HandCoins,
  Smartphone,
  CreditCard,
  PiggyBank,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useOrderFormActions,
  useOrderFormStore,
} from "@/new-order/order-form-provider";
import { Separator } from "@/shared/components/ui/separator";
import { Input, MoneyInput } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useEffect, useState } from "react";
import {
  AMOUNT,
  CashPayment as CashPaymentMethod,
  Payment,
  PaymentMethod,
  PERCENT,
  WalletPayment as WalletPaymentMethod,
} from "@/order/types";
import { BlankCashPayment } from "@/order/constants";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/shared/components/ui/toggle-group";
import * as React from "react";
import * as z from "zod";
import { cn, formatPrice, plus } from "@/lib/utils";
import { useCashShift } from "@/cash-shift/components/cash-shift-provider";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { splitPaymentAmounts } from "@/order/use-cases/split-payments";

export const NonePayment: React.FC = () => {
  const { setPaymentMode } = useOrderFormActions();

  return (
    <>
      <Separator className="my-4" />
      <p className="text-lg text-center mt-8">Selecciona un medio de pago</p>
      <div className="grid grid-cols-2 w-fit gap-6 mx-auto mt-4">
        <div
          className="border col-span-1 md:h-28 md:w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent"
          onClick={() => setPaymentMode("cash")}
        >
          <HandCoins className="w-12 h-12" />
          <p className="w-full text-center">EFECTIVO</p>
        </div>
        <div
          className="border col-span-1 md:h-28 md:w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent"
          onClick={() => setPaymentMode("wallet")}
        >
          <Smartphone className="w-12 h-12" />
          <p className="w-full text-center">BILLETERA</p>
        </div>
        <div
          className="border col-span-1 md:h-28 md:w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent"
          onClick={() => setPaymentMode("card")}
        >
          <CreditCard className="md:w-12 md:h-12" />
          <p className="w-full text-center">TARJETA</p>
        </div>
        <div
          className="border col-span-1 md:h-28 md:w-48 py-4 flex items-center justify-center flex-wrap cursor-pointer hover:bg-accent"
          onClick={() => setPaymentMode("combine")}
        >
          <PiggyBank className="w-12 h-12" />
          <p className="w-full text-center">COMBINADO</p>
        </div>
      </div>
    </>
  );
};

type CashPaymentMethodState = Omit<CashPaymentMethod, "received_amount"> & {
  received_amount: number | null;
};

const DiscountFormSchema = z.object({
  discountType: z.enum([AMOUNT, PERCENT]),
  value: z.coerce.number(),
});

type DiscountFormValues = z.infer<typeof DiscountFormSchema>;

export const CashPayment: React.FC = () => {
  const orderTotal = useOrderFormStore((state) => state.order.total);
  const cashShift = useCashShift();
  const { addPayment, removePayment } = useOrderFormActions();
  const [payment, setPayment] = useState<CashPaymentMethodState>({
    ...BlankCashPayment,
    received_amount: null,
  });

  function handleChangeReceivedAmount(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const value = parseFloat(event.target.value);
    setPayment({
      ...payment,
      cashShiftId: cashShift!.id,
      received_amount: value,
    });
  }

  useEffect(() => {
    if (payment.received_amount === null) return;

    if (payment.received_amount >= orderTotal) {
      setPayment((p) => ({
        ...p,
        amount: orderTotal,
        change: p.received_amount! - orderTotal,
      }));
    } else {
      setPayment((p) => ({
        ...p,
        amount: p.received_amount!,
        change: 0,
      }));
    }
  }, [payment.received_amount, orderTotal]);

  useEffect(() => {
    const { received_amount, ...rest } = payment;
    if (received_amount === null) return;

    removePayment("cash");
    addPayment({ ...rest, received_amount });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment]);

  useEffect(() => {
    removePayment("cash");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-4">
      <div className="my-3">
        <Label>Monto recibido</Label>
        <MoneyInput
          placeholder="Ingrese monto"
          type="number"
          value={payment.received_amount || ""}
          onChange={handleChangeReceivedAmount}
        />
        <p className="text-sm font-medium text-destructive">
          {payment.received_amount !== 0 &&
          payment.received_amount !== null &&
          payment.received_amount! < orderTotal
            ? "El monto recibido es menor al total"
            : ""}
        </p>
      </div>
      {payment.change !== 0 && (
        <div className="mt-5">
          Vuelto:
          <span className="text-lg font-medium text-destructive ml-3">
            {formatPrice(payment.change)}
          </span>
        </div>
      )}
    </div>
  );
};

const WalletDetails = ({
  name,
  operationCode,
  onNameChange,
  onOperationCodeChange,
  idSuffix = "",
}: {
  name: string;
  operationCode: string;
  onNameChange: (value: string) => void;
  onOperationCodeChange: (value: string) => void;
  idSuffix?: string;
}) => (
  <div className="grid gap-3 my-3 sm:grid-cols-2">
    <div>
      <Label htmlFor={`wallet-name${idSuffix}`}>Billetera (obligatorio)</Label>
      <Input
        id={`wallet-name${idSuffix}`}
        placeholder="Yape, Plin u otra"
        value={name}
        maxLength={80}
        required
        onChange={(event) => onNameChange(event.target.value)}
      />
    </div>
    <div>
      <Label htmlFor={`wallet-operation-code${idSuffix}`}>
        Código de operación (obligatorio)
      </Label>
      <Input
        id={`wallet-operation-code${idSuffix}`}
        placeholder="Código del pago recibido"
        value={operationCode}
        maxLength={100}
        required
        onChange={(event) => onOperationCodeChange(event.target.value)}
      />
    </div>
  </div>
);

export const WalletPayment: React.FC = () => {
  const orderTotal = useOrderFormStore((state) => state.order.total);
  const { addPayment } = useOrderFormActions();
  const cashShift = useCashShift();
  const [name, setName] = useState<string | null>(null);
  const [operationCode, setOperationCode] = useState<string | null>(null);

  useEffect(() => {
    const params: WalletPaymentMethod = {
      cashShiftId: cashShift!.id,
      amount: orderTotal,
      method: "wallet",
      name: name || undefined,
      operationCode: operationCode || undefined,
    };

    addPayment(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderTotal, name, operationCode]);

  return (
    <div className="mt-4">
      <div className="my-3">
        <Label>Monto recibido</Label>
        <MoneyInput type="number" value={orderTotal} disabled />
      </div>

      <WalletDetails
        name={name || ""}
        operationCode={operationCode || ""}
        onNameChange={setName}
        onOperationCodeChange={setOperationCode}
      />
    </div>
  );
};

export const CardPayment: React.FC = () => {
  const orderTotal = useOrderFormStore((state) => state.order.total);
  const { addPayment, removePayment } = useOrderFormActions();
  const cashShift = useCashShift();

  const onCardChange = (
    value: PaymentMethod & ("debit_card" | "credit_card"),
  ) => {
    if (value === "debit_card") removePayment("credit_card");
    if (value === "credit_card") removePayment("debit_card");

    addPayment({
      cashShiftId: cashShift!.id,
      amount: orderTotal,
      method: value,
    });
  };

  return (
    <div className="mt-4">
      <div className="my-3">
        <Label>Monto recibido</Label>
        <MoneyInput
          placeholder="Ingrese monto"
          type="number"
          className="w-full"
          value={orderTotal}
          disabled
        />
      </div>
      <ToggleGroup
        type="single"
        size="lg"
        variant="outline"
        className="gap-0 w-full"
        onValueChange={onCardChange}
      >
        <ToggleGroupItem
          value={"debit_card"}
          className="rounded-tr-none rounded-br-none w-full md:w-48"
        >
          Débito
        </ToggleGroupItem>
        <ToggleGroupItem
          value="credit_card"
          className="rounded-tl-none rounded-bl-none w-full md:w-48"
        >
          Crédito
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export const CombinedPayment: React.FC = () => {
  const orderTotal = useOrderFormStore((state) => state.order.total);
  const cashShift = useCashShift();
  const { setPayments } = useOrderFormActions();
  const [parts, setParts] = useState(2);
  const [contributions, setContributions] = useState<Contribution[]>([
    blankContribution(1),
  ]);

  const updateContributions = (next: Contribution[]) => {
    setContributions(next);
    setPayments(
      next
        .filter(({ amount }) => Number.isFinite(amount) && amount > 0)
        .map((contribution) => toPayment(contribution, cashShift!.id)),
    );
  };

  const covered = contributions.reduce(
    (total, contribution) => plus(total)(contribution.amount || 0),
    0,
  );
  const balance = orderTotal - covered;

  const editContribution = (id: number, update: Partial<Contribution>) =>
    updateContributions(
      contributions.map((item) =>
        item.id === id ? { ...item, ...update } : item,
      ),
    );

  const splitEqually = () =>
    updateContributions(
      splitPaymentAmounts(orderTotal, parts).map((amount, index) => ({
        ...blankContribution(index + 1),
        amount,
      })),
    );

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="split-parts">Número de comensales</Label>
          <Input
            id="split-parts"
            type="number"
            min={2}
            max={20}
            value={parts}
            onChange={(event) =>
              setParts(Math.min(20, Math.max(2, Number(event.target.value))))
            }
          />
        </div>
        <Button type="button" variant="outline" onClick={splitEqually}>
          Dividir en partes iguales
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {contributions.map((contribution, index) => (
          <div key={contribution.id} className="rounded-md border p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <Label htmlFor={`contribution-amount-${contribution.id}`}>
                  Aporte {index + 1}
                </Label>
                <Input
                  id={`contribution-amount-${contribution.id}`}
                  placeholder="Ingrese monto"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={contribution.amount || ""}
                  onChange={(event) =>
                    editContribution(contribution.id, {
                      amount: Number(event.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor={`contribution-method-${contribution.id}`}>
                  Medio de pago
                </Label>
                <Select
                  value={contribution.method}
                  onValueChange={(method: PaymentMethod) =>
                    editContribution(contribution.id, { method })
                  }
                >
                  <SelectTrigger id={`contribution-method-${contribution.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="debit_card">
                        Tarjeta de débito
                      </SelectItem>
                      <SelectItem value="credit_card">
                        Tarjeta de crédito
                      </SelectItem>
                      <SelectItem value="wallet">Billetera digital</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost_destructive"
                size="icon"
                aria-label={`Eliminar aporte ${index + 1}`}
                disabled={contributions.length === 1}
                onClick={() =>
                  updateContributions(
                    contributions.filter(({ id }) => id !== contribution.id),
                  )
                }
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            {contribution.method === "wallet" && (
              <WalletDetails
                idSuffix={`-${contribution.id}`}
                name={contribution.name}
                operationCode={contribution.operationCode}
                onNameChange={(name) =>
                  editContribution(contribution.id, { name })
                }
                onOperationCodeChange={(operationCode) =>
                  editContribution(contribution.id, { operationCode })
                }
              />
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          updateContributions([
            ...contributions,
            blankContribution(
              Math.max(...contributions.map(({ id }) => id)) + 1,
            ),
          ])
        }
      >
        <Plus aria-hidden="true" />
        Agregar aporte
      </Button>

      <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-3 text-sm tabular-nums">
        <span>Total cubierto</span>
        <strong className="text-right">{formatPrice(covered)}</strong>
        <span>{balance < 0 ? "Exceso" : "Saldo pendiente"}</span>
        <strong
          className={cn("text-right", balance !== 0 && "text-destructive")}
          aria-live="polite"
        >
          {formatPrice(Math.abs(balance))}
        </strong>
      </div>
    </div>
  );
};

type Contribution = {
  id: number;
  amount: number;
  method: PaymentMethod;
  name: string;
  operationCode: string;
};

const blankContribution = (id: number): Contribution => ({
  id,
  amount: 0,
  method: "cash",
  name: "",
  operationCode: "",
});

const toPayment = (
  contribution: Contribution,
  cashShiftId: string,
): Payment => {
  const { method, amount } = contribution;
  if (method === "cash") {
    return { method, amount, cashShiftId, received_amount: amount, change: 0 };
  }
  if (method === "wallet") {
    return {
      method,
      amount,
      cashShiftId,
      name: contribution.name,
      operationCode: contribution.operationCode,
    };
  }
  return { method, amount, cashShiftId };
};
