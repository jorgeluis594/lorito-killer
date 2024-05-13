import SingleProductModalForm from "@/product/components/form/single-product-modal-form";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import { SingleProductType } from "@/product/types";
import PackageProductModalForm from "@/product/components/form/package-product-modal-form";

export default function ProductModalForm({
  onActionPerformed,
}: {
  onActionPerformed: () => void;
}) {
  const productType = useProductFormStore((store) => store.productType);

  return productType === SingleProductType ? (
    <SingleProductModalForm onActionPerformed={onActionPerformed} />
  ) : (
    <PackageProductModalForm onActionPerformed={onActionPerformed} />
  );
}
