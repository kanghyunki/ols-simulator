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
// Monthly plans (VAT included); the member's plan is app_metadata.plan (set by us, members cannot change it), Free when unset.
// There is no online payment yet, so upgrades go through /contact
type Plan = "free" | "plus" | "pro" | "ultra";
const TIERS: [Plan, string, number][] = [["free", "Free", 0], ["plus", "Plus", 11000], ["pro", "Pro", 29000], ["ultra", "Ultra", 119000]];
// feature rows: [en, ko, value per tier — true / false / [en, ko]]
const FEATURES: [string, string, (boolean | [string, string])[]][] = [
  ["Airports", "공항", [["3 airports", "3개"], ["10 airports", "10개"], ["All 38 airports", "전체 38개"], ["All + new on request", "전체 + 신규 요청"]]],
  ["Obstacle limitation surfaces in 3D (view)", "장애물제한표면 3D 보기", [true, true, true, true]],
  ["Runway extension · parallel runways (OLS review)", "활주로 연장 · 평행활주로 검토", [false, true, true, true]],
  ["Flight procedures · noise (view)", "비행절차 · 소음영향 보기", [false, false, true, true]],
  ["Flight procedures · noise (your own review)", "비행절차 · 소음영향 직접 검토", [false, false, false, true]],
];
const RAINBOW = "linear-gradient(90deg,#ff5f6d,#ffc371,#5ee7a0,#4fa8ff,#a46bff,#ff6fd8)";
// plan chip; Ultra in rainbow
function PlanBadge({ plan }: { plan: Plan }) {
  const name = TIERS.find((x) => x[0] === plan)?.[1] ?? "Free";
  return plan === "ultra"
    ? <span className="inline-flex rounded-full p-px" style={{ background: RAINBOW }}><span className="rounded-full bg-[#050608] px-2.5 py-0.5 text-[12.5px] font-semibold"><span className="bg-clip-text text-transparent" style={{ backgroundImage: RAINBOW }}>{name}</span></span></span>
    : <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[12.5px] text-white/70">{name}</span>;
}
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
  const [fresh, setFresh] = useState<{ plan: Plan; until: string | null } | null>(null);   // plan read from the server (the session token can be an hour old)
  useEffect(() => { if (!session) return;
    supabase.auth.getUser().then(({ data }) => data.user && setFresh({ plan: data.user.app_metadata?.plan ?? "free", until: data.user.app_metadata?.free_until ?? null }));
    supabase.from("ols_members").select("name, phone_country, phone_code, phone, birth_date").eq("id", session.user.id).maybeSingle().then(({ data }) => setM(data)); }, [session]);
  if (!session) return <div className="fixed inset-0 bg-[#050608]" />;
  const me = profileOf(session), u = session.user, google = u.app_metadata?.provider === "google";
  // app_metadata.free_until (YYYY-MM-DD, last free day): a member given the plan free for a while; only that member sees it
  const plan: Plan = fresh?.plan ?? u.app_metadata?.plan ?? "free", until: string | null = fresh ? fresh.until : u.app_metadata?.free_until ?? null;
  const promo = !!until && new Date().toLocaleDateString("sv") <= until, upto = until?.replaceAll("-", ".") ?? "", tier = TIERS.find((x) => x[0] === plan) ?? TIERS[0];
  const won = (n: number) => n.toLocaleString("en");

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
  const ask = (label: string) => <Link href="/contact" className={`${pillBtn} inline-flex shrink-0 items-center whitespace-nowrap`}>{label}</Link>;

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
            <div><div className="flex items-center gap-2.5 text-[17px] text-white">{(m?.name ?? me.name) || me.email}<PlanBadge plan={plan} />{promo && <span className="text-[12.5px] text-white/55">{t(`Free for a year · until ${upto}`, `1년 무료 · ${upto}까지`)}</span>}</div><div className="text-[13.5px] text-white/50">{google ? t("Photo from your Google account", "Google 계정 사진") : me.email}</div></div>
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
            <div><div className="flex items-center gap-3 text-[18px] font-semibold"><PlanBadge plan={plan} /><span>{promo ? t(`Free until ${upto}`, `${upto}까지 무료`) : tier[2] ? t(`KRW ${won(tier[2])} / month`, `월 ${won(tier[2])}원`) : t("Free", "무료")}</span></div>
              <div className="mt-1.5 text-[14px] text-white/55">{promo ? t(`One year free: every ${tier[1]} feature at no charge until ${upto}.`, `1년 무료 회원입니다. ${upto}까지 ${tier[1]} 요금제의 모든 기능을 비용 없이 쓰실 수 있습니다.`)
                : t("Every feature is open during the beta. Billing starts with the official launch.", "베타 기간에는 모든 기능을 무료로 쓰실 수 있습니다. 결제는 정식 출시와 함께 시작합니다.")}</div></div>
            {ask(t("Talk to us about a plan", "요금제 상담"))}
          </div>
          {head(t("Plans", "요금제 안내"))}
          {/* plan table: one column per tier, feature rows underneath */}
          <div className="mt-3 overflow-x-auto rounded-2xl border border-white/12 bg-white/[.02]">
            <div className="grid min-w-[640px] grid-cols-4">
              {TIERS.map(([k, name, price], i) => { const on = k === plan;
                return <div key={k} className={`flex flex-col items-center px-4 pt-7 pb-6 text-center ${i ? "border-l border-white/[.07]" : ""} ${on ? "bg-white/[.03]" : ""}`}>
                  <div className={`text-[22px] font-semibold ${k === "ultra" ? "bg-clip-text text-transparent" : ""}`} style={k === "ultra" ? { backgroundImage: RAINBOW } : undefined}>{name}</div>
                  <div className="mt-3 text-[22px] font-semibold text-[#f3eee6]">{won(price)}<span className="ml-1 text-[14px] font-normal text-white/45">{t("KRW / mo", "원 / 월")}</span></div>
                  {on ? <span className="mt-5 inline-flex h-9 items-center rounded-full border border-white/25 px-5 whitespace-nowrap text-[13.5px] text-white/70">{promo ? t("1 year free", "1년 무료") : t("Current plan", "현재 요금제")}</span>
                    : <Link href="/contact" className={`mt-5 inline-flex h-9 items-center rounded-full px-5 text-[13.5px] font-medium text-white transition ${k === "free" ? "border border-white/25 hover:bg-white/[.07]" : "bg-[#3f6bff] hover:bg-[#5a80ff]"}`} style={k === "ultra" ? { backgroundImage: RAINBOW } : undefined}>{t("Get started", "시작하기")}</Link>}
                  {FEATURES.map(([en, ko, v]) => { const x = v[i];
                    return <div key={en} className="mt-6 w-full">
                      <div className="text-[12px] text-white/40">{t(en, ko)}</div>
                      <div className="mt-1.5 flex h-6 items-center justify-center text-[15px] font-medium text-white/90">
                        {Array.isArray(x) ? t(x[0], x[1]) : x ? <svg viewBox="0 0 20 20" className="size-5 text-[#3f6bff]" aria-label={t("Included", "포함")}><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          : <span className="h-[3px] w-5 rounded-full bg-white/20" aria-label={t("Not included", "미포함")} />}
                      </div>
                    </div>; })}
                </div>; })}
            </div>
          </div>
          <p className="mt-4 text-[13px] text-white/40">{t("Monthly, VAT included. Institution, local government and project licences are quoted separately; upgrades are handled by our team for now.", "월 요금, 부가세 포함. 기관 · 지자체 · 프로젝트 라이선스는 별도 견적이며, 현재는 요금제 변경을 담당자가 직접 안내해 드립니다.")}</p>
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
