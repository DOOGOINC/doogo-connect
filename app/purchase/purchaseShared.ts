export type PointPackage = {
  id: string;
  label: string;
  points: number;
  bonusPoints: number;
  amountKrw: number;
};

export type PortOneRequestPaymentParams = {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: "CURRENCY_KRW";
  payMethod: "CARD";
  customer: {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
  };
};

export type PortOnePaymentResponse = {
  paymentId: string;
  txId: string;
  code?: string;
  message?: string;
};

export const DEFAULT_POINT_PACKAGES: PointPackage[] = [
  { id: "starter", label: "기본 패키지", points: 5000, bonusPoints: 0, amountKrw: 5000 },
  { id: "standard", label: "스탠다드 패키지", points: 20000, bonusPoints: 2000, amountKrw: 20000 },
  { id: "premium", label: "프리미엄 패키지", points: 50000, bonusPoints: 7000, amountKrw: 50000 },
];

export const PROFILE_LOOKUP_TIMEOUT_MS = 1200;

export function formatPoints(value: number) {
  return `${Number(value || 0).toLocaleString()}P`;
}

export function formatWon(value: number) {
  return `${Number(value || 0).toLocaleString()}원`;
}
