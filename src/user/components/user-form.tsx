"use client";

import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { LoadingButton } from "@/shared/components/ui/button";

import { updateUser } from "@/user/actions";
import { useUserSession } from "@/lib/use-user-session";
import { useEffect, useState } from "react";
import { useToast } from "@/shared/components/ui/use-toast";
import { useSession } from "next-auth/react";

export default function UserForm() {
  const user = useUserSession()!;
  const { update } = useSession();

  const [name, setName] = useState<string>(user?.name || "");
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    setName(user.name || "");
  }, [user]);

  const onSubmit = async () => {
    setLoading(true);
    const updatedUserResponse = await updateUser({ ...user, name });
    setLoading(false);
    if (!updatedUserResponse.success) {
      toast({
        title: "Error",
        description:
          "No se pudo actualizar el nombre del usuario, intentelo en unos minutos",
        variant: "destructive",
      });
      console.error(updatedUserResponse.message);
      return;
    }

    toast({
      title: "Nombre actualizado",
      description: "El nombre del usuario ha sido actualizado",
    });

    console.log({ user: updatedUserResponse.data });

    const response = await update({ user: updatedUserResponse.data });
    console.log({ response });
  };

  return (
    <>
      <div className="grid w-full max-w-sm items-center gap-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          type="text"
          id="name"
          placeholder="Nombre"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
        />
      </div>
      <LoadingButton
        size="sm"
        className="mt-4"
        loading={loading}
        onClick={onSubmit}
      >
        Actualizar datos
      </LoadingButton>
    </>
  );
}
