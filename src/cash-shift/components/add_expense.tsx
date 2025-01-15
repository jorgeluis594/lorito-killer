import { Button } from "@/shared/components/ui/button";
import React from "react";
import { HandCoins } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input, MoneyInput } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { addExpense } from "@/cash-shift/components/actions";
import { useCashShift } from "@/cash-shift/components/cash-shift-provider";
import { useToast } from "@/shared/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";

const AddExpenseSchema = z.object({
  amount: z.coerce.number().nonnegative("El monto no puede ser negativo"),
  description: z.string().optional(),
});

type AddExpenseFormValues = z.infer<typeof AddExpenseSchema>;

export default function AddExpense() {
  const [open, setOpen] = React.useState(false);
  const toggleOpen = () => setOpen(!open);
  const cashShift = useCashShift();
  const { toast } = useToast();

  if (!cashShift) throw new Error("Cash shift not found");

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(AddExpenseSchema),
    defaultValues: { amount: 0, description: "" },
  });

  const onSubmit = async (data: AddExpenseFormValues) => {
    const response = await addExpense({
      id: crypto.randomUUID(),
      cashShiftId: cashShift.id,
      createdAt: new Date(),
      amount: data.amount,
      description: data.description,
    });

    if (!response.success) {
      toast({
        title: "Error",
        variant: "destructive",
        duration: 2000,
        description: "Error al agregar gasto",
      });
      return;
    }

    toast({
      duration: 2000,
      description: `El gasto de ${formatPrice(response.data.amount)} se agrego con éxito`,
    });
    form.reset();
    setOpen(false);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="outline" onClick={toggleOpen}>
              <HandCoins className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Agrega gastos diarios a tu caja chica</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar gasto</DialogTitle>
            <DialogDescription>
              Agrega tus gastos diarios y manten tus cuentas en orden
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              id="expense-form"
              className="mt-8 space-y-6"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <MoneyInput placeholder="Monto del gasto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  size="sm"
                  onClick={form.handleSubmit(onSubmit)}
                >
                  Agregar gasto
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
