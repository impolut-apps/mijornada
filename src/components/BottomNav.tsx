import { NavLink } from "react-router-dom";
import { IcCalendar, IcHome, IcSettings, IcShield } from "./icons";

const tabs = [
  { to: "/", label: "Inicio", Icon: IcHome, end: true },
  { to: "/historial", label: "Historial", Icon: IcCalendar, end: false },
  { to: "/evidencias", label: "Evidencias", Icon: IcShield, end: false },
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
