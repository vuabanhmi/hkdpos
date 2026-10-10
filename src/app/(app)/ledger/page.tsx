import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LedgerPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sổ sách</h1>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" nativeButton={false} render={<Link href="/ledger/s2a" />}>
          Sổ doanh thu (S2a-HKD)
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/ledger/periods" />}>
          Khóa kỳ kê khai
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/tax/declaration-helper" />}>
          Bảng tính hỗ trợ kê khai
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/settings/tax" />}>
          Cấu hình thuế
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/settings/business" />}>
          Thông tin hộ kinh doanh
        </Button>
      </div>
    </div>
  );
}
