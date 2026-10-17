import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IcChevronL } from "../components/icons";
import ClaseDetailContent from "../components/ClaseDetailContent";
import { getClassById } from "../lib/classes";
import type { ClassItem } from "../lib/types";

export default function ClaseDetalle() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const [cls, setCls] = useState<ClassItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setCls(await getClassById(id));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="app"><div className="screen light"><div className="spinner">Un momento…</div></div></div>;
  if (!cls) return <div className="app"><div className="screen light"><div className="spinner">No se encontró la clase.</div></div></div>;

  return (
    <div className="app">
      <div className="screen light slide-in" style={{ paddingBottom: 24 }}>
        <div className="page-head">
          <button className="iconbtn" onClick={() => nav(-1)}><IcChevronL width={22} height={22} /></button>
          <h1 className="h2">Detalle de la clase</h1>
        </div>
        <div className="content" style={{ paddingTop: 4 }}>
          <ClaseDetailContent cls={cls} />
        </div>
      </div>
    </div>
  );
}
