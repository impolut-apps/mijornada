import { useCallback, useEffect, useMemo, useState } from "react";
import { IcCheckCircle, IcClock, IcSync } from "../components/icons";
import { SkeletonCard } from "../components/Skeleton";
import { listSessions } from "../lib/fichaje";
import { getIntegrationState, listPlatformRecords, syncSchool, type IntegrationState, type PlatformRecord } from "../lib/school";
import { SCHOOL_START } from "../lib/config";
import { formatDateLong, formatDayShort, formatDuration, formatHM, userTimezone, ymdInTz } from "../lib/time";
import { useToast } from "../ui/ToastProvider";
import type { WorkSession } from "../lib/types";

type DayCmp = {
  date: string;
  oursMin: number | null;
  theirsMin: number | null;
  status: "match" | "diff" | "only_ours" | "only_theirs";
};

export default function Comparacion() {
  const tz = userTimezone();
  const toast = useToast();
  const [state, setState] = useState<IntegrationState | null>(null);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [records, setRecords] = useState<PlatformRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    // Solo se comparan fichajes desde que se empezó a usar la app.
    const to = ymdInTz(new Date(), tz);
    const from = SCHOOL_START;
    const [st, ss, rec] = await Promise.all([
      getIntegrationState().catch(() => null),
      listSessions(from, to).catch(() => []),
      listPlatformRecords(from, to).catch(() => []),
    ]);
    setState(st);
    setSessions(ss);
    setRecords(rec);
    setLoading(false);
  }, [tz]);

  useEffect(() => {
    void load();
  }, [load]);

  async function sync() {
    setSyncing(true);
    try {
      const r = await syncSchool();
      toast.show(`Sincronizado: ${r.classes} clases, ${r.attendance} días`, "success");
      await load();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "No se pudo sincronizar", "error");
    } finally {
      setSyncing(false);
    }
  }

  const cmp = useMemo<DayCmp[]>(() => {
    const map = new Map<string, DayCmp>();
    for (const s of sessions) {
      map.set(s.work_date, { date: s.work_date, oursMin: s.computed_minutes, theirsMin: null, status: "only_ours" });
    }
    for (const r of records) {
      const theirs = r.horas != null ? Math.round(r.horas * 60) : 0;
      const ex = map.get(r.work_date);
      if (ex) {
        ex.theirsMin = theirs;
        ex.status = Math.abs((ex.oursMin ?? 0) - theirs) <= 5 ? "match" : "diff";
      } else {
        map.set(r.work_date, { date: r.work_date, oursMin: null, theirsMin: theirs, status: "only_theirs" });
      }
    }
    return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [sessions, records]);

  const counts = useMemo(() => {
    const c = { match: 0, diff: 0, only_ours: 0, only_theirs: 0 };
    for (const d of cmp) c[d.status]++;
    return c;
  }, [cmp]);

  const total = cmp.length || 1;
  const pct = Math.round((counts.match / total) * 100);
  const connected = state?.connected && records.length > 0;

  const legend = [
    { c: "var(--green)", label: "Coinciden", n: counts.match },
    { c: "#e05a5a", label: "Diferencias", n: counts.diff },
    { c: "var(--amber)", label: "Solo en tu app", n: counts.only_ours },
    { c: "#9aa1b2", label: "Solo en la escuela", n: counts.only_theirs },
  ];

  const badgeFor = (s: DayCmp["status"]) =>
    s === "match" ? <span className="badge badge-green"><IcCheckCircle /> Coincide</span>
    : s === "diff" ? <span className="badge badge-amber"><IcClock /> Diferencia</span>
    : s === "only_ours" ? <span className="badge badge-amber"><IcClock /> Solo aquí</span>
    : <span className="badge badge-grey"><span className="dot" /> Solo escuela</span>;

  return (
    <div className="screen light">
      <div className="page-head">
        <IcSync width={26} height={26} style={{ color: "var(--primary)" }} />
        <h1 className="h1 grow">Escuela</h1>
        <button className="btn btn-primary" disabled={syncing} onClick={() => void sync()}>
          <IcSync width={17} height={17} /> {syncing ? "…" : "Sincronizar"}
        </button>
      </div>

      <div className="content" style={{ paddingTop: 4 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <span className="muted small">
            {state?.last_sync_at ? `Última sincronización: ${formatDateLong(state.last_sync_at, tz)} · ${formatHM(state.last_sync_at, tz)}` : "Aún sin sincronizar"}
          </span>
          {connected ? <span className="badge badge-green"><IcCheckCircle /> Conectada</span> : <span className="badge badge-grey"><span className="dot" /> Sin conectar</span>}
        </div>

        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="card">
            <div className="donut-wrap">
              <div className="donut" style={{ background: `conic-gradient(var(--green) 0% ${cmp.length ? pct : 0}%, var(--grey-050) 0)` }}>
                <div className="hole">
                  <div className="pct">{cmp.length ? `${pct}%` : "—"}</div>
                  <div className="muted tiny">Coinciden</div>
                </div>
              </div>
              <div className="legend grow">
                {legend.map((l) => (
                  <div className="li" key={l.label}>
                    <span className="dot" style={{ background: l.c }} />
                    <span>{l.label}</span>
                    <span className="n">{l.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!connected && (
          <div className="notice" style={{ marginTop: 14 }}>
            <IcClock width={18} height={18} />
            Pulsa <strong>&nbsp;Sincronizar</strong>&nbsp; para traer tus clases y fichajes de la escuela y comparar. (De momento no se envía nada a la escuela.)
          </div>
        )}

        {cmp.length > 0 && (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="h2" style={{ fontSize: "1rem", marginBottom: 8 }}>Día a día</div>
            {cmp.map((d) => (
              <div className="inforow" key={d.date}>
                <span>
                  <div style={{ fontWeight: 700, fontSize: ".92rem" }}>{formatDayShort(d.date)}</div>
                  <div className="muted tiny mono">
                    Tú: {d.oursMin != null ? formatDuration(d.oursMin) : "—"} · Escuela: {d.theirsMin != null ? formatDuration(d.theirsMin) : "—"}
                  </div>
                </span>
                {badgeFor(d.status)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
