"use client";

import { signOut } from "next-auth/react";
import { toast, useToast } from "../ui/use-toast";
import { getLastOpenCashShift } from "@/cash-shift/api_repository";
import { useCallback } from "react";

export default function SignOut() {

  const { toast } = useToast();
  const handleClick = useCallback(async () => {
    const response = await getLastOpenCashShift();
    if (response.success) {
      toast({
        title: "Tiene una caja abierta",
        description: "Necesita cerrar la caja antes de cerrar sesion",
        variant: "destructive",
      });
    } else {
      signOut()
    }
  }, [toast]);


  return <div onClick={handleClick}>Cerrar sesión</div>;
}
