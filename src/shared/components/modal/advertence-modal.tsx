"use client";

import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";

export const AdvertenceModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setShowModal(true);

    const intervalId = setInterval(() => {
      setShowModal(true);
    }, 1800000);

    return () => clearInterval(intervalId);
  }, []);

  const handleClose = () => {
    setShowModal(false);
  };

  const handleConfirm = () => {
      setShowModal(false);
  };

  return (
    <Modal
      title="Advertencia de suscripcion en la nube"
      description="Suscripción de servidor en la nube está por caducar, por favor realizar el pago, fecha límite 09/06/2024."
      isOpen={showModal}
      onClose={handleClose}
    >
      <div className="pt-6 space-x-2 flex items-center justify-end w-full">
        <Button variant="destructive" onClick={handleConfirm}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
};