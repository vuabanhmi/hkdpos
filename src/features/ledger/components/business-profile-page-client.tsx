"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBusinessProfile, updateBusinessProfile, type BusinessProfile } from "@/features/ledger/actions/tax-settings";

export function BusinessProfilePageClient() {
  const [profile, setProfile] = useState<BusinessProfile>({ name: "", address: "", taxCode: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await getBusinessProfile();
      setProfile(p);
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    const result = await updateBusinessProfile(profile);
    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Đã lưu thông tin hộ kinh doanh");
  }

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Đang tải...</p>;
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Thông tin hộ kinh doanh</h1>
      <p className="text-sm text-muted-foreground">
        Dùng để in trên sổ doanh thu và các chứng từ. Nhập đúng theo giấy chứng nhận đăng ký hộ kinh doanh.
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="bp-name">Tên hộ, cá nhân kinh doanh</Label>
          <Input
            id="bp-name"
            value={profile.name ?? ""}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-address">Địa chỉ</Label>
          <Input
            id="bp-address"
            value={profile.address ?? ""}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bp-tax-code">Mã số thuế</Label>
          <Input
            id="bp-tax-code"
            value={profile.taxCode ?? ""}
            onChange={(e) => setProfile({ ...profile, taxCode: e.target.value })}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Đang lưu..." : "Lưu"}
      </Button>
    </div>
  );
}
