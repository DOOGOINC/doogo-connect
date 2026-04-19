import "server-only";

import {
  createOrderNumber,
  createRequestNumber,
  type ReviewFormValues,
  type RfqRequestStatus,
} from "@/lib/rfq";
import { normalizeCurrencyCode } from "@/lib/currency";
import { getPricingBySelection } from "@/app/estimate/_data/catalog";
import { createServiceRoleClient, getProfileRole, requireServerUser, userOwnsManufacturer } from "./supabase";

type SubmitRfqInput = {
  manufacturerId: number;
  productId: string;
  containerId?: string | null;
  designOptionId?: string | null;
  designPackageId?: string | null;
  designServiceIds?: string[];
  designExtraIds?: string[];
  quantity: number;
  reviewForm: ReviewFormValues;
};

type UpdateRfqInput = {
  requestId: string;
  status?: RfqRequestStatus;
  adminMemo?: string | null;
};

const ALLOWED_CLIENT_TRANSITIONS: Record<RfqRequestStatus, RfqRequestStatus[]> = {
  pending: [],
  reviewing: [],
  quoted: [],
  ordered: [],
  completed: ["fulfilled"],
  rejected: [],
  fulfilled: [],
};

function requireTrimmed(value: string, label: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label}을(를) 입력해 주세요.`);
  }
  return trimmed;
}

function normalizeStringArray(value: string[] | undefined) {
  return (value || []).map((item) => item.trim()).filter(Boolean);
}

function canManufacturerUpdateStatus(currentStatus: RfqRequestStatus, nextStatus: RfqRequestStatus) {
  if (currentStatus === "fulfilled") {
    return false;
  }

  if (nextStatus === "fulfilled") {
    return currentStatus === "completed";
  }

  return nextStatus !== currentStatus;
}

export async function createRfqRequest(input: SubmitRfqInput, request?: Request) {
  const { supabase, user } = await requireServerUser(request);
  const role = await getProfileRole(supabase, user.id);

  if (role !== "member" && role !== "manufacturer" && role !== "master") {
    throw new Error("FORBIDDEN");
  }

  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("수량이 올바르지 않습니다.");
  }

  const manufacturerId = Number(input.manufacturerId);
  if (!Number.isInteger(manufacturerId) || manufacturerId <= 0) {
    throw new Error("제조사를 다시 선택해 주세요.");
  }

  const designServiceIds = normalizeStringArray(input.designServiceIds);
  const designExtraIds = normalizeStringArray(input.designExtraIds);

  const [
    manufacturerResult,
    productResult,
    containerResult,
    designOptionResult,
    designPackageResult,
    designServicesResult,
    designExtrasResult,
  ] = await Promise.all([
    supabase.from("manufacturers").select("id, name, catalog_currency").eq("id", manufacturerId).maybeSingle(),
    supabase
      .from("manufacturer_products")
      .select("id, name, base_price, payment_currency, container_ids, design_service_ids, design_package_ids, design_extra_ids, manufacturer_id, discount_config, is_active")
      .eq("id", input.productId)
      .eq("manufacturer_id", manufacturerId)
      .eq("is_active", true)
      .maybeSingle(),
    input.containerId
      ? supabase
          .from("manufacturer_container_options")
          .select("id, name, add_price, manufacturer_id, is_active, payment_currency")
          .eq("id", input.containerId)
          .eq("manufacturer_id", manufacturerId)
          .eq("is_active", true)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    input.designOptionId
      ? supabase
          .from("manufacturer_design_options")
          .select("id, name, price, manufacturer_id, is_active, payment_currency")
          .eq("id", input.designOptionId)
          .eq("manufacturer_id", manufacturerId)
          .eq("is_active", true)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    input.designPackageId
      ? supabase
          .from("manufacturer_design_packages")
          .select("id, name, price, manufacturer_id, is_active, payment_currency")
          .eq("id", input.designPackageId)
          .eq("manufacturer_id", manufacturerId)
          .eq("is_active", true)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    designServiceIds.length
      ? supabase
          .from("manufacturer_design_services")
          .select("id, name, price, manufacturer_id, is_active, payment_currency")
          .eq("manufacturer_id", manufacturerId)
          .eq("is_active", true)
          .in("id", designServiceIds)
      : Promise.resolve({ data: [], error: null }),
    designExtraIds.length
      ? supabase
          .from("manufacturer_design_extras")
          .select("id, name, price, manufacturer_id, is_active, payment_currency")
          .eq("manufacturer_id", manufacturerId)
          .eq("is_active", true)
          .in("id", designExtraIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (manufacturerResult.error || !manufacturerResult.data) {
    throw new Error("제조사 정보를 확인할 수 없습니다.");
  }
  if (productResult.error || !productResult.data) {
    throw new Error("상품 정보를 확인할 수 없습니다.");
  }

  const product = productResult.data;
  const container = containerResult.data;
  const currencyCode = normalizeCurrencyCode(product.payment_currency || manufacturerResult.data.catalog_currency || "USD");
  if (container && normalizeCurrencyCode((container as { payment_currency?: string | null }).payment_currency || "USD") !== currencyCode) {
    throw new Error("상품과 결제통화가 다른 용기는 선택할 수 없습니다.");
  }

  if (input.containerId && (!container || !(product.container_ids || []).includes(input.containerId))) {
    throw new Error("선택한 용기를 사용할 수 없습니다.");
  }

  if (designServicesResult.error || designExtrasResult.error || designOptionResult.error || designPackageResult.error) {
    throw new Error("디자인 옵션을 확인할 수 없습니다.");
  }

  if (designServicesResult.data && designServicesResult.data.length !== designServiceIds.length) {
    throw new Error("선택한 디자인 서비스가 유효하지 않습니다.");
  }

  if (designExtrasResult.data && designExtrasResult.data.length !== designExtraIds.length) {
    throw new Error("선택한 추가 옵션이 유효하지 않습니다.");
  }

  if (designPackageResult.data && normalizeCurrencyCode((designPackageResult.data as { payment_currency?: string | null }).payment_currency || "USD") !== currencyCode) {
    throw new Error("상품과 결제통화가 다른 디자인 패키지는 선택할 수 없습니다.");
  }
  if ((designServicesResult.data || []).some((item) => normalizeCurrencyCode((item as { payment_currency?: string | null }).payment_currency || "USD") !== currencyCode)) {
    throw new Error("상품과 결제통화가 다른 디자인 서비스는 선택할 수 없습니다.");
  }
  if ((designExtrasResult.data || []).some((item) => normalizeCurrencyCode((item as { payment_currency?: string | null }).payment_currency || "USD") !== currencyCode)) {
    throw new Error("상품과 결제통화가 다른 추가 옵션은 선택할 수 없습니다.");
  }

  const designPrice =
    (designOptionResult.data?.price || 0) +
    (designPackageResult.data?.price || 0) +
    ((designServicesResult.data || []).reduce((sum, item) => sum + Number(item.price || 0), 0) || 0) +
    ((designExtrasResult.data || []).reduce((sum, item) => sum + Number(item.price || 0), 0) || 0);

  const pricing = getPricingBySelection({
    product: {
      id: product.id,
      manufacturerId,
      category: "",
      name: product.name,
      description: "",
      paymentCurrency: currencyCode,
      basePrice: Number(product.base_price || 0),
      discountConfig: Object.fromEntries(
        Object.entries(product.discount_config || {}).map(([qty, discount]) => [Number(qty), Number(discount)])
      ),
      image: "",
      keyFeatures: [],
      ingredients: [],
      directions: [],
      cautions: [],
      containerIds: (product.container_ids || []) as string[],
    },
    container: container
      ? {
          id: container.id,
          manufacturerId,
          name: container.name,
          description: "",
          addPrice: Number(container.add_price || 0),
          image: "",
        }
      : null,
    quantity,
    designPrice,
  });

  const reviewForm = input.reviewForm;
  const brandName = requireTrimmed(reviewForm.brandName, "브랜드명");
  const contactName = requireTrimmed(reviewForm.contactName, "담당자명");
  const contactEmail = requireTrimmed(reviewForm.contactEmail, "이메일");
  const contactPhone = requireTrimmed(reviewForm.contactPhone, "연락처");
  const hasFiles = reviewForm.hasFiles === "yes";
  const fileLink = hasFiles ? requireTrimmed(reviewForm.fileLink, "파일 링크") : null;

  const insertPayload = {
    request_number: createRequestNumber(),
    order_number: createOrderNumber(),
    client_id: user.id,
    manufacturer_id: manufacturerId,
    manufacturer_name: manufacturerResult.data.name,
    brand_name: brandName,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    request_note: reviewForm.requestNote.trim() || null,
    admin_memo: null,
    has_files: hasFiles,
    file_link: fileLink,
    product_id: product.id,
    product_name: product.name,
    container_id: container?.id || null,
    container_name: container?.name || null,
    design_option_id: designOptionResult.data?.id || null,
    design_summary:
      [
        designOptionResult.data?.name,
        designPackageResult.data?.name,
        ...(designServicesResult.data || []).map((item) => item.name),
        ...(designExtrasResult.data || []).map((item) => item.name),
      ]
        .filter(Boolean)
        .join(", ") || null,
    design_package_id: designPackageResult.data?.id || null,
    design_service_ids: designServiceIds,
    design_extra_ids: designExtraIds,
    currency_code: currencyCode,
    quantity,
    unit_price: pricing.unitPrice,
    total_price: pricing.totalPrice,
    selection_snapshot: {
      manufacturer_id: manufacturerId,
      manufacturer_name: manufacturerResult.data.name,
      product_id: product.id,
      product_name: product.name,
      container_id: container?.id || null,
      container_name: container?.name || null,
      design_option_id: designOptionResult.data?.id || null,
      design_package_id: designPackageResult.data?.id || null,
      design_service_ids: designServiceIds,
      design_extra_ids: designExtraIds,
      quantity,
      pricing: {
        currency_code: currencyCode,
        product_unit_price: pricing.discountedProductUnitPrice,
        product_amount: pricing.discountedProductUnitPrice * quantity,
        container_unit_price: pricing.containerUnitPrice,
        container_amount: pricing.containerUnitPrice * quantity,
        package_price: Number(designPackageResult.data?.price || 0),
        services: (designServicesResult.data || []).map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price || 0),
        })),
        extras: (designExtrasResult.data || []).map((item) => ({
          id: item.id,
          name: item.name,
          price: Number(item.price || 0),
        })),
        total_price: pricing.totalPrice,
      },
      review_form: {
        brand_name: brandName,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        request_note: reviewForm.requestNote.trim() || null,
        has_files: hasFiles,
        file_link: fileLink,
      },
    },
    status: "pending",
  };

  const { data, error } = await supabase.from("rfq_requests").insert(insertPayload).select("*").single();
  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function insertRfqAuditLog(
  supabase: Awaited<ReturnType<typeof requireServerUser>>["supabase"],
  payload: {
    rfq_request_id: string;
    actor_id: string;
    actor_role: string;
    event_type: string;
    previous_status?: string | null;
    next_status?: string | null;
    previous_admin_memo?: string | null;
    next_admin_memo?: string | null;
  }
) {
  const auditClient = createServiceRoleClient() ?? supabase;
  const { error } = await auditClient.from("rfq_audit_logs").insert(payload);
  if (error) {
    console.warn("Failed to insert rfq audit log:", error.message);
    return false;
  }

  return true;
}

export async function updateRfqRequest(input: UpdateRfqInput, request?: Request) {
  const { supabase, user } = await requireServerUser(request);
  const role = await getProfileRole(supabase, user.id);

  const { data: rfqRequest, error } = await supabase.from("rfq_requests").select("*").eq("id", input.requestId).maybeSingle();
  if (error || !rfqRequest) {
    throw new Error("주문 정보를 찾을 수 없습니다.");
  }

  const isMaster = role === "master";
  const isClient = rfqRequest.client_id === user.id;
  const isManufacturerOwner = await userOwnsManufacturer(supabase, user.id, rfqRequest.manufacturer_id);

  if (!isMaster && !isClient && !isManufacturerOwner) {
    throw new Error("FORBIDDEN");
  }

  const patch: Record<string, unknown> = {};
  let eventType = "";

  if (typeof input.adminMemo !== "undefined") {
    if (!isMaster && !isManufacturerOwner) {
      throw new Error("관리 메모를 수정할 수 없습니다.");
    }
    if (rfqRequest.status === "fulfilled") {
      throw new Error("구매 확정된 주문의 메모는 수정할 수 없습니다.");
    }

    patch.admin_memo = input.adminMemo?.trim() || null;
    eventType = "admin_memo_changed";
  }

  if (input.status) {
    if (rfqRequest.status === input.status) {
      return rfqRequest;
    }

    if (rfqRequest.status === "fulfilled" && !isMaster) {
      throw new Error("구매 확정된 주문 상태는 변경할 수 없습니다.");
    }

    if (isMaster) {
      patch.status = input.status;
      eventType = "status_changed";
    } else if (isManufacturerOwner) {
      if (!canManufacturerUpdateStatus(rfqRequest.status as RfqRequestStatus, input.status)) {
        throw new Error("허용되지 않은 주문 상태 전이입니다.");
      }
      patch.status = input.status;
      eventType = "status_changed";
    } else if (isClient) {
      if (!ALLOWED_CLIENT_TRANSITIONS[rfqRequest.status as RfqRequestStatus].includes(input.status)) {
        throw new Error("의뢰자는 허용된 상태만 변경할 수 있습니다.");
      }
      patch.status = input.status;
      eventType = "status_changed";
    }
  }

  if (!Object.keys(patch).length) {
    throw new Error("변경할 내용이 없습니다.");
  }

  const { data: updated, error: updateError } = await supabase
    .from("rfq_requests")
    .update(patch)
    .eq("id", input.requestId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  await insertRfqAuditLog(supabase, {
    rfq_request_id: input.requestId,
    actor_id: user.id,
    actor_role: role,
    event_type: eventType || "updated",
    previous_status: rfqRequest.status,
    next_status: (patch.status as string | undefined) || rfqRequest.status,
    previous_admin_memo: rfqRequest.admin_memo,
    next_admin_memo: typeof patch.admin_memo === "undefined" ? rfqRequest.admin_memo : ((patch.admin_memo as string | null) || null),
  });

  return updated;
}
