import { mapRouteError, ok } from "@/lib/server/http";
import { getOwnedManufacturerId, requireServerUser } from "@/lib/server/supabase";

export async function PATCH(request: Request) {
  try {
    const { currencyCode } = await request.json();
    const { supabase, user } = await requireServerUser(request);
    const manufacturer = await getOwnedManufacturerId(supabase, user.id);

    if (!manufacturer.id) {
      throw new Error("연결된 제조사 계정이 없습니다.");
    }

    if (!["USD", "KRW", "NZD"].includes(currencyCode)) {
      throw new Error("지원하지 않는 통화입니다.");
    }

    const [{ count: productCount, error: productCountError }, { count: containerCount, error: containerCountError }] = await Promise.all([
      supabase
        .from("manufacturer_products")
        .select("*", { count: "exact", head: true })
        .eq("manufacturer_id", manufacturer.id)
        .gt("base_price", 0),
      supabase
        .from("manufacturer_container_options")
        .select("*", { count: "exact", head: true })
        .eq("manufacturer_id", manufacturer.id)
        .gt("add_price", 0),
    ]);

    if (productCountError || containerCountError) {
      throw new Error(productCountError?.message || containerCountError?.message || "통화 변경 가능 여부를 확인하지 못했습니다.");
    }

    if ((productCount || 0) > 0 || (containerCount || 0) > 0) {
      throw new Error("가격이 설정된 카탈로그가 있어 통화를 직접 변경할 수 없습니다. 관리자 마이그레이션이 필요합니다.");
    }

    const { error } = await supabase.from("manufacturers").update({ catalog_currency: currencyCode }).eq("id", manufacturer.id);
    if (error) {
      throw new Error(error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
