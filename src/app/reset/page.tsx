"use client";
import Link from "next/link";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { supabase } from "@/lib/supabase";
import { useT } from "@/lib/lang";

// Forgotten password, in three steps: the account's email → the 6-digit code from the recovery email (the Supabase
// "Reset password" template shows {{ .Token }}) → a new password, after which the member is signed in.
// Supabase answers the first step the same way whether or not the email has an account, so nothing is revealed here.
const field = "h-12 w-full rounded-md border border-white/12 bg-white/[.04] px-4 text-[16px] text-white placeholder:text-white/35 outline-none transition focus:border-[#4f7dff] focus:bg-white/[.06]";
const btn = "mt-5 h-12 w-full rounded-md bg-[#3f6bff] text-[15px] font-medium text-white transition hover:bg-[#5a80ff] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35";
const ERRORS: Record<string, [string, string]> = {
  over_email_send_rate_limit: ["Too many emails in a short time. Please try again in a few minutes.", "짧은 시간에 메일 요청이 너무 많습니다. 몇 분 뒤에 다시 시도해 주세요."],
  email_address_not_authorized: ["We cannot send email to this address yet. Please contact us.", "아직 이 주소로는 메일을 보낼 수 없습니다. 문의해 주세요."],
  otp_expired: ["The code is wrong or has expired. Check it, or send a new one.", "인증번호가 틀렸거나 만료되었습니다. 다시 확인하시거나 새로 받아 주세요."],
  weak_password: ["That password is too weak. Use at least 8 characters with letters and numbers.", "비밀번호가 너무 쉽습니다. 영문과 숫자를 섞어 8자 이상으로 정해 주세요."],
  same_password: ["Please choose a password different from the old one.", "이전과 다른 비밀번호를 정해 주세요."],
};

export default function Reset() {
  const t = useT();
  const [step, setStep] = useState<"email" | "code" | "password" | "done">("email");
  const [email, setEmail] = useState(""), [code, setCode] = useState(""), [pw, setPw] = useState(""), [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fail = (e: { code?: string } | null, fallback: [string, string]) => { const m = (e?.code && ERRORS[e.code]) || fallback; setMsg({ ok: false, text: t(m[0], m[1]) }); };
  const okEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  const send = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/reset` });
    setBusy(false);
    if (error) return fail(error, ["We could not send the email. Please try again later.", "메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요."]);
    setStep("code"); setCode(""); setMsg({ ok: true, text: t("If this email has an account, a 6-digit code is on its way. Check your inbox (and spam).", "가입된 이메일이면 6자리 인증번호를 보냈습니다. 받은편지함(스팸함 포함)을 확인해 주세요.") });
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return;
    if (step === "email") return send();
    setMsg(null); setBusy(true);
    if (step === "code") {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "recovery" });
      setBusy(false);
      if (error) return fail({ code: "otp_expired" }, ERRORS.otp_expired);
      setStep("password"); return;
    }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return fail(error, ["We could not change the password. Please try again.", "비밀번호를 바꾸지 못했습니다. 다시 시도해 주세요."]);
    setStep("done");
  };
  const ready = step === "email" ? okEmail : step === "code" ? /^\d{6}$/.test(code) : pw.length >= 8 && pw === pw2;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#050608] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(180,138,92,.16),rgba(5,6,8,0)_70%)]" />
      <SiteNav />
      <main className="relative mx-auto flex w-full max-w-[400px] flex-col items-center px-5 pt-[10vh] pb-20 max-md:pt-10">
        <h1 className="text-center font-serif text-[clamp(32px,4vw,42px)] leading-tight text-[#f3eee6]">{t("Reset your password", "비밀번호 재설정")}</h1>
        <ol className="mt-5 flex gap-2 font-mono text-[11.5px] tracking-[0.1em] text-white/40">
          {[["EMAIL", "이메일"], ["CODE", "인증번호"], ["NEW PASSWORD", "새 비밀번호"]].map(([en, ko], i) => (
            <li key={en} className={["email", "code", "password"].indexOf(step) >= i || step === "done" ? "text-white/85" : ""}>{i ? "› " : ""}{t(en, ko)}</li>))}
        </ol>

        {step === "done" ? (
          <div className="mt-10 w-full text-center">
            <p className="text-[16px] text-[#6fcf8a]">{t("Your password has been changed and you are signed in.", "비밀번호를 바꿨고 로그인되었습니다.")}</p>
            <Link href="/#ICN" className="mt-6 flex h-12 w-full items-center justify-center rounded-md bg-[#3f6bff] text-[15px] font-medium text-white transition hover:bg-[#5a80ff]">{t("Open the simulator", "시뮬레이터 열기")}</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-9 w-full">
            {step === "email" && <>
              <label htmlFor="email" className="mb-2 block text-[14px] font-medium text-white/85">{t("Email you signed up with", "가입한 이메일")}</label>
              <input id="email" type="email" autoComplete="email" autoFocus placeholder={t("Your email address", "이메일 주소")} value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </>}
            {step === "code" && <>
              <label htmlFor="code" className="mb-2 block text-[14px] font-medium text-white/85">{t("6-digit code", "6자리 인증번호")} <span className="font-normal text-white/45">· {email.trim()}</span></label>
              <input id="code" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} placeholder="000000" value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className={`${field} text-center font-mono text-[24px] tracking-[0.5em]`} />
            </>}
            {step === "password" && <>
              <label htmlFor="pw" className="mb-2 block text-[14px] font-medium text-white/85">{t("New password", "새 비밀번호")}</label>
              <input id="pw" type="password" autoComplete="new-password" autoFocus minLength={8} placeholder={t("At least 8 characters", "8자 이상")} value={pw} onChange={(e) => setPw(e.target.value)} className={field} />
              <label htmlFor="pw2" className="mt-5 mb-2 block text-[14px] font-medium text-white/85">{t("Confirm new password", "새 비밀번호 확인")}</label>
              <input id="pw2" type="password" autoComplete="new-password" placeholder={t("Type it again", "한 번 더 입력")} value={pw2} onChange={(e) => setPw2(e.target.value)} className={field} />
              {pw2 && pw !== pw2 && <p className="mt-2 text-[13.5px] text-[#f0625c]">{t("The two passwords do not match.", "두 비밀번호가 다릅니다.")}</p>}
            </>}
            <button type="submit" disabled={!ready || busy} className={btn}>
              {busy ? t("Please wait…", "처리 중…") : step === "email" ? t("Send the code", "인증번호 보내기") : step === "code" ? t("Confirm", "확인") : t("Change password", "비밀번호 변경")}
            </button>
            {step === "code" && <button type="button" disabled={busy} onClick={send} className="mt-4 w-full text-center text-[14px] text-white/55 underline-offset-4 transition hover:text-white hover:underline">{t("Send a new code", "인증번호 다시 받기")}</button>}
          </form>
        )}

        {msg && <p role="status" className={`mt-6 text-center text-[14.5px] ${msg.ok ? "text-white/70" : "text-[#f0625c]"}`}>{msg.text}</p>}
        <p className="mt-9 text-[15px] text-white/55"><Link href="/login" className="text-[#7d9bff] transition hover:text-[#a3b9ff]">{t("Back to log in", "로그인으로 돌아가기")}</Link></p>
      </main>
    </div>
  );
}
