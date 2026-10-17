import { NavLink } from "react-router-dom";
import { IcCalendar, IcHome, IcMusic, IcSettings, IcSync } from "./icons";

const tabs = [
  { to: "/", label: "Inicio", Icon: IcHome, end: true },
  { to: "/clases", label: "Clases", Icon: IcMusic, end: false },
  { to: "/historial", label: "Historial", Icon: IcCalendar, end: false },
  { to: "/comparacion", label: "Escuela", Icon: IcSync, end: false },
  { to: "/ajustes", label: "Ajustes", Icon: IcSettings, end: false },
];

export default function BottomNav() {
  return (
    <nav className="tabbar">
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab ${isActive ? "active" : ""}`}>
          <Icon />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
