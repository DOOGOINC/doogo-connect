import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | DOGO CONNECT",
  description: "DOGO CONNECT 개인정보 처리방침입니다.",
};

export default function PrivacyPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-10">
        <section className="space-y-2">
          <p className="text-[14px] text-gray-500">
            시행일: 2026년 1월 1일 | 최종 개정: 2026년 4월 23일
          </p>
          <p className="text-[15px] leading-[1.8] text-gray-700">
            두고커넥트(이하 &quot;회사&quot;)는 건강기능식품 OEM 제조 중개 서비스 제공을 위하여 다음과 같은 개인정보를 수집합니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제1조 (개인정보 수집 항목 및 수집 방법)</h2>
          <div className="space-y-4 text-[15px] leading-[1.8] text-gray-700">
            <ul className="list-disc list-inside ml-2 space-y-2">
              <li><span className="font-bold text-gray-900">의뢰자 회원:</span> 이름, 이메일 주소, 비밀번호, 휴대폰 번호, 회사명(선택), 사업자등록번호(선택)</li>
              <li><span className="font-bold text-gray-900">제조사 파트너:</span> 회사명, 대표자명, 사업자등록번호, 이메일, 연락처, 공장 주소, 보유 인증(GMP·ISO 등)</li>
              <li><span className="font-bold text-gray-900">결제 정보:</span> 거래 내역, 포인트 충전·사용 내역 (카드번호 등 민감 금융 정보는 저장하지 않음)</li>
              <li><span className="font-bold text-gray-900">자동 수집:</span> 접속 IP, 쿠키, 접속 로그, 서비스 이용 기록</li>
            </ul>
            <p>
              회사는 회원가입, 견적 의뢰, 입점 문의, 고객센터 문의, 결제 및 서비스 이용 과정에서 이용자가 직접 입력하거나 서비스 이용 중 생성되는 정보를 수집합니다. 필수 항목은 서비스 제공에 필요한 최소한의 정보이며, 선택 항목은 입력하지 않아도 기본 서비스 이용이 가능합니다.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제2조 (개인정보 수집 및 이용 목적)</h2>
          <ul className="list-disc list-inside ml-2 space-y-1 text-[15px] leading-[1.8] text-gray-700">
            <li>회원 가입 및 본인 확인, 회원 관리</li>
            <li>OEM 제조 견적 의뢰 및 매칭 서비스 제공</li>
            <li>제조사와의 안전한 거래 중개 및 분쟁 처리</li>
            <li>포인트 충전·사용 및 결제 서비스 운영</li>
            <li>공지사항 전달, 고객센터 문의 처리</li>
            <li>서비스 개선을 위한 통계 분석(비식별화 처리)</li>
            <li>법령 준수 및 부정 이용 방지</li>
          </ul>
          <p className="text-[15px] leading-[1.8] text-gray-700">
            회사는 회원가입 및 서비스 이용 시 이용약관과 개인정보 처리방침에 대한 동의를 받고 있으며, 이용자는 동의를 거부할 수 있습니다. 다만 필수 개인정보 수집·이용에 동의하지 않는 경우 회원가입 및 서비스 이용이 제한될 수 있습니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제3조 (개인정보 보유 및 이용 기간)</h2>
          <div className="space-y-4 text-[15px] leading-[1.8] text-gray-700">
            <p>회원 탈퇴 시 즉시 파기합니다. 단, 아래의 경우 관련 법령에 따라 보존합니다.</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>계약·청약철회 기록: 5년 (전자상거래법)</li>
              <li>대금 결제·공급 기록: 5년 (전자상거래법)</li>
              <li>소비자 불만·분쟁처리 기록: 3년 (전자상거래법)</li>
              <li>접속 로그: 3개월 (통신비밀보호법)</li>
            </ul>
            <p>이용자가 개인정보 삭제, 처리 정지 또는 동의 철회를 요청하는 경우 회사는 법령상 보관 의무가 있는 정보를 제외하고 지체 없이 필요한 조치를 진행합니다.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제4조 (개인정보 제3자 제공)</h2>
          <div className="space-y-4 text-[15px] leading-[1.8] text-gray-700">
            <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외입니다.</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령에 의거하거나 수사기관의 적법한 요청이 있는 경우</li>
              <li>제조 의뢰·매칭 서비스 수행을 위해 제조사 파트너에게 필요 최소한의 정보 제공 (이용자 동의 후)</li>
            </ul>
            <div className="rounded-xl bg-gray-50 p-5">
              <p className="font-bold text-gray-900">제조사 파트너 제공 정보</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>제공받는 자: 견적 의뢰 또는 매칭 대상 제조사 파트너</li>
                <li>제공 목적: 견적 산정, 제조 가능 여부 검토, 계약 및 상담 진행</li>
                <li>제공 항목: 이름, 이메일, 연락처, 회사명, 제조 의뢰 내용 및 상담에 필요한 정보</li>
                <li>보유 기간: 제공 목적 달성 시까지 또는 이용자의 동의 철회 시까지. 단, 관련 법령상 보관이 필요한 경우 해당 기간까지 보관</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제5조 (개인정보 처리 위탁)</h2>
          <div className="space-y-4 text-[15px] leading-[1.8] text-gray-700">
            <p>회사는 원활한 서비스 제공을 위하여 다음과 같이 개인정보 처리 업무를 외부 업체에 위탁할 수 있습니다.</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>데이터베이스, 인증, 파일 저장 및 회원 정보 관리: Supabase</li>
              <li>웹 서비스 서버 운영 및 호스팅: Vercel</li>
              <li>결제 처리: PortOne (포트원)</li>
              <li>해외 송금 서비스: Utransfer</li>
              <li>이메일 발송 서비스: Supabase Auth(인증 이메일), Resend(서비스 알림 이메일 사용 시)</li>
            </ul>
            <p>회사는 위탁업무 수행 목적 범위 내에서만 개인정보가 처리되도록 관리하며, 위탁업체 또는 위탁업무 내용이 변경되는 경우 본 처리방침 또는 공지사항을 통해 안내합니다.</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제6조 (이용자의 권리와 행사 방법)</h2>
          <div className="space-y-4 text-[15px] leading-[1.8] text-gray-700">
            <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc list-inside ml-2 space-y-1 text-gray-700">
              <li>개인정보 열람, 정정, 삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
              <li>회원 탈퇴를 통한 개인정보 삭제</li>
              <li>개인정보 수집·이용 및 제3자 제공 동의 철회</li>
            </ul>
            <p>권리 행사는 고객센터, 이메일 또는 서비스 내 계정 설정을 통해 요청할 수 있으며, 회사는 본인 확인 후 관련 법령에 따라 처리합니다.</p>
            <p className="text-gray-900">문의: 고객센터 또는 <span className="font-semibold underline">privacy@dugoconnect.com</span></p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제7조 (쿠키 사용)</h2>
          <p className="text-[15px] leading-[1.8] text-gray-700">
            회사는 이용자에게 맞춤화된 서비스를 제공하기 위해 쿠키를 사용합니다. 브라우저 설정에서 쿠키 허용 여부를 직접 설정할 수 있습니다.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제8조 (개인정보 보호책임자)</h2>
          <div className="space-y-1 text-[15px] leading-[1.8] text-gray-700">
            <p className="font-bold text-gray-900">두고커넥트 개인정보 보호책임자</p>
            <p>이메일: <span className="underline">privacy@dugoconnect.com</span></p>
            <p>전화: 고객센터 운영 시간 내 처리</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제9조 (개인정보의 안전성 확보 조치)</h2>
          <ul className="list-disc list-inside ml-2 space-y-1 text-[15px] leading-[1.8] text-gray-700">
            <li>개인정보 접근 권한의 최소화 및 관리자 접근 통제</li>
            <li>인증 정보와 중요 데이터의 안전한 저장 및 전송 구간 보호</li>
            <li>접속 기록 보관 및 비정상 접근 모니터링</li>
            <li>개인정보 처리 담당자에 대한 보안 관리</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-[20px] font-bold text-gray-900">제10조 (처리방침 변경)</h2>
          <p className="text-[15px] leading-[1.8] text-gray-700">
            회사는 법령, 서비스 내용, 개인정보 처리 방식 변경에 따라 본 처리방침을 개정할 수 있으며, 중요한 변경이 있는 경우 시행 전 서비스 화면 또는 공지사항을 통해 안내합니다.
          </p>
        </section>

      </div>

      <p className="text-[14px] text-[#344054]">본 방침은 2026년 1월 1일부터 시행됩니다. 변경 시 공지사항을 통해 사전 안내합니다.</p>

    </div>
  );
}
