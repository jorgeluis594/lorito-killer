"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import { useToast } from "@/shared/components/ui/use-toast";
import type {
  CompanyFeatureState,
  FeatureDefinition,
  FeatureKey,
} from "@/feature-flags";
import { updateCompanyFeatureEnabled } from "@/feature-flags/actions";

type FeatureSettingsItem = {
  key: FeatureKey;
  definition: FeatureDefinition;
  state: CompanyFeatureState;
};

type CompanyFeatureSettingsProps = {
  features: FeatureSettingsItem[];
};

export function CompanyFeatureSettings({
  features,
}: CompanyFeatureSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState(features);
  const [pendingKey, setPendingKey] = useState<FeatureKey | null>(null);
  const [, startTransition] = useTransition();

  const handleToggle = (key: FeatureKey, enabled: boolean) => {
    const previousItems = items;

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.key === key
          ? {
              ...item,
              state: {
                ...item.state,
                enabled,
                source: "database",
              },
            }
          : item,
      ),
    );
    setPendingKey(key);

    startTransition(async () => {
      const response = await updateCompanyFeatureEnabled(key, enabled);
      setPendingKey(null);

      if (!response.success) {
        setItems(previousItems);
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive",
        });
        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.key === key ? { ...item, state: response.data } : item,
        ),
      );
      toast({
        title: "Features actualizadas",
        description: "La configuracion de la empresa fue guardada.",
      });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => {
        const disabled = pendingKey === item.key;

        return (
          <Card key={item.key}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">
                    {item.definition.label}
                  </CardTitle>
                  <Badge variant={item.state.enabled ? "default" : "secondary"}>
                    {item.state.enabled ? "Activa" : "Inactiva"}
                  </Badge>
                  <Badge variant="outline">
                    {item.state.source === "database" ? "Guardada" : "Default"}
                  </Badge>
                </div>
                <CardDescription>{item.key}</CardDescription>
              </div>
              <Switch
                checked={item.state.enabled}
                disabled={disabled}
                onCheckedChange={(checked) => handleToggle(item.key, checked)}
                aria-label={`Cambiar feature ${item.definition.label}`}
              />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Controla si esta funcionalidad esta disponible para la empresa
                actual.
              </p>
              {disabled && (
                <Button variant="ghost" size="sm" disabled className="mt-3">
                  Guardando...
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
