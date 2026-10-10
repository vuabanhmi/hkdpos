"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listActiveCustomers } from "@/features/contacts/actions/contacts";
import {
  createDraftOrder,
  listDraftOrders,
  listPosProducts,
  saveDraftOrderItems,
  type DraftOrderSummary,
  type PosProduct,
} from "@/features/sales/actions/pos";
import { computeOrderTotals } from "@/features/sales/domain/order-totals";
import { PosCartPanel } from "./pos-cart-panel";
import { PosCheckoutDialog } from "./pos-checkout-dialog";
import { PosProductGrid } from "./pos-product-grid";

export interface CartLine {
  productId: string;
  productName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  defaultPrice: number | null;
}

interface Tab {
  orderId: string;
  orderNo: string;
  contactId: string | null;
  discountTotal: string;
  note: string;
  lines: CartLine[];
}

function draftToTab(draft: DraftOrderSummary): Tab {
  return {
    orderId: draft.id,
    orderNo: draft.orderNo,
    contactId: draft.contactId,
    discountTotal: String(draft.discountTotal),
    note: draft.note ?? "",
    lines: draft.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      unitName: item.unitName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      defaultPrice: null,
    })),
  };
}

export function PosPageClient() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const [drafts, productList, customerList] = await Promise.all([
        listDraftOrders(),
        listPosProducts(),
        listActiveCustomers(),
      ]);
      setProducts(productList);
      setCustomers(customerList);

      if (drafts.length > 0) {
        setTabs(drafts.map(draftToTab));
      } else {
        const created = await createDraftOrder();
        if (created.ok) {
          setTabs([
            {
              orderId: created.data.id,
              orderNo: created.data.orderNo,
              contactId: null,
              discountTotal: "0",
              note: "",
              lines: [],
            },
          ]);
        }
      }
      setLoading(false);
    })();
  }, []);

  const activeTab = tabs[activeIndex];

  const persist = useCallback(
    async (tab: Tab) => {
      const result = await saveDraftOrderItems(
        tab.orderId,
        tab.contactId,
        Number(tab.discountTotal) || 0,
        tab.note || null,
        tab.lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
        })),
      );
      if (!result.ok) toast.error(result.error);
    },
    [],
  );

  function updateActiveTab(updater: (tab: Tab) => Tab) {
    setTabs((prev) => {
      const next = prev.map((t, i) => (i === activeIndex ? updater(t) : t));
      void persist(next[activeIndex]);
      return next;
    });
  }

  function handlePickProduct(product: PosProduct) {
    updateActiveTab((tab) => {
      const existing = tab.lines.find((l) => l.productId === product.id);
      if (existing) {
        return {
          ...tab,
          lines: tab.lines.map((l) =>
            l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
          ),
        };
      }
      return {
        ...tab,
        lines: [
          ...tab.lines,
          {
            productId: product.id,
            productName: product.name,
            unitName: product.unitName,
            quantity: 1,
            unitPrice: product.price ?? 0,
            discount: 0,
            defaultPrice: product.price,
          },
        ],
      };
    });
  }

  function handleChangeLine(productId: string, patch: Partial<CartLine>) {
    updateActiveTab((tab) => ({
      ...tab,
      lines: tab.lines.map((l) => (l.productId === productId ? { ...l, ...patch } : l)),
    }));
  }

  function handleRemoveLine(productId: string) {
    updateActiveTab((tab) => ({ ...tab, lines: tab.lines.filter((l) => l.productId !== productId) }));
  }

  async function handleAddTab() {
    const created = await createDraftOrder();
    if (!created.ok) {
      toast.error(created.error);
      return;
    }
    setTabs((prev) => [
      ...prev,
      {
        orderId: created.data.id,
        orderNo: created.data.orderNo,
        contactId: null,
        discountTotal: "0",
        note: "",
        lines: [],
      },
    ]);
    setActiveIndex(tabs.length);
  }

  async function handleOrderCompleted() {
    setCheckoutOpen(false);
    const created = await createDraftOrder();
    setTabs((prev) => {
      const next = prev.filter((_, i) => i !== activeIndex);
      if (created.ok) {
        next.push({
          orderId: created.data.id,
          orderNo: created.data.orderNo,
          contactId: null,
          discountTotal: "0",
          note: "",
          lines: [],
        });
      }
      return next;
    });
    setActiveIndex(0);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F1") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F9") {
        e.preventDefault();
        if (activeTab && activeTab.lines.length > 0) setCheckoutOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  if (loading || !activeTab) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>;
  }

  const activeTotals = computeOrderTotals(activeTab.lines, Number(activeTab.discountTotal) || 0);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      <div className="flex items-center gap-2 overflow-x-auto">
        {tabs.map((tab, i) => (
          <Button
            key={tab.orderId}
            variant={i === activeIndex ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveIndex(i)}
          >
            {tab.orderNo} {tab.lines.length > 0 ? `(${tab.lines.length})` : ""}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={handleAddTab}>
          + Tab mới
        </Button>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[360px_1fr]">
        <div className="overflow-hidden rounded-lg border p-3">
          <PosCartPanel
            orderNo={activeTab.orderNo}
            lines={activeTab.lines}
            customers={customers}
            contactId={activeTab.contactId}
            discountTotal={activeTab.discountTotal}
            note={activeTab.note}
            onChangeContact={(contactId) => updateActiveTab((tab) => ({ ...tab, contactId }))}
            onChangeDiscountTotal={(value) => updateActiveTab((tab) => ({ ...tab, discountTotal: value }))}
            onChangeNote={(value) => updateActiveTab((tab) => ({ ...tab, note: value }))}
            onChangeLine={handleChangeLine}
            onRemoveLine={handleRemoveLine}
            onCheckout={() => setCheckoutOpen(true)}
          />
        </div>
        <div className="overflow-hidden rounded-lg border p-3">
          <PosProductGrid ref={searchInputRef} products={products} onPick={handlePickProduct} />
        </div>
      </div>

      <PosCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        orderId={activeTab.orderId}
        orderNo={activeTab.orderNo}
        total={activeTotals.total}
        hasContact={activeTab.contactId !== null}
        onCompleted={handleOrderCompleted}
      />
    </div>
  );
}
