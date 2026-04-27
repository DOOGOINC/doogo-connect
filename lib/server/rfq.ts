import "server-only";

import {
  createOrderNumber,
  createRequestNumber,
  type ReviewFormValues,
  type RfqRequestStatus,
} from "@/lib/rfq";
import { normalizeCurrencyCode } from "@/lib/currency";
import { getPricingBySelection } from "@/app/estimate/_data/catalog";
import { awardUserPoints, ensurePointSettings, spendUserPoints } from "./points";
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
  pending: ["request_cancelled"],
  reviewing: ["payment_completed"],
  payment_in_progress: ["payment_completed"],
  payment_completed: [],
  production_waiting: [],
  production_started: [],
  production_in_progress: [],
  manufacturing_completed: [],
  delivery_completed: ["fulfilled"],
  quoted: ["payment_completed"],
  ordered: [],
  completed: ["fulfilled"],
  request_cancelled: [],
  rejected: [],
  fulfilled: [],
  refunded: [],
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
  if (currentStatus === "fulfilled" || currentStatus === "refunded" || currentStatus === "request_cancelled") {
    return false;
  }

  if (nextStatus === "fulfilled") {
    return currentStatus === "delivery_completed" || currentStatus === "completed";
  }

  if (nextStatus === "refunded") {
    return true;
  }

  if (nextStatus === "request_cancelled") {
    return false;
  }

  return nextStatus !== currentStatus;
}

function canClientUpdateStatus(currentStatus: RfqRequestStatus, nextStatus: RfqRequestStatus) {
  if (currentStatus === nextStatus) {
    return true;
  }

  if (currentStatus === "fulfilled" || currentStatus === "refunded" || currentStatus === "rejected" || currentStatus === "request_cancelled") {
    return false;
  }

  if (nextStatus === "payment_completed") {
    return currentStatus === "reviewing" || currentStatus === "payment_in_progress" || currentStatus === "quoted";
  }

  return ALLOWED_CLIENT_TRANSITIONS[currentStatus]?.includes(nextStatus) ?? false;
}

function calculateCommissionSnapshot(totalPrice: number, commissionRatePercent: number) {
  const safeTotal = Math.max(0, Number(totalPrice || 0));
  const safeRate = Math.max(0, Math.min(100, Number(commissionRatePercent || 0)));
  const commissionAmount = Number((safeTotal * (safeRate / 100)).toFixed(2));
  const settlementAmount = Number((safeTotal - commissionAmount).toFixed(2));

  return {
    commissionRatePercent: safeRate,
    commissionAmount,
    settlementAmount,
  };
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
  const pointReason = `${manufacturerResult.data.name}:${product.name}`;
  const pointClient = createServiceRoleClient();
  const pointSettings = pointClient ? await ensurePointSettings(pointClient) : null;

  if (role === "member") {
    if (!pointClient) {
      throw new Error("SERVER_CONFIG_MISSING");
    }

    const rfqRequestPointCost = pointSettings?.rfqRequestCostPoints || 5000;

    const { data: wallet, error: walletError } = await pointClient
      .from("user_point_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError) {
      throw new Error(walletError.message);
    }

    if (Number(wallet?.balance || 0) < rfqRequestPointCost) {
      throw new Error("포인트가 부족합니다. 포인트 충전 후 다시 진행해 주세요.");
    }
  }

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
  const commissionSnapshot = calculateCommissionSnapshot(
    pricing.totalPrice,
    pointSettings?.commissionRatePercent || 3
  );

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
    commission_rate_percent: commissionSnapshot.commissionRatePercent,
    commission_amount: commissionSnapshot.commissionAmount,
    settlement_amount: commissionSnapshot.settlementAmount,
    commission_locked_at: new Date().toISOString(),
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
        commission_rate_percent: commissionSnapshot.commissionRatePercent,
        commission_amount: commissionSnapshot.commissionAmount,
        settlement_amount: commissionSnapshot.settlementAmount,
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

  if (role === "member" && pointClient) {
    try {
      await spendUserPoints(pointClient, {
        userId: user.id,
        amount: pointSettings?.rfqRequestCostPoints || 5000,
        reason: pointReason,
        category: "manufacturing_request",
        createdBy: user.id,
      });
    } catch (pointError) {
      const { error: rollbackError } = await pointClient.from("rfq_requests").delete().eq("id", data.id).eq("client_id", user.id);
      if (rollbackError) {
        console.warn("Failed to rollback RFQ after point spend failure:", rollbackError.message);
      }
      throw pointError;
    }
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

async function refundRfqRequestPoints(params: {
  requestId: string;
  clientId: string;
  manufacturerName: string;
  productName: string;
  createdBy: string;
}) {
  const admin = createServiceRoleClient();
  if (!admin) {
    throw new Error("SERVER_CONFIG_MISSING");
  }

  const refundReason = `${params.manufacturerName}:${params.productName}`;
  const { data: spendRows, error: spendError } = await admin
    .from("point_ledger")
    .select("amount, created_at")
    .eq("user_id", params.clientId)
    .eq("category", "manufacturing_request")
    .eq("reason", refundReason)
    .order("created_at", { ascending: false })
    .limit(1);

  if (spendError) {
    throw new Error(spendError.message);
  }

  const spentAmount = Math.abs(Number(spendRows?.[0]?.amount || 0));
  if (spentAmount <= 0) {
    return;
  }

  const { data: existingRefund, error: existingRefundError } = await admin
    .from("point_ledger")
    .select("id")
    .eq("user_id", params.clientId)
    .eq("category", "manufacturing_request_refund")
    .eq("reason", refundReason)
    .gte("created_at", spendRows?.[0]?.created_at || new Date(0).toISOString())
    .maybeSingle();

  if (existingRefundError) {
    throw new Error(existingRefundError.message);
  }
  if (existingRefund) {
    return;
  }

  await awardUserPoints(admin, {
    userId: params.clientId,
    amount: spentAmount,
    reason: refundReason,
    category: "manufacturing_request_refund",
    createdBy: params.createdBy,
  });
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
    if (rfqRequest.status === "fulfilled" || rfqRequest.status === "refunded" || rfqRequest.status === "request_cancelled") {
      throw new Error("최종 처리된 주문의 메모는 수정할 수 없습니다.");
    }

    patch.admin_memo = input.adminMemo?.trim() || null;
    eventType = "admin_memo_changed";
  }

  if (input.status) {
    if (rfqRequest.status === input.status) {
      return rfqRequest;
    }

    if ((rfqRequest.status === "fulfilled" || rfqRequest.status === "refunded" || rfqRequest.status === "request_cancelled") && !isMaster) {
      throw new Error("최종 처리된 주문 상태는 변경할 수 없습니다.");
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
      if (!canClientUpdateStatus(rfqRequest.status as RfqRequestStatus, input.status)) {
        console.warn("Invalid client RFQ transition", {
          requestId: input.requestId,
          currentStatus: rfqRequest.status,
          nextStatus: input.status,
          userId: user.id,
        });
        throw new Error("의뢰자는 허용된 상태만 변경할 수 있습니다.");
      }
      patch.status = input.status;
      eventType = "status_changed";
    }
  }

  if (patch.status === "fulfilled" && !rfqRequest.commission_locked_at) {
    const admin = createServiceRoleClient();
    const pointSettings = admin ? await ensurePointSettings(admin) : null;
    const snapshot = calculateCommissionSnapshot(
      Number(rfqRequest.total_price || 0),
      Number(rfqRequest.commission_rate_percent || pointSettings?.commissionRatePercent || 3)
    );
    patch.commission_rate_percent = snapshot.commissionRatePercent;
    patch.commission_amount = snapshot.commissionAmount;
    patch.settlement_amount = snapshot.settlementAmount;
    patch.commission_locked_at = new Date().toISOString();
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

  if (patch.status === "rejected" && rfqRequest.status !== "rejected") {
    await refundRfqRequestPoints({
      requestId: input.requestId,
      clientId: rfqRequest.client_id,
      manufacturerName: rfqRequest.manufacturer_name || "",
      productName: rfqRequest.product_name || "",
      createdBy: user.id,
    });
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

export async function updateRfqClientPaymentStatus(
  input: {
    requestId: string;
    status: Extract<RfqRequestStatus, "payment_completed">;
  },
  request?: Request
) {
  const { supabase, user } = await requireServerUser(request);

  const { data: rfqRequest, error } = await supabase
    .from("rfq_requests")
    .select("*")
    .eq("id", input.requestId)
    .eq("client_id", user.id)
    .maybeSingle();

  if (error || !rfqRequest) {
    throw new Error("주문 정보를 찾을 수 없습니다.");
  }

  if (rfqRequest.status !== "reviewing" && rfqRequest.status !== "payment_in_progress" && rfqRequest.status !== "quoted") {
    throw new Error("제조사 승인 후 결제 대기 상태에서만 결제 완료 처리할 수 있습니다.");
  }

  if (rfqRequest.status === input.status) {
    return rfqRequest;
  }

  const { data: updated, error: updateError } = await supabase
    .from("rfq_requests")
    .update({ status: input.status })
    .eq("id", input.requestId)
    .eq("client_id", user.id)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  const role = await getProfileRole(supabase, user.id);
  await insertRfqAuditLog(supabase, {
    rfq_request_id: input.requestId,
    actor_id: user.id,
    actor_role: role,
    event_type: "client_payment_status_changed",
    previous_status: rfqRequest.status,
    next_status: input.status,
    previous_admin_memo: rfqRequest.admin_memo,
    next_admin_memo: rfqRequest.admin_memo,
  });

  return updated;
}
