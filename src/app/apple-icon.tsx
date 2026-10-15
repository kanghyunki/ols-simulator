import { logoMark } from "@/lib/logo-mark";

// iPhone / iPad home-screen icon
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export default function AppleIcon() { return logoMark(180); }
