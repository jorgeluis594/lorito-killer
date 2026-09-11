"use client";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";

interface AlertModalProps {
  isOpen: boolean;
  children?: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  children,
  onClose,
  onConfirm,
  loading,
}) => {
  return (
    <Modal
      title="¿Estas seguro?"
      description="Esta acción no se puede revertir."
      isOpen={isOpen}
      onClose={onClose}
    >
      {children}
      <div className="pt-6 space-x-2 flex items-center justify-end w-full">
        <Button disabled={loading} variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={loading} variant="destructive" onClick={onConfirm}>
          Continuar
        </Button>
      </div>
    </Modal>
  );
};
