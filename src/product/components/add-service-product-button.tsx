"use client";

import { Button } from "@/shared/components/ui/button";
import { Briefcase } from "lucide-react";
import { HelpTooltip } from "@/shared/components/ui/help-tooltip";
import React, { useState } from "react";
import ServiceProductModal from "@/product/components/form/service-product-modal";
import { useRouter } from "next/navigation";

export default function AddServiceProductButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleActionPerformed = () => {
    router.refresh();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="text-xs md:text-sm ml-2 justify-start"
        onClick={handleClick}
      >
        <Briefcase className="mr-2 h-4 w-4" />
        <span>Agregar Servicio</span>
        <HelpTooltip text="Agrega un nuevo servicio sin inventario" />
      </Button>

      <ServiceProductModal
        open={open}
        onClose={handleClose}
        onActionPerformed={handleActionPerformed}
      />
    </>
  );
}
