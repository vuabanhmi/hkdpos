"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { getAllowNegativeStock, setAllowNegativeStock } from "@/features/inventory/actions/settings";

export function AllowNegativeStockToggle() {
  const [value, setValue] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void (async () => {
      setValue(await getAllowNegativeStock());
      setLoaded(true);
    })();
  }, []);

  async function handleChange(checked: boolean) {
    setPending(true);
    const result = await setAllowNegativeStock(checked);
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setValue(checked);
    toast.success(checked ? "Đã cho phép tồn âm" : "Đã tắt cho phép tồn âm");
  }

  if (!loaded) return null;

  return (
    <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
      <Checkbox
        checked={value}
        disabled={pending}
        onCheckedChange={(checked) => void handleChange(checked === true)}
      />
      Cho phép tồn âm (mặc định: không cho)
    </label>
  );
}
