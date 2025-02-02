"use client";

import { Button } from "@/shared/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUser } from "@/user/actions";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import * as z from "zod";
// import GoogleSignInButton from "../github-auth-button";

const formSchema = z.object({
  email: z.string().email({ message: "Ingrese un email válido" }),
  password: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

type UserFormValue = z.infer<typeof formSchema>;
interface UserAuthFormProps {
  action: "login" | "signup";
}

export default function UserAuthForm({ action }: UserAuthFormProps) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [loading, setLoading] = useState(false);
  const defaultValues = {};
  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  const router = useRouter();

  const onSubmit = async (data: UserFormValue) => {
    if (action === "signup") {
      const createUserResponse = await createUser(
        "TODO: This view is not beging used, do we need to remove this?",
        data.email,
        data.password,
      );
      if (!createUserResponse.success) {
        form.setError("email", {
          type: "manual",
          message: createUserResponse.message,
        });
      }

      const signInResponse = await signIn("credentials", {
        email: data.email,
        password: data.password,
      });

      console.log({ signInResponse });
    } else {
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      window.location.href = callbackUrl || window.location.origin;
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 w-full"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Ingresa tu email"
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" disabled={loading} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            disabled={loading}
            className="ml-auto w-full mt-6"
            type="submit"
          >
            {action === "login" ? "Iniciar sesión" : "Registrarse"}
          </Button>
        </form>
      </Form>
      {/*<GoogleSignInButton />*/}
    </>
  );
}
