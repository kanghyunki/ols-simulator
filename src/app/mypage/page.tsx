"use client";
import Link from "next/link";
import { useEffect } from "react";
import { SiteNav } from "@/components/site-nav";
import { Avatar } from "@/components/avatar";
import { profileOf, supabase, useSession } from "@/lib/supabase";
import { useT } from "@/lib/lang";

// My page: the signed-in member's profile (Google picture and name, or the email sign-up's name), how they sign in, and
// the way into the simulator. Signed out, it sends you to /login.
const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : "—");

export default function MyPage() {
  const t = useT(), session = useSession();
  useEffect(() => { if (session === null) location.replace("/login"); }, [session]);
  if (!session) return <div className="fixed inset-0 bg-[#050608]" />;
  const me = profileOf(session), u = session.user, google = u.app_metadata?.provider === "google";
  const row = (k: string, v: React.ReactNode) => <div className="flex justify-between gap-6 border-b border-white/[.07] py-3.5 text-[15px]"><span className="text-white/50">{k}</span><span className="truncate text-right text-white/90">{v}</span></div>;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#050608] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(180,138,92,.16),rgba(5,6,8,0)_70%)]" />
      <SiteNav />
      <main className="relative mx-auto flex w-full max-w-[460px] flex-col items-center px-5 pt-[8vh] pb-20 max-md:pt-8">
        <Avatar name={me.name} src={me.avatar} size={96} />
        <h1 className="mt-5 text-center font-serif text-[clamp(28px,3.4vw,36px)] leading-tight text-[#f3eee6]">{me.name}</h1>
        <p className="mt-1 text-[15px] text-white/55">{me.email}</p>

        <div className="mt-9 w-full">
          {row(t("Signed in with", "로그인 방식"), google ? "Google" : t("Email", "이메일"))}
          {row(t("Member since", "가입일"), day(u.created_at))}
          {row(t("Last sign-in", "최근 로그인"), day(u.last_sign_in_at))}
        </div>

        <Link href="/#ICN" className="mt-9 flex h-12 w-full items-center justify-center rounded-md bg-[#3f6bff] text-[15px] font-medium text-white transition hover:bg-[#5a80ff]">{t("Open the simulator", "시뮬레이터 열기")}</Link>
        <button type="button" onClick={() => supabase.auth.signOut()} className="mt-3 flex h-12 w-full items-center justify-center rounded-md border border-white/15 text-[15px] text-white/85 transition hover:bg-white/[.06]">{t("Log out", "로그아웃")}</button>
        <p className="mt-8 text-center text-[13px] leading-relaxed text-white/40">{t("To change your details or delete your account, see the ", "정보 변경이나 회원 탈퇴는 ")}<Link href="/privacy" className="underline underline-offset-4 hover:text-white/70">{t("privacy policy", "개인정보처리방침")}</Link>{t(" for how to ask us.", "의 연락처로 요청해 주세요.")}</p>
      </main>
    </div>
  );
}
