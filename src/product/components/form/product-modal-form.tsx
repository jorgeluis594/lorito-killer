"use client";

import SingleProductModalForm from "@/product/components/form/single-product-modal-form";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import { SingleProductType } from "@/product/types";
import PackageProductModalForm from "@/product/components/form/package-product-modal-form";
import { useRouter } from "next/navigation";

export default function ProductModalForm() {
  const productType = useProductFormStore((store) => store.productType);
  const router = useRouter();

  const onActionPerformed = () => {
    router.refresh();
  };

  return productType === SingleProductType ? (
    <SingleProductModalForm onActionPerformed={onActionPerformed} />
  ) : (
    <PackageProductModalForm onActionPerformed={onActionPerformed} />
  );
}
