import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IcHome = (p: P) => (
  <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>
);
export const IcCalendar = (p: P) => (
  <svg {...base(p)}><rect x="3" y="4.5" width="18" height="16.5" rx="3" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>
);
export const IcShield = (p: P) => (
  <svg {...base(p)}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
);
export const IcSettings = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.7 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 13.6H4a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 5 6.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10A1.6 1.6 0 0 0 11 2.6V2a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V8a1.6 1.6 0 0 0 1.4 1h.4a2 2 0 1 1 0 4H21a1.6 1.6 0 0 0-1.6 1Z" /></svg>
);
export const IcPlay = (p: P) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
);
export const IcStop = (p: P) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}><rect x="6.5" y="6.5" width="11" height="11" rx="2.5" /></svg>
);
export const IcCoffee = (p: P) => (
  <svg {...base(p)}><path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" /><path d="M17 9h2.5a2.5 2.5 0 0 1 0 5H17" /><path d="M7 2.5v2M11 2.5v2" /></svg>
);
export const IcPause = (p: P) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}><rect x="6.5" y="5.5" width="3.5" height="13" rx="1.2" /><rect x="14" y="5.5" width="3.5" height="13" rx="1.2" /></svg>
);
export const IcChevronR = (p: P) => (<svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>);
export const IcChevronL = (p: P) => (<svg {...base(p)}><path d="m15 6-6 6 6 6" /></svg>);
export const IcCheck = (p: P) => (<svg {...base(p)}><path d="m5 12 4.5 4.5L19 7" /></svg>);
export const IcCheckCircle = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5L16 9" /></svg>
);
export const IcUser = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" /></svg>
);
export const IcClock = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
);
export const IcSync = (p: P) => (
  <svg {...base(p)}><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" /><path d="M3 12A9 9 0 0 1 18.5 5.7L21 8" /><path d="M21 4v4h-4M3 20v-4h4" /></svg>
);
export const IcBars = (p: P) => (
  <svg {...base({ ...p, fill: "currentColor", stroke: "none" })}>
    <rect x="3" y="9" width="2.6" height="6" rx="1.3" /><rect x="7.4" y="5" width="2.6" height="14" rx="1.3" />
    <rect x="11.8" y="8" width="2.6" height="8" rx="1.3" /><rect x="16.2" y="4" width="2.6" height="16" rx="1.3" />
    <rect x="20.6" y="10" width="2.4" height="4" rx="1.2" />
  </svg>
);
export const IcBell = (p: P) => (
  <svg {...base(p)}><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
);
export const IcDownload = (p: P) => (
  <svg {...base(p)}><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 19h16" /></svg>
);
export const IcPlug = (p: P) => (
  <svg {...base(p)}><path d="M9 2v6M15 2v6" /><path d="M7 8h10v3a5 5 0 0 1-10 0V8Z" /><path d="M12 16v6" /></svg>
);
export const IcLock = (p: P) => (
  <svg {...base(p)}><rect x="4.5" y="10" width="15" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
);
export const IcLogout = (p: P) => (
  <svg {...base(p)}><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 12H3m0 0 3.5-3.5M3 12l3.5 3.5" /></svg>
);
