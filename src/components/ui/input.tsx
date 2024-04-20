import * as React from "react";
import { cn, formatPrice } from "@/lib/utils";
import { useReducer } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

const MoneyInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, ...props }, ref) => {
    const initialValue = props.value ? formatPrice(Number(props.value)) : "";

    const [value, setValue] = useReducer((_: any, next: string) => {
      const digits = next.replace(/\D/g, "");
      return formatPrice(Number(digits) / 100);
    }, initialValue);

    function handleChange(
      realChangeFn: React.ChangeEventHandler<HTMLInputElement> | undefined,
      ev: React.ChangeEvent<HTMLInputElement>,
    ) {
      const formattedValue = ev.target.value;
      const digits = formattedValue.replace(/\D/g, "");
      const realValue = Number(digits) / 100;
      if (realChangeFn)
        realChangeFn({
          ...ev,
          target: { ...ev.target, value: realValue.toString() },
        });
    }
    return (
      <input
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        placeholder={props.placeholder}
        type="string"
        onChange={(ev) => {
          setValue(ev.target.value);
          handleChange(onChange, ev);
        }}
        value={value}
      />
    );
  },
);
MoneyInput.displayName = "MoneyInput";

export { Input, MoneyInput };
