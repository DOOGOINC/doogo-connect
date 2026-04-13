export interface SuccessStory {
  id: number;
  brandName: string;
  launchDate: string;
  productName: string;
  manufacturer: string;
  description: string;
  tags: string[];
  countryCode: string;
  image: string;
  rating: number;
  revenue: string;
  orderVolume: string;
}

export const SUCCESS_STORIES: SuccessStory[] = [
  {
    id: 1,
    brandName: "Green Vita",
    launchDate: "2025.06 론칭",
    productName: "빌베리 60,000mg 캡슐",
    manufacturer: "DOOGOBIO NZ",
    description: "두고커넥트 덕분에 복잡한 해외 OEM 절차를 쉽게 진행했습니다. 소량으로 시작해 브랜드를 론칭할 수 있었어요.",
    tags: ["빌베리 60,000mg 캡슐"],
    countryCode: "NZ",
    image: "/image/image01.jpg",
    rating: 5,
    revenue: "NZD 45,000/월",
    orderVolume: "초기 200개 -> 현재 1,000개/월",
  },
  {
    id: 2,
    brandName: "K-Pure",
    launchDate: "2025.09 론칭",
    productName: "콜라겐 젤리 스틱",
    manufacturer: "한미양행",
    description: "실시간 견적 시스템이 정말 편리했습니다. 가격 협상부터 디자인 컨펌까지 한 플랫폼에서 해결했어요.",
    tags: ["콜라겐 젤리 스틱"],
    countryCode: "JP",
    image: "/image/image02.jpg",
    rating: 5,
    revenue: "₩ 4,000,000/월",
    orderVolume: "초기 50개 -> 현재 500개/월",
  },
  {
    id: 3,
    brandName: "VitaEuro",
    launchDate: "2025.11 론칭",
    productName: "오가닉 터메릭 캡슐",
    manufacturer: "BioVital",
    description: "유럽 인증 제조사와 직접 연결해줘서 글로벌 진출이 수월했습니다. 전담 매니저 지원도 큰 도움이 됐어요.",
    tags: ["오가닉 터메릭 캡슐"],
    countryCode: "DE",
    image: "/image/image03.jpg",
    rating: 5,
    revenue: "USD 28,000/월",
    orderVolume: "초기 100개 -> 현재 800개/월",
  },
];
