"use client"
import useSignOut from "@/lib/use-sign-out"
import {useEffect} from "react";

export default function SignOutRedirection() {
  const signOut = useSignOut()
  useEffect(() => {
    signOut()
  })

  return <p>Cerrando sesión</p>
}