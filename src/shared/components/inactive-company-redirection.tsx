"use client"
import useSignOut from "@/lib/use-sign-out"
import {useEffect} from "react";
import { toast } from "@/shared/components/ui/use-toast";

export default function InactiveCompanyRedirection() {
  const signOut = useSignOut()
  useEffect(() => {
    toast({
      title: "Cuenta suspendida",
      description: "Tu suscripción presenta un pago pendiente. Actualiza tu situación para seguir usando el servicio.",
      variant: "destructive",
      duration: 10000,
    })
    signOut().then(() => {
      window.location.href = window.location.origin
    })
  }, [signOut])

  return <p>Cerrando sesión</p>
}
