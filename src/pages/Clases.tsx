import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IcChevronL, IcChevronR, IcMusic, IcSync, IcUser } from "../components/icons";
import { SkeletonRows } from "../components/Skeleton";
import { listClasses } from "../lib/classes";
import { syncSchool } from "../lib/school";
import { addDays, DAY_SHORT, dayNames, MONTHS, monthMatrix, parseYmd, weekDays, ymd } from "../lib/calendar";
import { useToast } from "../ui/ToastProvider";
import type { ClassItem } from "../lib/types";

type View = "week" | "month";

export default function Clases() {
  const nav = useNavigate();
  const toast = useToast();
  const isDesktop = useMemo(() => typeof window !== "undefined" && window.matchMedia("(min-width:900px)").matches, []);
  const [view, setView] = useState<View>(isDesktop ? "month" : "week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<string>(() => ymd(new Date()));
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const tried = useRef<Set<string>>(new Set());

  const range = useMemo(() => {
    if (view === "week") {
      const w = weekDays(anchor);
      return { from: ymd(w[0]), to: ymd(w[6]) };
    }
    const m = monthMatrix(anchor);
    return { from: ymd(m[0][0]), to: ymd(m[m.length - 1][6]) };
  }, [view, anchor]);

  const loadLocal = useCallback(async () => {
    setLoading(true);
    try {
      setClasses(await listClasses(range));
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void loadLocal();
  }, [loadLocal]);

  const doSync = useCallback(
    async (silent = false) => {
      setSyncing(true);
      try {
        const r = await syncSchool(range);
        if (!silent) toast.show(`Sincronizado: ${r.classes} clases`, "success");
        setClasses(await listClasses(range));
      } catch (e) {
        if (!silent) toast.show(e instanceof Error ? e.message : "No se pudo sincronizar", "error");
      } finally {
        setSyncing(false);
      }
    },
    [range, toast]
  );

  // Auto-sincroniza una vez un rango sin clases (para poder navegar semanas/meses).
  useEffect(() => {
    const key = `${range.from}|${range.to}`;
    if (!loading && classes.length === 0 && !syncing && !tried.current.has(key)) {
      tried.current.add(key);
      void doSync(true);
    }
  }, [loading, classes.length, range.from, range.to, syncing, doSync]);

  const byDate = useMemo(() => {
    const m = new Map<string, ClassItem[]>();
    for (const c of classes) {
      if (!c.class_date) continue;
      const a = m.get(c.class_date) ?? [];
      a.push(c);
      m.set(c.class_date, a);
    }
    return m;
  }, [classes]);

  const selectedClasses = (byDate.get(selected) ?? []).slice().sort((a, b) => a.start_time.localeCompare(b.start_time));

  function move(dir: number) {
    const next = view === "week" ? addDays(anchor, dir * 7) : new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
    setAnchor(next);
    setSelected(ymd(view === "week" ? weekDays(next)[0] : new Date(next.getFullYear(), next.getMonth(), 1)));
  }

  const periodLabel = useMemo(() => {
    if (view === "week") {
      const w = weekDays(anchor);
      const a = w[0], b = w[6];
      const mA = MONTHS[a.getMonth()].slice(0, 3), mB = MONTHS[b.getMonth()].slice(0, 3);
      return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${mA}` : `${a.getDate()} ${mA} – ${b.getDate()} ${mB}`;
    }
    return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }, [view, anchor]);

  const today = ymd(new Date());

  return (
    <div className="screen light">
      <div className="page-head">
        <IcMusic width={26} height={26} style={{ color: "var(--primary)" }} />
        <h1 className="h1 grow">Clases</h1>
        {isDesktop && (
          <div className="pills" style={{ marginRight: 8 }}>
            <button className={`pill ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}>Semana</button>
            <button className={`pill ${view === "month" ? "active" : ""}`} onClick={() => setView("month")}>Mes</button>
          </div>
        )}
        <button className="btn btn-soft" disabled={syncing} onClick={() => void doSync(false)}>
          <IcSync width={17} height={17} /> {syncing ? "…" : "Sincronizar"}
        </button>
      </div>

      <div className="content" style={{ paddingTop: 4 }}>
        <div className="cal-nav">
          <button className="iconbtn" onClick={() => move(-1)}><IcChevronL width={20} height={20} /></button>
          <div className="cal-period" style={{ textTransform: "capitalize" }}>{periodLabel}</div>
          <button className="iconbtn" onClick={() => move(1)}><IcChevronR width={20} height={20} /></button>
        </div>

        {view === "week" ? (
          <div className="week-strip">
            {weekDays(anchor).map((d) => {
              const k = ymd(d);
              const n = (byDate.get(k) ?? []).length;
              return (
                <button key={k} className={`daychip ${selected === k ? "active" : ""} ${k === today ? "today" : ""}`} onClick={() => setSelected(k)}>
                  <span className="dc-dow">{DAY_SHORT[(d.getDay() + 6) % 7]}</span>
                  <span className="dc-num">{d.getDate()}</span>
                  {n > 0 && <span className="dc-dot" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="month-grid card" style={{ padding: 10 }}>
            {DAY_SHORT.map((d) => <div key={d} className="mg-head">{d}</div>)}
            {monthMatrix(anchor).flat().map((d) => {
              const k = ymd(d);
              const n = (byDate.get(k) ?? []).length;
              const out = d.getMonth() !== anchor.getMonth();
              return (
                <button key={k} className={`mg-cell ${selected === k ? "active" : ""} ${k === today ? "today" : ""} ${out ? "out" : ""}`} onClick={() => setSelected(k)}>
                  <span className="mg-num">{d.getDate()}</span>
                  {n > 0 && <span className="mg-count">{n}</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="day-h" style={{ marginTop: 18, textTransform: "capitalize" }}>{dayNames(parseYmd(selected))}</div>

        {loading || syncing ? (
          <SkeletonRows count={3} />
        ) : selectedClasses.length === 0 ? (
          <div className="muted small" style={{ padding: "8px 2px" }}>Sin clases este día.</div>
        ) : (
          selectedClasses.map((c) => (
            <div key={c.id} className="class-card press" style={{ cursor: "pointer" }} onClick={() => nav(`/clases/${c.id}`)}>
              <div className="row between">
                <div className="row" style={{ gap: 12 }}>
                  <div className="ctime mono" style={{ minWidth: 52 }}>{c.start_time.slice(0, 5)}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.subject}</div>
                    <div className="muted small">{c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}{c.classroom ? ` · ${c.classroom}` : ""}</div>
                  </div>
                </div>
                <span className="row muted small" style={{ gap: 5 }}><IcUser width={14} height={14} /> {c.students.length}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
