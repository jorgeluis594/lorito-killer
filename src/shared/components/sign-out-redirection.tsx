"use client"
import useSignOut from "@/lib/use-sign-out"
import {useEffect} from "react";

export default function SignOutRedirection() {
  const signOut = useSignOut()
  useEffect(() => {
    signOut().then(() => {
      window.location.href = window.location.origin
    })
  })

  return <p>Cerrando sesión</p>
}