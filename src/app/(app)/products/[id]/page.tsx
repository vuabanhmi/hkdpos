import { notFound } from "next/navigation";
import { getProduct } from "@/features/products/actions/products";
import { ProductDetailClient } from "@/features/products/components/product-detail-client";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
