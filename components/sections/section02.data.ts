export interface NavItem {
  href: string;
  label: string;
  id: string;
}

export interface ServiceCard {
  eyebrow: string;
  title: string;
  description: string;
  actionPrimary: string;
  image: string;
  imageSizes: string; 
  className: string;
  href: string;
  eyebrowClassName: string;
  descriptionClassName: string;
  primaryActionClassName: string;
  imageClassName: string;
  overlayClassName: string;
}

export interface PartnerCard {
  name: string;
  category: string;
  description: string;
  image: string;
  imageSizes: string;
  logo: string;
}

export const navItems: NavItem[] = [
  { href: "#section02", label: "공장 연결", id: "section02" },
  { href: "#section03", label: "제조 프로세스", id: "section03" },
  { href: "#section08", label: "인기 제조사", id: "section08" },
  { href: "#section09", label: "성공사례", id: "section09" },
  { href: "#section04", label: "참여 방법", id: "section04" },
];

export const serviceCards: ServiceCard[] = [
  {
    eyebrow: "DOOGO CONNECT Client",
    title: "내 브랜드 제품,\n 직접 만들어보세요",
    description: "제품 선택부터 견적, 제조, 디자인 컨펌까지\n 한 번에 진행할 수 있습니다",
    actionPrimary: "견적 시작하기",
    image: "/image/serviceSh01.jpg",
    imageSizes: "(max-width: 768px) 100vw, 50vw",
    className: "bg-[#1149b7]",
    href: "/estimate",
    eyebrowClassName: "text-white",
    descriptionClassName: "text-slate-100",
    primaryActionClassName: "bg-white text-[#0064FF]", 
    imageClassName: "object-cover object-right-bottom", 
    overlayClassName: "bg-slate-950/40"
  },
  {
    eyebrow: "DOOGO CONNECT Partner",
    title: "공장 영업\n 이제 자동으로 연결하세요",
    description: "의뢰자들이 직접 찾아옵니다. 견적 요청부터 주문까지 두고커넥트에서 연결됩니다",
    actionPrimary: "제조사 입점하기",
    image: "/image/serviceSh05.jpg",
    imageSizes: "(max-width: 768px) 100vw, 50vw",
    className: "bg-[#36393f]",
    href: "#open-modal",
    eyebrowClassName: "text-white",
    descriptionClassName: "text-slate-200",
    primaryActionClassName: "bg-white text-[#191F28]", 
    imageClassName: "object-cover object-right-bottom",
    overlayClassName: "bg-slate-950/50"
  },
];
export const partnerCards: PartnerCard[] = [
  {
    name: "GP KOREA",
    category: "판금 · 제품 디자인 · 국방 / 안전 · 플라스틱 성형 · 연...",
    description: "동광전자에스",
    image: "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?auto=format&fit=crop&w=800&q=80",
    imageSizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw", // 반응형 카드 크기 최적화
    logo: "", 
  },
  {
    name: "정성ENG",
    category: "정밀가공 / 반도체 부품 / 가공 / 3D프린팅 / 금속",
    description: "플러스산업",
    image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80",
    imageSizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
    logo: "",
  },
  {
    name: "엠엠테크",
    category: "연마 / 드로잉 / 절삭 / 정밀부품 / 가공",
    description: "연구개발",
    image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80",
    imageSizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
    logo: "",
  },
  {
    name: "이셀",
    category: "목업 / 특수성형 / 드릴링 / 밀링 / 제작",
    description: "가공 / 제작",
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80",
    imageSizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
    logo: "",
  },
  {
    name: "GP KOREA1",
    category: "판금 · 제품 디자인 · 국방 / 안전 · 플라스틱 성형 · 연...",
    description: "동광전자에스",
    image: "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?auto=format&fit=crop&w=800&q=80",
    imageSizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
    logo: "", 
  },
  {
    name: "정성ENG1",
    category: "정밀가공 / 반도체 부품 / 가공 / 3D프린팅 / 금속",
    description: "플러스산업",
    image: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80",
    imageSizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
    logo: "",
  },
  {
    name: "엠엠테크1",
    category: "연마 / 드로잉 / 절삭 / 정밀부품 / 가공",
    description: "연구개발",
    image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80",
    imageSizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
    logo: "",
  },
  {
    name: "이셀1",
    category: "목업 / 특수성형 / 드릴링 / 밀링 / 제작",
    description: "가공 / 제작",
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80",
    imageSizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
    logo: "",
  },
];