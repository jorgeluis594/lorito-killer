"use client";

import { useEffect, useState } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { getCompany } from "@/order/actions";
import { Company } from "@/company/types";

const ModalMessage = () => {
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
      description="Suscripción de servidor en la nube está por caducar, por favor realizar el pago, fecha límite 14/06/2024."
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

export const AdvertenceModal: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (!company) {
      getCompany().then((response) => {
        if (response.success) {
          setCompany(response.data);
        }
      });
    }
  }, [company]);

  if (company && company.id === "b7fe382c-61a4-42b5-bdb4-4af5f209b4c2") {
    return <ModalMessage />;
  } else {
    return null;
  }
};
