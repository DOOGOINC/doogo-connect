import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 | DOGO CONNECT",
  description: "DOGO CONNECT 이용약관입니다.",
};

export default function TermsPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-10">
        <section className="space-y-2">
          <p className="text-[14px] text-gray-500">
            시행일: 2026년 1월 1일 | 최종 개정: 2026년 4월 23일
          </p>
          <p className="text-[15px] leading-[1.8] text-gray-700">
            본 약관은 두고커넥트(이하 &quot;회사&quot;)가 운영하는 건강기능식품 OEM 제조 중개 플랫폼 &quot;DUGO CONNECT&quot;(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 회사와 회원 간의 권리·의무·책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제1조 (목적)</h2>
          <p className="text-[15px] leading-[1.8] text-gray-700">
            본 약관은 두고커넥트(이하 &quot;회사&quot;)가 운영하는 건강기능식품 OEM 제조 중개 플랫폼 &quot;DUGO CONNECT&quot;(이하 &quot;서비스&quot;)의 이용 조건 및 절차, 회사와 회원 간의 권리·의무·책임 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제2조 (정의)</h2>
          <ul className="list-disc list-inside ml-2 space-y-2 text-[15px] leading-[1.8] text-gray-700">
            <li><span className="font-bold text-gray-900">서비스:</span> 회사가 제공하는 OEM 제조 의뢰 및 제조사 매칭 플랫폼 일체</li>
            <li><span className="font-bold text-gray-900">의뢰자 회원:</span> 건강기능식품 OEM 제조를 의뢰하는 개인 또는 사업자</li>
            <li><span className="font-bold text-gray-900">제조사 파트너:</span> 플랫폼에 등록된 건강기능식품 제조사</li>
            <li><span className="font-bold text-gray-900">포인트:</span> 서비스 이용 시 필요한 가상 화폐 (제조 견적 의뢰 시 5,000P 차감)</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제3조 (서비스 이용)</h2>
          <div className="space-y-4 text-[15px] leading-[1.8] text-gray-700">
            <p>서비스 이용을 위해서는 회원 가입이 필요합니다. 회원은 정확한 정보를 제공해야 하며, 허위 정보 제공 시 서비스 이용이 제한될 수 있습니다.</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>의뢰자 회원은 제조 견적 의뢰 1건당 5,000P가 차감됩니다.</li>
              <li>제조사 취소 시 차감된 포인트는 자동 환불됩니다.</li>
              <li>플랫폼 수수료: 총 판매금액(원료비+박스비+캡슐비 합산)의 3%</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제4조 (제조 의뢰 및 계약)</h2>
          <ul className="list-disc list-inside ml-2 space-y-1 text-[15px] leading-[1.8] text-gray-700">
            <li>의뢰자는 두고커넥트를 통해 제조 견적을 신청하고, 제조사와의 매칭 및 계약을 진행합니다.</li>
            <li>의뢰자와 제조사 간 직거래로 인한 분쟁에 대해 회사는 책임지지 않습니다.</li>
            <li>두고커넥트는 의뢰자와 제조사 사이의 안전 거래를 위한 중개자 역할을 수행합니다.</li>
            <li>분쟁 발생 시 두고커넥트의 분쟁/중재 센터를 통해 처리를 요청할 수 있습니다.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제5조 (포인트 정책)</h2>
          <div className="bg-gray-50 p-6 rounded-xl space-y-2 text-[15px] leading-[1.8] text-gray-700">
            <p>1. 포인트 유효기간: 충전일로부터 1년</p>
            <p>2. 포인트는 현금으로 환불되지 않습니다 (단, 결제 취소 시 원결제 수단으로 환불).</p>
            <p>3. 회원 탈퇴 시 잔여 포인트는 즉시 소멸됩니다.</p>
            <p>4. 추천인 코드로 가입 시 10,000P가 자동 지급됩니다.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제6조 (회원의 의무)</h2>
          <ul className="list-disc list-inside ml-2 space-y-1 text-[15px] leading-[1.8] text-gray-700">
            <li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위 금지</li>
            <li>서비스의 운영을 방해하거나 다른 회원에게 피해를 주는 행위 금지</li>
            <li>플랫폼을 통하지 않은 제조사와의 직접 거래 유도 금지</li>
            <li>저작권, 지식재산권 등을 침해하는 콘텐츠 등록 금지</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제7조 (서비스 제공의 제한)</h2>
          <div className="space-y-4 text-[15px] leading-[1.8] text-gray-700">
            <p>회사는 다음의 경우 서비스 제공을 제한하거나 중단할 수 있습니다.</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>시스템 점검, 업그레이드 등 기술적 사유</li>
              <li>천재지변, 국가비상사태 등 불가항력적 사유</li>
              <li>회원의 약관 위반 행위 발견 시</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제8조 (책임의 한계)</h2>
          <p className="text-[15px] leading-[1.8] text-gray-700">
            두고커넥트는 의뢰자와 제조사 간의 제조 계약에 대한 직접적인 책임을 지지 않습니다. 회사는 안전한 거래 환경 제공을 위해 노력하나, 제조 품질·납기 지연 등 제조 과정에서 발생하는 분쟁에 대해 중재 역할만을 수행합니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제9조 (회원가입 및 필수 동의)</h2>
          <div className="space-y-4 text-[15px] leading-[1.8] text-gray-700">
            <p>
              회원은 회원가입 시 본 약관과 개인정보 처리방침의 내용을 확인하고 필수 동의 항목에 동의해야 서비스를 이용할 수 있습니다. 필수 동의를 거부하는 경우 회원가입 및 서비스 이용이 제한될 수 있습니다.
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>이용약관 동의: 서비스 이용 조건, 회원의 권리·의무, 포인트 및 거래 정책 적용</li>
              <li>개인정보 처리방침 동의: 회원관리, 본인 확인, 문의 응답, 견적·매칭 서비스 제공을 위한 개인정보 수집·이용</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제10조 (개인정보 보호 및 외부 서비스 이용)</h2>
          <div className="space-y-4 text-[15px] leading-[1.8] text-gray-700">
            <p>
              회사는 서비스 제공을 위해 이름, 이메일 주소, 비밀번호, 휴대폰 번호, 회사 정보, 견적 의뢰 내용, 결제 및 서비스 이용 기록 등 필요한 범위의 개인정보를 처리합니다. 구체적인 수집 항목, 이용 목적, 보관 기간, 제3자 제공 및 처리 위탁에 관한 사항은 개인정보 처리방침에서 정합니다.
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>데이터베이스, 인증, 파일 저장 및 회원 정보 관리: Supabase</li>
              <li>웹 서비스 서버 운영 및 호스팅: Vercel</li>
              <li>이메일 발송: Supabase Auth 및 Resend 사용 시 해당 이메일 발송 업무</li>
              <li>이용자는 개인정보 열람, 정정, 삭제, 처리 정지 및 동의 철회를 요청할 수 있습니다.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제11조 (준거법 및 관할)</h2>
          <p className="text-[15px] leading-[1.8] text-gray-700">
            본 약관은 대한민국 법률에 따라 해석되며, 서비스 이용에 관한 분쟁은 서울중앙지방법원을 제1심 관할법원으로 합니다.
          </p>
        </section>

        <p className="text-[15px] text-gray-500 pt-4">본 약관은 2026년 1월 1일부터 시행됩니다.</p>
      </div>

    </div>
  );
}
