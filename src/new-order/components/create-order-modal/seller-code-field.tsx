"use client";

import { ReloadIcon } from "@radix-ui/react-icons";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { findActiveSellerByCode } from "@/seller/actions";
import type { Seller } from "@/seller/types";
import { cn } from "@/lib/utils";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

type SellerCodeFieldProps = {
  onValidSellerChange: (selection: ValidSellerSelection | null) => void;
};

const SELLER_CODE_LENGTH = 4;

export type ValidSellerSelection = {
  seller: Seller;
  sellerCode: string;
};

export default function SellerCodeField({
  onValidSellerChange,
}: SellerCodeFieldProps) {
  const validationId = useRef(0);
  const [code, setCode] = useState("");
  const [seller, setSeller] = useState<Seller | null>(null);
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (code.length !== SELLER_CODE_LENGTH) return;

    const currentValidationId = validationId.current;

    async function validateSellerCode() {
      const response = await findActiveSellerByCode(code);
      if (validationId.current !== currentValidationId) return;

      setValidating(false);
      if (!response.success) {
        setError(response.message);
        return;
      }

      setSeller(response.data);
      onValidSellerChange({
        seller: response.data,
        sellerCode: code,
      });
    }

    void validateSellerCode();
  }, [code, onValidSellerChange]);

  function handleCodeChange(event: ChangeEvent<HTMLInputElement>) {
    validationId.current += 1;
    const normalizedCode = event.target.value
      .replace(/\D/g, "")
      .slice(0, SELLER_CODE_LENGTH);

    setCode(normalizedCode);
    setSeller(null);
    setError("");
    setValidating(normalizedCode.length === SELLER_CODE_LENGTH);
    onValidSellerChange(null);
  }

  const fieldError =
    error ||
    (code.length === 0
      ? "Ingrese el codigo de seller"
      : code.length < SELLER_CODE_LENGTH
        ? "El codigo debe tener 4 digitos"
        : "");
  const hasError = Boolean(fieldError) && !validating;

  return (
    <div className="mx-auto mt-4 w-full max-w-sm text-left">
      <Label htmlFor="seller-code">Codigo de seller</Label>
      <div className="relative mt-1">
        <Input
          id="seller-code"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={SELLER_CODE_LENGTH}
          placeholder="0000"
          value={code}
          onChange={handleCodeChange}
          aria-invalid={hasError}
          className={cn(
            "pr-10 text-center text-lg font-medium tracking-widest",
            hasError && "border-destructive focus-visible:ring-destructive",
          )}
        />
        {validating && (
          <ReloadIcon className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="mt-1 min-h-5 text-xs">
        {seller ? (
          <p className="font-medium text-emerald-700">
            Seller: {seller.name || seller.email}
          </p>
        ) : (
          <p className="text-destructive">{hasError ? fieldError : ""}</p>
        )}
      </div>
    </div>
  );
}
