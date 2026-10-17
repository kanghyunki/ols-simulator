"use client";
import { useSyncExternalStore } from "react";

// Site language. First visit follows the browser (Korean browser → ko), a pick is remembered.
// The server and hydration render English; the stored choice swaps in right after.
export type Lang = "en" | "ko";
let cur: Lang | null = null;
const subs = new Set<() => void>();

function read(): Lang {
  if (!cur) {
    let s: string | null = null;
    try { s = localStorage.getItem("lang"); } catch {}
    cur = s === "en" || s === "ko" ? s : navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
    document.documentElement.lang = cur;
  }
  return cur;
}

export function setLang(l: Lang) {
  cur = l;
  try { localStorage.setItem("lang", l); } catch {}
  document.documentElement.lang = l;
  subs.forEach((f) => f());
}

export const useLang = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, read, () => "en" as Lang);

// t("Sign up", "회원가입") → the string for the current language
export function useT() {
  const ko = useLang() === "ko";
  return <V>(en: V, k: V) => (ko ? k : en);
}
