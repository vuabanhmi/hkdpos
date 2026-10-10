"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createProductGroup,
  createUnit,
  listProductGroupsForManagement,
  listTaxCategoriesForManagement,
  listUnitsForManagement,
  setProductGroupActive,
  setUnitActive,
  updateProductGroup,
  updateUnit,
  type ProductGroupManageRow,
  type TaxCategoryManageRow,
  type UnitManageRow,
} from "@/features/products/actions/reference-data";
import { SimpleCategoryManager } from "./simple-category-manager";
import { TaxCategoryManager } from "./tax-category-manager";

export function CategoriesPageClient() {
  const [groups, setGroups] = useState<ProductGroupManageRow[]>([]);
  const [units, setUnits] = useState<UnitManageRow[]>([]);
  const [taxCategories, setTaxCategories] = useState<TaxCategoryManageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, u, t] = await Promise.all([
        listProductGroupsForManagement(),
        listUnitsForManagement(),
        listTaxCategoriesForManagement(),
      ]);
      setGroups(g);
      setUnits(u);
      setTaxCategories(t);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Quản lý danh mục</h1>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <Tabs defaultValue="groups">
          <TabsList>
            <TabsTrigger value="groups">Nhóm sản phẩm</TabsTrigger>
            <TabsTrigger value="units">Đơn vị tính</TabsTrigger>
            <TabsTrigger value="tax-categories">Nhóm ngành nghề tính thuế</TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="pt-2">
            <SimpleCategoryManager
              itemLabel="Nhóm sản phẩm"
              rows={groups}
              onCreate={(name) => createProductGroup(name)}
              onUpdate={(id, name, description) => updateProductGroup(id, { name, description })}
              onToggleActive={setProductGroupActive}
              onChanged={load}
            />
          </TabsContent>

          <TabsContent value="units" className="pt-2">
            <SimpleCategoryManager
              itemLabel="Đơn vị tính"
              rows={units}
              onCreate={(name, description) => createUnit(name, description)}
              onUpdate={(id, name, description) => updateUnit(id, { name, description })}
              onToggleActive={setUnitActive}
              onChanged={load}
            />
          </TabsContent>

          <TabsContent value="tax-categories" className="pt-2">
            <TaxCategoryManager rows={taxCategories} onChanged={load} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
