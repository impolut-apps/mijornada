import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IcChevronL, IcChevronR, IcMusic, IcSync, IcUser } from "../components/icons";
import { SkeletonRows } from "../components/Skeleton";
import ClaseModal from "../components/ClaseModal";
import { listClasses } from "../lib/classes";
import { syncSchool } from "../lib/school";
import { addDays, DAY_SHORT, dayNames, MONTHS, monthMatrix, parseYmd, weekDays, ymd } from "../lib/calendar";
import { useToast } from "../ui/ToastProvider";
import type { ClassItem } from "../lib/types";

type View = "week" | "month";

export default function Clases() {
  const toast = useToast();
  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width:900px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width:900px)");
    const on = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<string>(() => ymd(new Date()));
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const tried = useRef<Set<string>>(new Set());

  // En móvil, siempre semanal (sin opción de mes).
  const effView: View = isDesktop ? view : "week";

  const range = useMemo(() => {
    if (effView === "week") {
      const w = weekDays(anchor);
      return { from: ymd(w[0]), to: ymd(w[6]) };
    }
    const m = monthMatrix(anchor);
    return { from: ymd(m[0][0]), to: ymd(m[m.length - 1][6]) };
  }, [effView, anchor]);

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
    for (const a of m.values()) a.sort((x, y) => x.start_time.localeCompare(y.start_time));
    return m;
  }, [classes]);

  function move(dir: number) {
    const next = effView === "week" ? addDays(anchor, dir * 7) : new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
    setAnchor(next);
    setSelected(ymd(effView === "week" ? weekDays(next)[0] : new Date(next.getFullYear(), next.getMonth(), 1)));
  }

  function openWeekFor(d: Date) {
    setView("week");
    setAnchor(d);
    setSelected(ymd(d));
  }

  const periodLabel = useMemo(() => {
    if (effView === "week") {
      const w = weekDays(anchor);
      const a = w[0], b = w[6];
      const mA = MONTHS[a.getMonth()].slice(0, 3), mB = MONTHS[b.getMonth()].slice(0, 3);
      return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${mA}` : `${a.getDate()} ${mA} – ${b.getDate()} ${mB}`;
    }
    return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }, [effView, anchor]);

  const today = ymd(new Date());
  const selectedClasses = byDate.get(selected) ?? [];

  const studentLabel = (c: ClassItem) =>
    c.students.length ? c.students[0] + (c.students.length > 1 ? ` +${c.students.length - 1}` : "") : "Sin alumno";

  const EvChip = ({ c }: { c: ClassItem }) => (
    <button className="ev-chip" onClick={() => setOpenClassId(c.id)} title={`${studentLabel(c)} · ${c.subject} · ${c.classroom ?? ""}`}>
      <span className="ev-name" style={{ textDecoration: c.not_delivered ? "line-through" : undefined }}>{studentLabel(c)}</span>
      <span className="ev-sub"><span className="ev-time">{c.start_time.slice(0, 5)}</span> {c.subject}{c.not_delivered ? " · no impartida" : ""}</span>
    </button>
  );

  return (
    <div className="screen light">
      {!isDesktop && (
        <div className="page-head">
          <IcMusic width={26} height={26} style={{ color: "var(--primary)" }} />
          <h1 className="h1 grow">Clases</h1>
          <button className="btn btn-soft" disabled={syncing} onClick={() => void doSync(false)}>
            <IcSync width={17} height={17} /> {syncing ? "…" : "Sincronizar"}
          </button>
        </div>
      )}

      <div className={`content ${isDesktop ? "wide" : ""}`} style={{ paddingTop: isDesktop ? 16 : 4 }}>
        {isDesktop ? (
          <div className="cal-topbar">
            <div className="cal-left">
              <button className="iconbtn" onClick={() => move(-1)}><IcChevronL width={20} height={20} /></button>
              <div className="cal-period" style={{ textTransform: "capitalize" }}>{periodLabel}</div>
              <button className="iconbtn" onClick={() => move(1)}><IcChevronR width={20} height={20} /></button>
            </div>
            <div className="cal-right">
              <div className="pills">
                <button className={`pill ${view === "week" ? "active" : ""}`} onClick={() => setView("week")}>Semana</button>
                <button className={`pill ${view === "month" ? "active" : ""}`} onClick={() => setView("month")}>Mes</button>
              </div>
              <button className="iconbtn" title="Sincronizar" disabled={syncing} onClick={() => void doSync(false)}><IcSync width={18} height={18} /></button>
            </div>
          </div>
        ) : (
          <div className="cal-nav">
            <button className="iconbtn" onClick={() => move(-1)}><IcChevronL width={20} height={20} /></button>
            <div className="cal-period" style={{ textTransform: "capitalize" }}>{periodLabel}</div>
            <button className="iconbtn" onClick={() => move(1)}><IcChevronR width={20} height={20} /></button>
          </div>
        )}

        {/* MÓVIL: semanal (franja de días + tarjetas del día) */}
        {!isDesktop && (
          <>
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
            <div className="day-h" style={{ marginTop: 18, textTransform: "capitalize" }}>{dayNames(parseYmd(selected))}</div>
            {loading || syncing ? (
              <SkeletonRows count={3} />
            ) : selectedClasses.length === 0 ? (
              <div className="muted small" style={{ padding: "8px 2px" }}>Sin clases este día.</div>
            ) : (
              selectedClasses.map((c) => (
                <div key={c.id} className="class-card press" style={{ cursor: "pointer" }} onClick={() => setOpenClassId(c.id)}>
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
          </>
        )}

        {/* ESCRITORIO · MES tipo calendario (clases dentro de cada día) */}
        {isDesktop && effView === "month" && (
          <div className="month-cal card">
            {DAY_SHORT.slice(0, 5).map((d) => <div key={d} className="mc-head">{d}</div>)}
            {monthMatrix(anchor).flatMap((w) => w.slice(0, 5)).map((d) => {
              const k = ymd(d);
              const evs = byDate.get(k) ?? [];
              const out = d.getMonth() !== anchor.getMonth();
              const extra = evs.length - 2;
              return (
                <div key={k} className={`mc-cell ${out ? "out" : ""} ${k === today ? "today" : ""}`}>
                  <div className="mc-num">{d.getDate()}</div>
                  <div className="mc-evs">
                    {evs.slice(0, 2).map((c) => <EvChip key={c.id} c={c} />)}
                    {extra > 0 && (
                      <button className="mc-more" onClick={() => openWeekFor(d)}>+{extra} clase{extra > 1 ? "s" : ""} más</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ESCRITORIO · SEMANA en columnas */}
        {isDesktop && effView === "week" && (
          <div className="wk-grid card">
            {weekDays(anchor).slice(0, 5).map((d) => {
              const k = ymd(d);
              const evs = byDate.get(k) ?? [];
              return (
                <div key={k} className={`wk-col ${k === today ? "today" : ""}`}>
                  <div className="wk-col-head">
                    <span className="wk-dow">{DAY_SHORT[(d.getDay() + 6) % 7]}</span>
                    <span className="wk-num">{d.getDate()}</span>
                  </div>
                  <div className="wk-col-body">
                    {evs.length === 0 ? <span className="muted tiny">—</span> : evs.map((c) => (
                      <button key={c.id} className="wk-ev" onClick={() => setOpenClassId(c.id)}>
                        <div className="wk-ev-name" style={{ textDecoration: c.not_delivered ? "line-through" : undefined }}>{studentLabel(c)}</div>
                        <div className="wk-ev-sub">{c.start_time.slice(0, 5)} · {c.subject}{c.not_delivered ? " · no impartida" : ""}</div>
                        {c.classroom && <div className="wk-ev-room muted tiny">{c.classroom}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isDesktop && (loading || syncing) && <div style={{ marginTop: 12 }}><SkeletonRows count={2} /></div>}
      </div>

      {openClassId && <ClaseModal classId={openClassId} onClose={() => setOpenClassId(null)} />}
    </div>
  );
}
