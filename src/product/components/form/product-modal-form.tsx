import SingleProductModalForm from "@/product/components/form/single-product-modal-form";
import { useProductFormStore } from "@/product/components/form/product-form-store-provider";
import { PackageProductType } from "@/product/types";

export default function ProductModalForm({
  onActionPerformed,
}: {
  onActionPerformed: () => void;
}) {
  const productType = useProductFormStore((store) => store.productType);

  return (
    productType !== PackageProductType && (
      <SingleProductModalForm onActionPerformed={onActionPerformed} />
    )
  );
}
