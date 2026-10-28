// Round profile picture (Google photo), or the first letter of the name on a coloured disc when there is none
export function Avatar({ name, src, size = 36 }: { name: string; src: string | null; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt="" referrerPolicy="no-referrer" width={size} height={size} className="shrink-0 rounded-full object-cover ring-1 ring-white/20" style={{ width: size, height: size }} />;
  return <span className="grid shrink-0 place-items-center rounded-full bg-[#3f6bff] font-medium text-white ring-1 ring-white/20" style={{ width: size, height: size, fontSize: size * 0.42 }}>{(name.trim()[0] || "?").toUpperCase()}</span>;
}
