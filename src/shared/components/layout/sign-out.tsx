"use client";

import useSignOut from "@/lib/use-sign-out";

export default function SignOut() {
  const signOut = useSignOut();
  return <div onClick={() => signOut()}>Cerrar sesión</div>;
}
