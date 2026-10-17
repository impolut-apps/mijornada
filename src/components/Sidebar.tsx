import { NavLink } from "react-router-dom";
import { IcBars, IcCalendar, IcHome, IcMusic, IcSettings, IcSync } from "./icons";

const items = [
  { to: "/", label: "Inicio", Icon: IcHome, end: true },
  { to: "/clases", label: "Clases", Icon: IcMusic, end: false },
  { to: "/historial", label: "Historial", Icon: IcCalendar, end: false },
  { to: "/comparacion", label: "Escuela", Icon: IcSync, end: false },
  { to: "/ajustes", label: "Ajustes", Icon: IcSettings, end: false },
];

/** Menú lateral solo visible en escritorio (se oculta en móvil por CSS). */
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="side-brand">
        <div className="side-logo"><IcBars width={24} height={24} /></div>
        <div>
          <div className="side-title">MiJornada</div>
          <div className="side-sub">Tu tiempo, bajo control</div>
        </div>
      </div>
      <nav className="side-nav">
        {items.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}>
            <Icon width={20} height={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
