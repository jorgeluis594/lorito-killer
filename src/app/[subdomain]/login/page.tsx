import { Metadata } from "next";
import UserAuthForm from "@/shared/user-auth-form";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Kogoz - Inicia sesión",
  description: "Authentication forms built using the components.",
};

export default function AuthenticationPage() {
  return (
    <div className="relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden w-3/5 h-3/5 bg-muted p-10 dark:border-r lg:flex ml-52">
          <Image fill className="bg-white" alt="Logo" src="/kogoz.svg" />
      </div>
      <div className="p-4 lg:p-8 h-full flex items-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Iniciar sesión
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresa tu email y contraseña para iniciar sesión
            </p>
          </div>
          <UserAuthForm action={"login"} />
          {/*<p className="px-8 text-center text-sm text-muted-foreground">
            By clicking continue, you agree to our{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </Link>
            .
          </p>*/}
        </div>
      </div>
    </div>
  );
}
