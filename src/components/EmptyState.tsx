import type { ReactNode } from "react";

export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="empty">
      <div className="empty-ico">{icon}</div>
      <div className="empty-title">{title}</div>
      {subtitle && <div className="muted small empty-sub">{subtitle}</div>}
    </div>
  );
}
