import { IcBars } from "../components/icons";

export default function Splash() {
  return (
    <div className="screen purple center-screen">
      <div className="col center" style={{ alignItems: "center" }}>
        <div className="clock-fab pulse" style={{ width: 92, height: 92 }}>
          <IcBars width={44} height={44} />
        </div>
        <div className="brand-title" style={{ fontSize: "1.5rem", marginTop: 16 }}>MiJornada</div>
        <div className="brand-sub">Tu tiempo, bajo control</div>
      </div>
    </div>
  );
}
