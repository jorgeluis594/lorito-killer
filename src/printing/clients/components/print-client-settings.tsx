"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/shared/components/ui/badge";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { useToast } from "@/shared/components/ui/use-toast";
import { createLinkCode, revokeClient } from "../actions";

type Client = {
  id: string;
  machineName: string;
  revokedAt: Date | null;
  lastSeenAt: Date;
  lastInventoryAt: Date | null;
  printers: {
    id: string;
    localName: string;
    status: "ACTIVE" | "INACTIVE";
    lastDetectedAt: Date;
  }[];
};

export function PrintClientSettings({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [linkCode, setLinkCode] = useState<{ code: string; expiresAt: Date }>();
  const [pending, startTransition] = useTransition();

  const generate = () =>
    startTransition(async () => {
      const result = await createLinkCode();
      if (result.success) setLinkCode(result.data);
      else
        toast({
          title: "No se pudo generar el código",
          description: result.message,
          variant: "destructive",
        });
    });

  const revoke = (id: string) =>
    startTransition(async () => {
      const result = await revokeClient(id);
      if (!result.success) {
        toast({
          title: "No se pudo revocar",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Vincular una instalación</CardTitle>
          <CardDescription>
            Genera un código válido durante diez minutos. Se muestra una sola
            vez.
          </CardDescription>
        </CardHeader>
        <CardContent aria-live="polite">
          {linkCode && (
            <div className="flex items-baseline gap-3">
              <strong className="text-3xl tabular-nums tracking-widest">
                {linkCode.code}
              </strong>
              <span className="text-sm text-muted-foreground">
                vence{" "}
                {new Date(linkCode.expiresAt).toLocaleTimeString("es-PE", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Lima",
                })}
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={generate} disabled={pending}>
            {pending ? "Generando..." : "Generar código"}
          </Button>
        </CardFooter>
      </Card>

      <section
        className="flex flex-col gap-3"
        aria-labelledby="installed-clients"
      >
        <div>
          <h4 id="installed-clients" className="font-semibold">
            Instalaciones vinculadas
          </h4>
          <p className="text-sm text-muted-foreground">
            Las impresoras ausentes se conservan para mantener su identidad.
          </p>
        </div>
        {clients.length === 0 ? (
          <p className="rounded-lg border p-6 text-sm text-muted-foreground">
            Aún no hay instalaciones vinculadas.
          </p>
        ) : (
          clients.map((client) => (
            <Card key={client.id}>
              <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base">
                    {client.machineName}
                  </CardTitle>
                  <CardDescription>
                    Última actividad:{" "}
                    {new Date(client.lastSeenAt).toLocaleString("es-PE", {
                      timeZone: "America/Lima",
                    })}
                  </CardDescription>
                </div>
                <Badge
                  className="shrink-0"
                  variant={client.revokedAt ? "destructive" : "secondary"}
                >
                  {client.revokedAt ? "Revocada" : "Activa"}
                </Badge>
              </CardHeader>
              <CardContent>
                {client.printers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin impresoras registradas.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {client.printers.map((printer) => (
                      <li
                        key={printer.id}
                        className="flex items-center justify-between gap-3 border-b py-2 last:border-0"
                      >
                        <span className="text-sm">{printer.localName}</span>
                        <Badge variant="outline">
                          {printer.status === "ACTIVE" ? "Activa" : "Inactiva"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
              {!client.revokedAt && (
                <CardFooter>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={pending}>
                        Revocar instalación
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ¿Revocar {client.machineName}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta instalación dejará de registrar impresoras y no
                          podrá ejecutar operaciones de impresión autenticadas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className={buttonVariants({ variant: "destructive" })}
                          onClick={() => revoke(client.id)}
                        >
                          Revocar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              )}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
