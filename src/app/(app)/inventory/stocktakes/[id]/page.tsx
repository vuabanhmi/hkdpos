import { StocktakeCountingPageClient } from "@/features/inventory/components/stocktake-counting-page-client";

export default async function StocktakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StocktakeCountingPageClient stocktakeId={id} />;
}
