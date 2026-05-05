// src/sections/section06.data.ts

export interface ProcessCard {
  id: number;
  bulletColor: string;
  title: string;
  image: string;
  description: string;
}

export const processCards: ProcessCard[] = [
  {
    id: 1,
    bulletColor: "bg-[#0064FF]",
    title: "제조 제품 레퍼런스",
    image: "/image/section06/process001.webp",
    description: "건강식품 브랜드 제품 실제 생산된 레퍼런스를 기반으로 진행됩니다"
  },
  {
    id: 2,
    bulletColor: "bg-[#34C759]",
    title: "소량 제조 가능",
    image: "/image/section06/process002.webp",
    description: "처음 시작하시는 분들도 부담 없이 제조를 시작할 수 있습니다"
  },
  {
    id: 3,
    bulletColor: "bg-[#AF52DE]",
    title: "견적 시스템",
    image: "/image/section06/process003.webp",
    description: "제품 선택 후 즉시 예상 견적을 확인할 수 있습니다"
  },
  {
    id: 4,
    bulletColor: "bg-[#FF9500]",
    title: "디자인 컨펌",
    image: "/image/section06/process004.webp",
    description: "라벨 및 패키지 디자인 컨펌 과정까지 함께 진행됩니다"
  },
  {
    id: 5,
    bulletColor: "bg-[#191F28]",
    title: "제조 파트너",
    image: "/image/section06/process05.jpg",
    description: "두고커넥트의 검증된 제조사만 진행합니다"
  }
];