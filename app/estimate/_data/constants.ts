import { Factory, FlaskConical, Hash, Palette, ShoppingCart } from "lucide-react";

type DiscountConfig = Record<number, number>;

export interface Manufacturer {
  id: number;
  name: string;
  location: string;
  rating: number;
  description: string;
  tags: string[];
  products: string[];
  image: string;
  logo: string;
}

export interface Product {
  id: string;
  category: string;
  name: string;
  description: string;
  basePrice: number;
  discountConfig: DiscountConfig;
  image: string;
}

export interface ProductDetail {
  keyFeatures: string[];
  ingredients: string[];
  directions?: string[];
  cautions?: string[];
}

export interface ContainerOption {
  id: string;
  name: string;
  description: string;
  priceText: string;
  addPrice: number;
  image: string;
}

export interface DesignOption {
  id: string;
  name: string;
  price: number;
}

export interface DesignServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
}

export interface DesignPackageItem {
  id: string;
  name: string;
  badge?: string;
  description?: string;
  price: number;
  included: string[];
}

export interface DesignExtraItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

export interface DiscountRow {
  qty: number;
  label: string;
  discount: number;
  note: string;
}

export const MANUFACTURERS: Manufacturer[] = [
  {
    id: 1,
    name: "DOOGOBIO NZ",
    location: "뉴질랜드 오클랜드",
    rating: 4.9,
    description: "GMP-Registered 시설. 캡슐, 소프트젤, 정제, 마누카 기반 포뮬러 제조.",
    tags: ["GMP", "FDA", "NSF", "ISO 9001"],
    products: ["캡슐", "정제", "소프트젤"],
    image: "/image/manufacturer/manufacturer01.webp",
    logo: "/image/manufacturer/logo/doogobio_logo.webp",
  },
  {
    id: 2,
    name: "(주)한미양행",
    location: "한국 경기도",
    rating: 4.9,
    description: "KFDA 기반 국내외 유통 대응. 건강기능식품 다제형 OEM 제조 가능.",
    tags: ["KFDA", "GMP", "HACCP"],
    products: ["정제", "젤리", "분말 스틱"],
    image: "/image/manufacturer/manufacturer02.webp",
    logo: "/image/manufacturer/logo/hanmi_logo.webp",
  },
  {
    id: 3,
    name: "BioVital Manufacturing",
    location: "돌일 뭔헨",
    rating: 4.9,
    description: "유럽 CE 인증 및 식물성 원료 중심. 프리미엄 건강식품 OEM 파트너.",
    tags: ["CE", "GMP", "EU Organic", "ISO 22000"],
    products: ["비건 캡슐", "비건 소프트젤", "허브 추출물"],
    image: "/image/manufacturer/manufacturer03.webp",
    logo: "/image/manufacturer/logo/supplement_8.webp",
  },
];

const createProduct = (product: Product): Product => product;

const createProductVariant = (base: Product, override: Partial<Product> & Pick<Product, "id">): Product => ({
  ...base,
  ...override,
});

const PRODUCT_INDEX: Record<string, Product> = {
  p1: createProduct({
    id: "p1",
    category: "항산화/눈건강",
    name: "빌베리 60,000mg 60캡슐",
    description: "빌베리 추출물 60,000mg 기반의 눈 건강 및 항산화 포뮬러.",
    basePrice: 17.5,
    discountConfig: {
      50: 0,
      100: 3,
      200: 6,
      500: 8,
      1000: 10,
    },
    image: "/image/image01.jpg",
  }),
  p2: createProduct({
    id: "p2",
    category: "오일",
    name: "오메가-3 소프트젤",
    description: "정제 어유 100% 기반의 rTG 오메가-3 소프트젤 포뮬러.",
    basePrice: 25,
    discountConfig: {
      50: 0,
      100: 6,
      200: 12,
      500: 20,
      1000: 26,
    },
    image: "/image/image02.jpg",
  }),
  p3: createProduct({
    id: "p3",
    category: "유산균",
    name: "프로바이오틱스 캡슐",
    description: "100억 CFU 보장형 복합 유산균 포뮬러.",
    basePrice: 22,
    discountConfig: {
      50: 0,
      100: 5,
      200: 12,
      500: 18,
      1000: 26,
    },
    image: "/image/image03.jpg",
  }),
  p4: createProductVariant(
    {
      id: "p1",
      category: "기능성 강화",
      name: "빌베리 60,000mg 60캡슐",
      description: "빌베리 추출물 60,000mg 기반의 눈 건강 및 항산화 포뮬러.",
      basePrice: 17.5,
      discountConfig: {
        50: 0,
        100: 3,
        200: 6,
        500: 8,
        1000: 10,
      },
      image: "/image/image01.jpg",
    },
    {
      id: "p4",
      name: "빌베리 60,000mg 60캡슐 1",
    }
  ),
  p5: createProductVariant(
    {
      id: "p2",
      category: "오일",
      name: "오메가-3 소프트젤",
      description: "정제 어유 100% 기반의 rTG 오메가-3 소프트젤 포뮬러.",
      basePrice: 25,
      discountConfig: {
        50: 0,
        100: 6,
        200: 12,
        500: 20,
        1000: 26,
      },
      image: "/image/image02.jpg",
    },
    {
      id: "p5",
      name: "오메가-3 소프트젤 1",
    }
  ),
  p6: createProductVariant(
    {
      id: "p3",
      category: "유산균",
      name: "프로바이오틱스 캡슐",
      description: "100억 CFU 보장형 복합 유산균 포뮬러.",
      basePrice: 22,
      discountConfig: {
        50: 0,
        100: 5,
        200: 12,
        500: 18,
        1000: 26,
      },
      image: "/image/image03.jpg",
    },
    {
      id: "p6",
      name: "프로바이오틱스 캡슐 1",
    }
  ),
  "m2-p1": createProduct({
    id: "m2-p1",
    category: "Tablet",
    name: "Multi Balance Tablet",
    description: "Daily wellness tablet formula optimized for large-volume OEM runs.",
    basePrice: 18.5,
    discountConfig: {
      50: 0,
      100: 5,
      200: 10,
      500: 18,
      1000: 24,
    },
    image: "/image/image04.jpg",
  }),
  "m2-p2": createProduct({
    id: "m2-p2",
    category: "Jelly",
    name: "Collagen Beauty Jelly",
    description: "Portable jelly stick format with a focus on taste and convenience.",
    basePrice: 26,
    discountConfig: {
      50: 0,
      100: 6,
      200: 12,
      500: 19,
      1000: 26,
    },
    image: "/image/image03.jpg",
  }),
  "m2-p3": createProduct({
    id: "m2-p3",
    category: "Powder Stick",
    name: "Red Ginseng Powder Stick",
    description: "Quick-mix powder stick suited for domestic and export health brands.",
    basePrice: 23.5,
    discountConfig: {
      50: 0,
      100: 5,
      200: 11,
      500: 18,
      1000: 25,
    },
    image: "/image/image05.jpg",
  }),
  "m3-p1": createProduct({
    id: "m3-p1",
    category: "Vegan Capsule",
    name: "Organic Turmeric Capsule",
    description: "EU-friendly vegan capsule format with premium botanical positioning.",
    basePrice: 24,
    discountConfig: {
      50: 0,
      100: 5.5,
      200: 11.5,
      500: 19.5,
      1000: 30,
    },
    image: "/image/image03.jpg",
  }),
  "m3-p2": createProduct({
    id: "m3-p2",
    category: "Vegan Softgel",
    name: "Plant Omega Softgel",
    description: "Algae-based softgel designed for premium global supplement lines.",
    basePrice: 28,
    discountConfig: {
      50: 0,
      100: 6,
      200: 12,
      500: 20,
      1000: 27,
    },
    image: "/image/image02.jpg",
  }),
  "m3-p3": createProduct({
    id: "m3-p3",
    category: "Botanical Extract",
    name: "Herbal Immune Blend",
    description: "Botanical extract blend targeted at premium OEM wellness portfolios.",
    basePrice: 27,
    discountConfig: {
      50: 0,
      100: 5,
      200: 11,
      500: 18,
      1000: 25,
    },
    image: "/image/image01.jpg",
  }),
};

export const PRODUCTS: Product[] = ["p1", "p2", "p3", "p4", "p5", "p6"].map((productId) => PRODUCT_INDEX[productId]);

const MANUFACTURER_PRODUCT_IDS: Record<number, string[]> = {
  1: ["p1", "p2", "p3", "p4", "p5", "p6"],
  2: ["m2-p1", "m2-p2", "m2-p3"],
  3: ["m3-p1", "m3-p2", "m3-p3"],
};

export const MANUFACTURER_PRODUCTS: Record<number, Product[]> = Object.fromEntries(
  Object.entries(MANUFACTURER_PRODUCT_IDS).map(([manufacturerId, productIds]) => [
    Number(manufacturerId),
    productIds.map((productId) => PRODUCT_INDEX[productId]).filter(Boolean),
  ])
) as Record<number, Product[]>;

const SHARED_PRODUCT_DETAILS: Record<"eye" | "omega" | "probiotic", ProductDetail> = {
  eye: {
    keyFeatures: [
      "눈 건강 및 시력 지원",
      "빌베리 추출물 60,000mg 함유",
      "마리골드 꽃에서 추출한 루테인 20mg",
      "황반 보호를 위한 제아잔틴",
      "고강도 항산화 포뮬러",
      "식물성 캡슐 60정",
      "뉴질랜드 제조",
    ],
    ingredients: [
      "Bilberry Extract (equiv. to 60,000mg fresh bilberry)",
      "Marigold Extract (equiv. to Lutein 20mg)",
      "Grape Seed Extract (equiv. to 3,600mg)",
      "Beta Carotene (6mg, equiv. to Vitamin A 3mg)",
      "Eyebright Extract (equiv. to 100mg)",
      "Vitamin B1 (Thiamine) 9mg",
      "Vitamin B2 (Riboflavin) 9.8mg",
      "Zinc (from Zinc Oxide) 5mg",
      "Vitamin E 4mg",
      "Zeaxanthin (from Marigold) 100mcg",
    ],
    directions: [
      "하루 1캡슐, 식사와 함께 또는 의료 전문가 지시에 따라 복용하세요.",
      "권장량을 초과하지 마세요.",
    ],
    cautions: [
      "건강 보조식품은 균형 잡힌 식단을 대체할 수 없습니다.",
      "임산부, 수유 중이거나 약물 복용 중인 경우 복용 전 의사 또는 약사와 상담하세요.",
      "어린이에게 적합하지 않습니다.",
      "서늘하고 건조한 곳에 보관하고 어린이 손에 닿지 않게 하세요.",
    ],
  },
  omega: {
    keyFeatures: [
      "고순도 rTG 오메가-3 포뮬러",
      "심혈관 및 혈행 건강 서포트",
      "EPA 및 DHA 균형 설계",
      "산패 관리 중심의 원료 사용",
      "프리미엄 소프트젤 적용 가능",
    ],
    ingredients: [
      "Refined Fish Oil Concentrate",
      "EPA",
      "DHA",
      "Natural Tocopherol",
      "Gelatin / Glycerin / Purified Water",
    ],
    directions: ["하루 1회, 1캡슐을 식후에 섭취하세요."],
    cautions: ["특이 체질이거나 약물을 복용 중인 경우 전문가와 상담 후 섭취하세요."],
  },
  probiotic: {
    keyFeatures: [
      "장 건강 및 배변 활동 지원",
      "복합 프로바이오틱스 배합",
      "100억 CFU 보장 설계",
      "일상 섭취에 적합한 캡슐 타입",
      "프리바이오틱스 확장 가능",
    ],
    ingredients: [
      "Lactobacillus Acidophilus",
      "Bifidobacterium Lactis",
      "Lactobacillus Plantarum",
      "Fructooligosaccharide",
      "Microcrystalline Cellulose",
    ],
    directions: ["하루 1캡슐을 충분한 물과 함께 섭취하세요."],
    cautions: ["직사광선을 피해 보관하고 개봉 후에는 가급적 빠르게 섭취하세요."],
  },
};

export const PRODUCT_DETAILS: Record<string, ProductDetail> = {
  p1: SHARED_PRODUCT_DETAILS.eye,
  p2: SHARED_PRODUCT_DETAILS.omega,
  p3: SHARED_PRODUCT_DETAILS.probiotic,
  p4: SHARED_PRODUCT_DETAILS.eye,
  p5: SHARED_PRODUCT_DETAILS.omega,
  p6: SHARED_PRODUCT_DETAILS.probiotic,
  "m2-p1": {
    keyFeatures: [
      "데일리 밸런스 멀티비타민 컨셉",
      "정제 타입 대량 제조 적합",
      "기본 영양 밸런스 설계",
      "국내 유통용 OEM 확장 가능",
      "브랜드별 포뮬러 커스터마이징 지원",
    ],
    ingredients: [
      "Vitamin B Complex",
      "Vitamin C",
      "Vitamin D3",
      "Zinc",
      "Magnesium",
    ],
  },
  "m2-p2": {
    keyFeatures: [
      "콜라겐 중심 뷰티 젤리 포뮬러",
      "휴대성이 좋은 스틱 젤리 타입",
      "맛과 기능성의 균형 설계",
      "이너뷰티 브랜드에 적합",
      "젤리 제형 OEM 최적화",
    ],
    ingredients: [
      "Fish Collagen Peptide",
      "Elastin",
      "Vitamin C",
      "Hyaluronic Acid",
      "Pomegranate Concentrate",
    ],
  },
  "m2-p3": {
    keyFeatures: [
      "간편 섭취용 파우더 스틱",
      "홍삼 컨셉 건강기능 포뮬러",
      "국내외 유통 대응 가능",
      "스틱 포장 제형 제조 적합",
      "브랜드 커스텀 배합 확장 가능",
    ],
    ingredients: [
      "Red Ginseng Extract Powder",
      "Dextrin",
      "Vitamin B6",
      "Taurine",
      "Natural Flavor",
    ],
  },
  "m3-p1": {
    keyFeatures: [
      "비건 캡슐 기반 프리미엄 포뮬러",
      "강황 및 식물성 원료 중심 설계",
      "글로벌 웰니스 브랜드 적합",
      "항산화 포지셔닝 가능",
      "프리미엄 OEM 라인 대응",
    ],
    ingredients: [
      "Organic Turmeric Extract",
      "Black Pepper Extract",
      "Ginger Extract",
      "Rice Bran",
      "Pullulan Capsule",
    ],
  },
  "m3-p2": {
    keyFeatures: [
      "해조류 기반 비건 오메가 소프트젤",
      "프리미엄 글로벌 포지셔닝",
      "DHA 중심 설계 가능",
      "지속가능성 스토리텔링 적합",
      "식물성 소프트젤 대응",
    ],
    ingredients: [
      "Algal Oil",
      "DHA",
      "Mixed Tocopherols",
      "Modified Starch",
      "Glycerin",
    ],
  },
  "m3-p3": {
    keyFeatures: [
      "식물성 면역 블렌드 포뮬러",
      "허브 추출물 기반 프리미엄 제품",
      "글로벌 건강식품 라인 적합",
      "캡슐 및 분말 확장 가능",
      "브랜드별 기능 포지셔닝 지원",
    ],
    ingredients: [
      "Elderberry Extract",
      "Echinacea Extract",
      "Zinc",
      "Vitamin C",
      "Astragalus Extract",
    ],
  },
};

export const getProductDetails = (productId: string | null): ProductDetail | null => {
  if (!productId) return null;
  return PRODUCT_DETAILS[productId] || null;
};

export const getProductsByManufacturer = (manufacturerId: number | null): Product[] => {
  if (!manufacturerId) return [];
  return MANUFACTURER_PRODUCTS[manufacturerId] || [];
};

export const getProductById = (_manufacturerId: number | null, productId: string | null): Product | null => {
  if (!productId) return null;
  return PRODUCT_INDEX[productId] || null;
};

export const CONTAINERS: ContainerOption[] = [
  {
    id: "box",
    name: "박스 + 블리스터 포장",
    description: "프리미엄 패키지 구성이 필요한 제품에 적합한 포장 방식.",
    priceText: "+$1.38",
    addPrice: 1.38,
    image: "/image/image03.jpg",
  },
  {
    id: "hdpe",
    name: "HDPE 플라스틱 병",
    description: "식품 등급 고밀도 용기. 기본형 건강식품 패키지에 적합.",
    priceText: "+$1.80",
    addPrice: 1.8,
    image: "/image/image03.jpg",
  },
  {
    id: "pouch",
    name: "지퍼 파우치",
    description: "스틱 및 분말류에 적합한 파우치 타입 포장.",
    priceText: "+$20.00",
    addPrice: 20,
    image: "/image/image03.jpg",
  },
  {
    id: "metal",
    name: "메탈 케이스",
    description: "고급 라인업에 적합한 프리미엄 메탈 패키지.",
    priceText: "+$80.00",
    addPrice: 80,
    image: "/image/image03.jpg",
  },
];

const CONTAINER_INDEX: Record<string, ContainerOption> = Object.fromEntries(
  CONTAINERS.map((container) => [container.id, container])
) as Record<string, ContainerOption>;

export const PRODUCT_CONTAINERS: Record<string, string[]> = {
  p1: ["box", "hdpe"],
  p2: ["hdpe", "box", "metal"],
  p3: ["hdpe", "pouch"],
  p4: ["box", "hdpe"],
  p5: ["hdpe", "box", "metal"],
  p6: ["hdpe", "pouch"],
  "m2-p1": ["hdpe", "box"],
  "m2-p2": ["pouch", "metal"],
  "m2-p3": ["pouch", "hdpe"],
  "m3-p1": ["box", "metal"],
  "m3-p2": ["hdpe", "box", "metal"],
  "m3-p3": ["pouch", "box"],
};

export const getContainersByProduct = (productId: string | null): ContainerOption[] => {
  if (!productId) return [];

  const allowedContainerIds = PRODUCT_CONTAINERS[productId] || [];
  return allowedContainerIds
    .map((containerId) => CONTAINER_INDEX[containerId])
    .filter(Boolean);
};

export const getContainerById = (productId: string | null, containerId: string | null): ContainerOption | null => {
  if (!containerId) return null;
  return getContainersByProduct(productId).find((container) => container.id === containerId) || null;
};

export const DESIGN_OPTIONS: DesignOption[] = [
  { id: "basic", name: "기본 디자인 (무료)", price: 0 },
  { id: "premium", name: "프리미엄 커스텀 디자인", price: 500 },
  { id: "package", name: "패키지 박스 설계 포함", price: 800 },
];

export const DESIGN_SERVICES: DesignServiceItem[] = [
  { id: "logoDesign", name: "로고 디자인", price: 172.50 },
  { id: "packagingDesign", name: "패키징 디자인", price: 172.50 },
  { id: "3Dmokup", name: "대표이미지(3D 목업 썸네일)", price: 115.00 },
  { id: "detailedPageDesign", name: "상세페이지 디자인", price: 172.50 },
];

export const DESIGN_PACKAGES: DesignPackageItem[] = [
  {
    id: "fullDesignPackage",
    name: "전체 디자인 패키지",
    badge: "추천",
    description: "개별 선택 대비 할인 적용",
    price: 500,
    included: ["로고 디자인", "패키징 디자인", "대표이미지(3D 목업 썸네일)", "상세페이지"],
  },
  {
    id: "premiumPackage",
    name: "프리미엄 패키지",
    badge: "프리미엄",
    description: "브랜드 론칭용 통합 디자인 패키지",
    price: 650,
    included: ["로고 디자인", "패키징 디자인", "대표이미지(3D 목업 썸네일)", "상세페이지", "상세페이지 GIF"],
  },
];

export const DESIGN_EXTRAS: DesignExtraItem[] = [
  {
    id: "productExplanationVideo",
    name: "제품 설명 영상",
    description: "30초~1분 제품 소개 영상 제작. SNS/쇼핑몰 활용 최적화.",
    price: 150.00,
  },
  {
    id: "brandStoryVideo",
    name: "브랜드 스토리 영상",
    description: "브랜드 스토리텔링 영상 (2~3분). 브랜드 신뢰도 향상.",
    price: 200.00,
  },
];

export const getDesignOptionById = (designId: string | null) =>
  DESIGN_OPTIONS.find((option) => option.id === designId) || null;

export const getDesignSelectionsSummary = ({
  design,
  designServices,
  designPackage,
  designExtras,
}: {
  design: string | null;
  designServices: string[];
  designPackage: string | null;
  designExtras: string[];
}): DesignOption => {
  const selectedServices = DESIGN_SERVICES.filter((service) => designServices.includes(service.id));
  const selectedPackage = DESIGN_PACKAGES.find((item) => item.id === designPackage) || null;
  const selectedExtras = DESIGN_EXTRAS.filter((extra) => designExtras.includes(extra.id));
  const legacyDesign = getDesignOptionById(design);

  const servicesPrice = selectedServices.reduce((sum, item) => sum + item.price, 0);
  const packagePrice = selectedPackage?.price || 0;
  const extrasPrice = selectedExtras.reduce((sum, item) => sum + item.price, 0);
  const fallbackPrice = !selectedServices.length && !selectedPackage && !selectedExtras ? legacyDesign?.price || 0 : 0;
  const price = servicesPrice + packagePrice + extrasPrice + fallbackPrice;

  const nameParts = [
    selectedPackage?.name,
    ...selectedServices.map((item) => item.name),
    ...selectedExtras.map((item) => item.name),
  ].filter(Boolean);

  return {
    id: selectedPackage?.id || design || "custom-design",
    name: nameParts.length > 0 ? nameParts.join(", ") : legacyDesign?.name || "기본 디자인",
    price,
  };
};

export const STEPS = [
  { id: 1, name: "제조사 선택", icon: Factory },
  { id: 2, name: "제품 선택", icon: FlaskConical },
  { id: 3, name: "수량 & 용기", icon: Hash },
  { id: 4, name: "디자인 옵션", icon: Palette },
  { id: 5, name: "주문 확인", icon: ShoppingCart },
];

export const getDynamicDiscounts = (product: Product | null): DiscountRow[] => {
  if (!product || !product.discountConfig) {
    return [{ qty: 50, label: "50개 (최소)", discount: 1, note: "0% (최소)" }];
  }

  const quantities = Object.keys(product.discountConfig).map(Number).sort((a, b) => a - b);

  return quantities.map((qty) => {
    const percent = product.discountConfig[qty];
    const discountRate = 1 - percent / 100;

    return {
      qty,
      label: `${qty.toLocaleString()}개${qty === 50 ? " (최소)" : ""}`,
      discount: discountRate,
      note: percent === 0 ? "0% (기준가)" : `${percent}% 할인`,
    };
  });
};

export const getPricingBySelection = ({
  product,
  container,
  quantity,
  designPrice = 0,
}: {
  product: Product | null;
  container?: ContainerOption | null;
  quantity: number;
  designPrice?: number;
}) => {
  const discounts = getDynamicDiscounts(product);
  const currentDiscountRow =
    [...discounts].reverse().find((discount) => quantity >= discount.qty) || {
      qty: 50,
      discount: 1,
      label: "50개 (최소)",
      note: "0%",
    };

  const discountedProductUnitPrice = (product?.basePrice || 0) * currentDiscountRow.discount;
  const containerUnitPrice = container?.addPrice || 0;
  const unitPrice = discountedProductUnitPrice + containerUnitPrice;
  const subtotal = unitPrice * quantity;
  const totalPrice = subtotal + designPrice;

  return {
    discounts,
    currentDiscountRow,
    discountedProductUnitPrice,
    containerUnitPrice,
    unitPrice,
    subtotal,
    totalPrice,
  };
};
