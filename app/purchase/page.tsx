import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PurchasePageClient } from "./PurchasePageClient";

export default function PurchasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA]">
          <Loader2 className="h-8 w-8 animate-spin text-[#1E49D8]" />
        </div>
      }
    >
      <PurchasePageClient />
    </Suspense>
  );
}
