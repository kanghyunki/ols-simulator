"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { Avatar } from "@/components/avatar";
import { profileOf, supabase, useSession } from "@/lib/supabase";
import { useT } from "@/lib/lang";

// My page, laid out like an account dashboard for a subscription service: a side menu (simulator, home, my details,
// subscription, billing, team; #plan / #billing / #team) and cards. My details: personal information (masked until
// "View details") and the account. Email members' details come from public.ols_members (row-level
// security: read / update own row) and can be edited here; Google members have no row, so their card shows the Google profile.
type Sec = "details" | "plan" | "billing" | "team";
// Plans as in the business plan (annual, VAT excluded); there is no online payment yet, so upgrades go through /contact
const PLANS: [string, string, string, string, string, string][] = [
  ["Pro", "Pro", "Engineers and consultants", "설계사 · 컨설팅", "KRW 9,000,000 / seat / yr", "연 900만 원 / 계정"],
  ["Institution", "기관 라이선스", "Airport operators, aviation authorities, defence", "공항공사 · 지방항공청 · 국방부", "KRW 30–60 M / yr", "연 3,000~6,000만 원"],
  ["Local government", "지자체", "Height limits and noise complaints around airports", "공항 주변 지자체 · 고도제한 · 소음 민원", "KRW 12,000,000 / yr", "연 1,200만 원"],
  ["Project", "프로젝트 라이선스", "ADB and World Bank projects", "ADB · 세계은행 사업", "USD 15,000 / project / yr", "연 1.5만 달러 / 프로젝트"],
];
type Member = { name: string | null; phone_country: string | null; phone_code: string | null; phone: string | null; birth_date: string | null };
const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : "—");
const MASK = "*****";
const input = "h-10 w-full rounded-md border border-white/12 bg-white/[.04] px-3 text-[15px] text-white outline-none transition focus:border-[#4f7dff] [color-scheme:dark]";
const pillBtn = "h-9 rounded-full border border-white/25 px-4 text-[13.5px] text-white/90 transition hover:bg-white/[.07] disabled:opacity-40";

export default function MyPage() {
  const t = useT(), session = useSession();
  const [m, setM] = useState<Member | null | undefined>(undefined), [show, setShow] = useState(false), [edit, setEdit] = useState<Member | null>(null);
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null), [sec, setSec] = useState<Sec>("details");
  useEffect(() => { const read = () => { const h = location.hash.slice(1); setSec(h === "plan" || h === "billing" || h === "team" ? h : "details"); };
    read(); addEventListener("hashchange", read); return () => removeEventListener("hashchange", read); }, []);
  useEffect(() => { if (session === null) location.replace("/login"); }, [session]);
  useEffect(() => { if (!session) return;
    supabase.from("ols_members").select("name, phone_country, phone_code, phone, birth_date").eq("id", session.user.id).maybeSingle().then(({ data }) => setM(data)); }, [session]);
  if (!session) return <div className="fixed inset-0 bg-[#050608]" />;
  const me = profileOf(session), u = session.user, google = u.app_metadata?.provider === "google";

  const save = async () => { if (!edit) return; setBusy(true); setMsg(null);
    const { error } = await supabase.from("ols_members").update({ name: edit.name?.trim() || null, phone: edit.phone?.replace(/\D/g, "") || null, birth_date: edit.birth_date || null }).eq("id", u.id);
    setBusy(false);
    if (error) return setMsg({ ok: false, text: t("Could not save. Please try again.", "저장하지 못했습니다. 다시 시도해 주세요.") });
    setM({ ...m!, ...edit }); setEdit(null); setMsg({ ok: true, text: t("Saved.", "저장했습니다.") }); };

  const field = (label: string, value: React.ReactNode) => <div><div className="text-[13px] text-white/50">{label}</div><div className="mt-1 truncate text-[15px] text-white/90">{value}</div></div>;
  const hide = (v: string | null | undefined) => (!v ? "—" : show ? v : MASK);
  const card = "rounded-2xl border border-white/12 bg-white/[.02] p-6 max-md:p-5";
  const side: [string, string, string][] = [["Home", "홈", "/"], ["My details", "내 정보", "#details"], ["Subscription", "구독 요금제", "#plan"], ["Billing", "결제", "#billing"], ["Team", "팀원", "#team"]];
  const empty = (text: string) => <p className="py-6 text-center text-[14.5px] text-white/45">{text}</p>;
  const head = (title: string, right?: React.ReactNode) => <div className="mt-10 flex items-center justify-between gap-3 first:mt-0"><h2 className="text-[19px] font-semibold">{title}</h2>{right}</div>;
  const ask = (label: string) => <Link href="/contact" className={`${pillBtn} inline-flex items-center`}>{label}</Link>;

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#050608] text-white">
      <SiteNav />
      <div className="mx-auto flex w-full max-w-[1100px] gap-14 px-[4.5vw] pt-6 pb-24 max-md:flex-col max-md:gap-6 max-md:px-5 max-md:pt-2">
        {/* side menu */}
        <aside className="w-[200px] shrink-0 max-md:w-full">
          <Link href="/#ICN" className="flex h-10 w-[170px] items-center justify-center rounded-full bg-[#3f6bff] text-[14px] font-medium text-white transition hover:bg-[#5a80ff] max-md:w-full">{t("Open the simulator", "시뮬레이터 열기")}</Link>
          <nav className="mt-8 space-y-1 text-[15px] max-md:mt-4 max-md:flex max-md:gap-1 max-md:space-y-0 max-md:overflow-x-auto">
            {side.map(([en, ko, to]) => { const on = to === "#" + sec, cls = `block w-full rounded-md px-3 py-2.5 text-left whitespace-nowrap transition hover:bg-white/[.06] ${on ? "bg-white/[.06] text-white" : "text-white/70"}`;
              return to.startsWith("#") ? <button key={en} type="button" aria-current={on ? "page" : undefined} className={cls} onClick={() => { history.replaceState(null, "", to); setSec(to.slice(1) as Sec); }}>{t(en, ko)}</button>
                : <Link key={en} href={to} className={cls}>{t(en, ko)}</Link>; })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {sec === "details" && <>
          <h1 className="text-[30px] font-semibold tracking-[-0.01em] text-[#f3eee6]">{t("Your details", "내 정보")}</h1>
          <div className="mt-5 flex items-center gap-5">
            <Avatar name={me.name} src={me.avatar} size={64} />
            <div><div className="text-[17px] text-white">{(m?.name ?? me.name) || me.email}</div><div className="text-[13.5px] text-white/50">{google ? t("Photo from your Google account", "Google 계정 사진") : me.email}</div></div>
          </div>

          {/* personal information */}
          <div className="mt-10 flex items-center justify-between gap-3">
            <h2 className="text-[19px] font-semibold">{t("Personal information", "개인 정보")}</h2>
            <div className="flex gap-2">
              {m && !edit && <button type="button" className={pillBtn} onClick={() => { setEdit({ ...m }); setShow(true); setMsg(null); }}>{t("Edit details", "정보 수정")}</button>}
              {!edit && <button type="button" className={pillBtn} onClick={() => setShow((v) => !v)}>{show ? t("Hide details", "가리기") : t("View details", "자세히 보기")}</button>}
            </div>
          </div>
          <div className={`mt-3 ${card}`}>
            {edit ? (
              <div className="grid grid-cols-2 gap-x-10 gap-y-5 max-md:grid-cols-1">
                <label className="block"><span className="text-[13px] text-white/50">{t("Name", "이름")}</span><input className={`${input} mt-1`} value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
                {field(t("Email", "이메일"), me.email)}
                <label className="block"><span className="text-[13px] text-white/50">{t("Date of birth", "생년월일")}</span><input type="date" className={`${input} mt-1`} value={edit.birth_date ?? ""} onChange={(e) => setEdit({ ...edit, birth_date: e.target.value })} /></label>
                <label className="block"><span className="text-[13px] text-white/50">{t("Phone", "휴대전화")} {edit.phone_code ? `(+${edit.phone_code})` : ""}</span><input inputMode="tel" className={`${input} mt-1`} value={edit.phone ?? ""} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></label>
                <div className="col-span-2 flex gap-2 max-md:col-span-1">
                  <button type="button" disabled={busy} onClick={save} className="h-9 rounded-full bg-[#3f6bff] px-5 text-[13.5px] font-medium text-white transition hover:bg-[#5a80ff] disabled:opacity-50">{busy ? t("Saving…", "저장 중…") : t("Save", "저장")}</button>
                  <button type="button" onClick={() => { setEdit(null); setShow(false); }} className={pillBtn}>{t("Cancel", "취소")}</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-10 gap-y-6 max-md:grid-cols-1">
                {field(t("Name", "이름"), (m?.name ?? me.name) || "—")}
                {field(t("Email", "이메일"), me.email)}
                {field(t("Date of birth", "생년월일"), m === undefined ? "…" : hide(m?.birth_date))}
                {field(t("Phone", "휴대전화"), m === undefined ? "…" : !m?.phone ? "—" : show ? `+${m.phone_code ?? ""} ${m.phone}` : `+${m.phone_code ?? ""} ${MASK}`)}
              </div>
            )}
            {m === null && <p className="mt-5 text-[13px] text-white/45">{t("Signed up with Google: name and email come from your Google account.", "Google로 가입한 계정은 이름과 이메일을 Google 계정 정보로 표시합니다.")}</p>}
          </div>
          {msg && <p role="status" className={`mt-3 text-[14px] ${msg.ok ? "text-[#6fcf8a]" : "text-[#f0625c]"}`}>{msg.text}</p>}

          {/* account */}
          <h2 className="mt-10 text-[19px] font-semibold">{t("Account", "계정")}</h2>
          <div className={`mt-3 ${card}`}>
            <div className="grid grid-cols-2 gap-x-10 gap-y-6 max-md:grid-cols-1">
              {field(t("Signed in with", "로그인 방식"), google ? "Google" : t("Email", "이메일"))}
              {field(t("Password", "비밀번호"), <Link href="/reset" className="text-[#7d9bff] hover:text-[#a3b9ff]">{google ? t("Set a password", "비밀번호 설정") : t("Change password", "비밀번호 변경")}</Link>)}
              {field(t("Member since", "가입일"), day(u.created_at))}
              {field(t("Last sign-in", "최근 로그인"), day(u.last_sign_in_at))}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-[13px] text-white/40">{t("To delete your account, write to us at the address in the ", "회원 탈퇴는 ")}<Link href="/privacy" className="underline underline-offset-4 hover:text-white/70">{t("privacy policy", "개인정보처리방침")}</Link>{t(".", "의 연락처로 요청해 주세요.")}</p>
            <button type="button" onClick={() => supabase.auth.signOut()} className={pillBtn}>{t("Log out", "로그아웃")}</button>
          </div>
          </>}

          {sec === "plan" && <>
          <h1 className="text-[30px] font-semibold tracking-[-0.01em] text-[#f3eee6]">{t("Subscription", "구독 요금제")}</h1>
          {head(t("Current plan", "현재 요금제"))}
          <div className={`mt-3 ${card} flex items-center justify-between gap-4 max-md:flex-col max-md:items-start`}>
            <div><div className="text-[18px] font-semibold">{t("Beta (free)", "베타 (무료)")}</div><div className="mt-1 text-[14px] text-white/55">{t("Every feature is open during the beta. Paid plans start with the official launch.", "베타 기간에는 모든 기능을 무료로 쓰실 수 있습니다. 유료 요금제는 정식 출시와 함께 시작합니다.")}</div></div>
            {ask(t("Talk to us about a plan", "요금제 상담"))}
          </div>
          {head(t("Plans", "요금제 안내"))}
          <div className="mt-3 grid grid-cols-2 gap-4 max-md:grid-cols-1">
            {PLANS.map(([en, ko, wen, wko, pen, pko]) => <div key={en} className={card}>
              <div className="text-[17px] font-semibold">{t(en, ko)}</div>
              <div className="mt-1 text-[13.5px] text-white/50">{t(wen, wko)}</div>
              <div className="mt-4 text-[20px] font-semibold text-[#f3eee6]">{t(pen, pko)}</div>
            </div>)}
          </div>
          <p className="mt-4 text-[13px] text-white/40">{t("Annual, VAT excluded. Upgrades and quotes are handled by our team for now.", "연간 요금, 부가세 별도. 현재는 요금제 변경과 견적을 담당자가 직접 안내해 드립니다.")}</p>
          </>}

          {sec === "billing" && <>
          <h1 className="text-[30px] font-semibold tracking-[-0.01em] text-[#f3eee6]">{t("Billing", "결제")}</h1>
          {head(t("Payment method", "결제 수단"), ask(t("Add or change", "등록 · 변경 문의")))}
          <div className={`mt-3 ${card}`}>{empty(t("No payment method yet. Plans are invoiced (tax invoice or bank transfer).", "등록된 결제 수단이 없습니다. 요금제는 세금계산서 또는 계좌이체로 청구됩니다."))}</div>
          {head(t("Invoices", "결제 내역"))}
          <div className={`mt-3 ${card}`}>
            <div className="grid grid-cols-4 gap-4 border-b border-white/[.07] pb-3 text-[13px] text-white/45 max-md:hidden"><span>{t("Date", "날짜")}</span><span>{t("Plan", "요금제")}</span><span>{t("Amount", "금액")}</span><span>{t("Invoice", "영수증")}</span></div>
            {empty(t("No payments yet.", "결제 내역이 없습니다."))}
          </div>
          </>}

          {sec === "team" && <>
          <h1 className="text-[30px] font-semibold tracking-[-0.01em] text-[#f3eee6]">{t("Team", "팀원")}</h1>
          {head(t("Members", "멤버"), ask(t("Invite a member", "팀원 초대 문의")))}
          <div className={`mt-3 ${card}`}>
            <div className="flex items-center gap-4"><Avatar name={me.name} src={me.avatar} size={40} />
              <div className="min-w-0 flex-1"><div className="truncate text-[15px] text-white">{(m?.name ?? me.name) || me.email}</div><div className="truncate text-[13.5px] text-white/50">{me.email}</div></div>
              <span className="rounded-full border border-white/20 px-3 py-1 text-[12.5px] text-white/70">{t("Owner", "소유자")}</span></div>
          </div>
          <p className="mt-4 text-[13px] text-white/40">{t("Institution and project licences share one subscription across a team. Ask us to add members.", "기관 · 프로젝트 라이선스는 하나의 구독을 팀원과 함께 씁니다. 팀원 추가는 문의해 주세요.")}</p>
          </>}
        </main>
      </div>
    </div>
  );
}
