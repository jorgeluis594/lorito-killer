"use client";

import { signOut } from "next-auth/react";

export default function SignOut() {
  return <div onClick={() => signOut()}>Cerrar sesión</div>;
}
