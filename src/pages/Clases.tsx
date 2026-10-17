import { useEffect, useMemo, useState } from "react";
import { IcClock, IcMusic, IcUser } from "../components/icons";
import { EmptyState } from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { listClasses, WEEK_ORDER, WEEKDAYS } from "../lib/classes";
import type { ClassItem } from "../lib/types";

export default function Clases() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setClasses(await listClasses());
      } catch {
        // Sin datos todavía (p. ej. aún sin conectar la escuela): mostramos el aviso amable.
        setClasses([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<number, ClassItem[]>();
    for (const c of classes) {
      const arr = map.get(c.weekday) ?? [];
      arr.push(c);
      map.set(c.weekday, arr);
    }
    return map;
  }, [classes]);

  return (
    <div className="screen light">
      <div className="page-head">
        <IcMusic width={26} height={26} style={{ color: "var(--primary)" }} />
        <h1 className="h1">Clases</h1>
      </div>

      <div className="content" style={{ paddingTop: 4 }}>
        <p className="muted small" style={{ marginTop: 0 }}>
          Tu horario de clases, tal y como lo tiene la escuela.
        </p>

        {!loading && classes.length === 0 && (
          <div className="notice" style={{ marginBottom: 14 }}>
            <IcClock width={18} height={18} />
            Aún no hay clases. Ve a <strong>&nbsp;Escuela&nbsp;</strong> y pulsa <strong>&nbsp;Sincronizar&nbsp;</strong> para traer tu horario. Las crea la escuela; aquí solo las consultas.
          </div>
        )}

        {loading ? (
          <SkeletonRows count={4} />
        ) : classes.length === 0 ? (
          <EmptyState icon={<IcMusic width={30} height={30} />} title="Todavía no hay clases" subtitle="Se mostrarán al conectar con la escuela." />
        ) : (
          WEEK_ORDER.filter((d) => byDay.has(d)).map((d) => (
            <div key={d} style={{ marginBottom: 18 }}>
              <div className="day-h">{WEEKDAYS[d]}</div>
              {(byDay.get(d) ?? []).map((c) => (
                <div key={c.id} className="class-card">
                  <div className="row between">
                    <div className="grow">
                      <div style={{ fontWeight: 700 }}>{c.subject}</div>
                      <div className="muted small mono">
                        {c.start_time.slice(0, 5)} - {c.end_time.slice(0, 5)}{c.classroom ? ` · ${c.classroom}` : ""}
                      </div>
                    </div>
                  </div>
                  {c.students.length > 0 && (
                    <div className="chips" style={{ marginTop: 10 }}>
                      {c.students.map((s, i) => (
                        <span className="chip" key={i}><IcUser width={12} height={12} /> {s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
