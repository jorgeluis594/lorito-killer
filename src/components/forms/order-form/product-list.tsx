import { Product } from "@/product/types";

interface ProductListProps {
  products: Product[];
}

function ProductItem({ product }: { product: Product }) {
  return (
    <div className="border p-2">
      <div className="text-center">{product.name}</div>
      <div className="text-center">{product.price}</div>
    </div>
  );
}

export default function ProductList({ products }: ProductListProps) {
  return (
    <div className="p-4 mt-4 flex-wrap justify-center grid grid-flow-row auto-rows-[250px] grid-cols-[repeat(auto-fill,220px)] gap-4">
      {products.length ? (
        products.map((product) => (
          <ProductItem key={product.id} product={product} />
        ))
      ) : (
        <div className="text-center">No hay productos</div>
      )}
    </div>
  );
}
