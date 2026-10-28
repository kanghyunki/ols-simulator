"use client";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { useT } from "@/lib/lang";

// Privacy policy: what the sign-up (email or Google) collects, why, how long, who processes it. Linked from the sign-up
// consent, the Google sign-in notice, the footer, and the Google OAuth consent screen (branding → privacy policy link).
const UPDATED = "2026-10-28", OFFICER = "강현기 (Hyunki Kang)", MAIL = "kanghhkk@gmail.com";

const SECTIONS: [string, string, [string, string][]][] = [
  ["1. What we collect", "1. 수집하는 개인정보", [
    ["Email sign-up: name, email address, password (stored only as a hash by the authentication service), mobile number with country code, date of birth.", "이메일 가입: 이름, 이메일 주소, 비밀번호(인증 서비스에 암호화된 값으로만 저장), 국가번호를 포함한 휴대전화 번호, 생년월일."],
    ["Google sign-in: the name, email address and profile picture of your Google account. We do not receive your Google password or any other Google data.", "Google 로그인: Google 계정의 이름, 이메일 주소, 프로필 사진. Google 비밀번호나 그 밖의 Google 데이터는 받지 않습니다."],
    ["Automatically: sign-in time and the technical records the hosting service keeps (IP address, browser type) for security and operation.", "자동 수집: 로그인 시각, 보안과 운영을 위해 호스팅 서비스가 남기는 기술 기록(IP 주소, 브라우저 종류)."],
  ]],
  ["2. Why we use it", "2. 이용 목적", [
    ["To create and manage your account, let you sign in, and keep the simulator for members.", "회원 계정의 생성·관리, 로그인, 회원 전용 시뮬레이터 이용 제공."],
    ["To answer your questions and tell you about important changes to the service.", "문의 응대와 서비스의 중요한 변경 사항 안내."],
    ["We do not sell your information or use it for advertising.", "개인정보를 판매하거나 광고에 이용하지 않습니다."],
  ]],
  ["3. How long we keep it", "3. 보유 및 이용 기간", [
    ["Until you leave the service; it is deleted without delay when you ask us to delete your account.", "회원 탈퇴 시까지 보유하며, 계정 삭제를 요청하시면 지체 없이 파기합니다."],
    ["Where a law requires a record to be kept for longer, only that record is kept, for the period the law sets.", "법령에 따라 보존해야 하는 기록이 있으면 해당 기록만 법령이 정한 기간 동안 보관합니다."],
  ]],
  ["4. Who processes it for us", "4. 처리 위탁 및 국외 이전", [
    ["Supabase (authentication and database, servers in Seoul, Republic of Korea).", "Supabase: 회원 인증 및 데이터베이스 (서버 위치: 대한민국 서울)."],
    ["Vercel (website hosting, United States).", "Vercel: 웹사이트 호스팅 (미국)."],
    ["Google (only when you choose Google sign-in, to confirm your identity).", "Google: Google 로그인을 선택한 경우 본인 확인에 한함."],
    ["We do not give your information to anyone else unless you agree or the law requires it.", "이용자의 동의가 있거나 법령이 요구하는 경우 외에는 제3자에게 제공하지 않습니다."],
  ]],
  ["5. Your rights", "5. 이용자의 권리", [
    ["You can ask to see, correct, delete or stop the processing of your information at any time by email (below). We reply within 10 days.", "언제든지 아래 이메일로 개인정보의 열람·정정·삭제·처리정지를 요청하실 수 있으며, 10일 이내에 답변드립니다."],
    ["You can withdraw your consent by deleting your account. If you signed in with Google, you can also remove access in your Google account settings (Security → Third-party connections).", "회원 탈퇴로 동의를 철회할 수 있습니다. Google로 로그인한 경우 Google 계정 설정(보안 → 서드 파티 연결)에서도 접근 권한을 해제할 수 있습니다."],
  ]],
  ["6. Security", "6. 안전성 확보 조치", [
    ["Passwords are stored only as hashes, every connection is encrypted (HTTPS), and member data is protected by row-level security in the database.", "비밀번호는 암호화된 값으로만 저장하고, 모든 통신은 HTTPS로 암호화하며, 회원 정보는 데이터베이스의 행 단위 보안(RLS)으로 보호합니다."],
  ]],
];

export default function Privacy() {
  const t = useT();
  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#050608] text-white">
      <SiteNav />
      <main className="mx-auto w-full max-w-[760px] px-5 pt-16 pb-24 max-md:pt-8">
        <p className="font-mono text-[12px] tracking-[0.14em] text-white/55">{t("PRIVACY POLICY", "개인정보처리방침")}</p>
        <h1 className="mt-4 font-serif text-[clamp(34px,4.4vw,52px)] leading-tight text-[#f3eee6]">{t("How OLS Simulator handles your information", "OLS Simulator의 개인정보 처리")}</h1>
        <p className="mt-5 text-[15.5px] leading-relaxed text-white/70">{t("OLS Simulator (ols-simulator.vercel.app) collects only what it needs to run member accounts. This policy explains what that is and what you can do about it.", "OLS Simulator(ols-simulator.vercel.app)는 회원 계정 운영에 필요한 최소한의 개인정보만 수집합니다. 이 방침은 어떤 정보를 어떻게 처리하는지, 이용자가 무엇을 요청할 수 있는지 설명합니다.")}</p>

        {SECTIONS.map(([h, hk, items]) => (
          <section key={h} className="mt-11">
            <h2 className="text-[19px] font-semibold text-white">{t(h, hk)}</h2>
            <ul className="mt-4 list-disc space-y-2.5 pl-5 text-[15px] leading-relaxed text-white/75 marker:text-white/30">
              {items.map(([en, ko]) => <li key={en}>{t(en, ko)}</li>)}
            </ul>
          </section>
        ))}

        <section className="mt-11">
          <h2 className="text-[19px] font-semibold text-white">{t("7. Contact", "7. 개인정보 보호책임자")}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/75">{t("Privacy officer", "보호책임자")}: {OFFICER}<br />{t("Email", "이메일")}: <a href={`mailto:${MAIL}`} className="text-[#7d9bff] hover:text-[#a3b9ff]">{MAIL}</a></p>
          <p className="mt-3 text-[14px] leading-relaxed text-white/50">{t("If you are not satisfied with our answer, you can also contact the Personal Information Infringement Report Center (privacy.kisa.or.kr, 118).", "답변이 충분하지 않으면 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118)에 문의하실 수 있습니다.")}</p>
        </section>

        <p className="mt-14 border-t border-white/[.07] pt-6 text-[13px] text-white/40">{t(`Effective ${UPDATED}.`, `시행일 ${UPDATED}`)} · <Link href="/" className="hover:text-white/70">OLS Simulator</Link></p>
      </main>
    </div>
  );
}
