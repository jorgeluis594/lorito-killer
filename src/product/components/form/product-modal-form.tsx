"use client";

import SingleProductModalForm from "@/product/components/form/single-product-modal-form";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import ServiceProductModal from "./service-product-modal";
import { ServiceProductType, SingleProductType } from "@/product/types";
import PackageProductModalForm from "@/product/components/form/package-product-modal-form";
import { useRouter } from "next/navigation";

export default function ProductModalForm() {
  const store = useProductFormStore((store) => store);
  const productType = store.productType;
  const router = useRouter();

  const onActionPerformed = () => {
    router.refresh();
  };

  if (store.productType === ServiceProductType) {
    return <ServiceProductModal key={`${store.product?.id}-${store.open}`} product={store.product ?? undefined} open={store.open} onClose={() => store.setOpen(false)} onActionPerformed={onActionPerformed} />;
  }

  return productType === SingleProductType ? (
    <SingleProductModalForm onActionPerformed={onActionPerformed} />
  ) : (
    <PackageProductModalForm onActionPerformed={onActionPerformed} />
  );
}
