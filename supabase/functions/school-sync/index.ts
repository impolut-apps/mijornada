// Supabase Edge Function: sincroniza (SOLO LECTURA) con la plataforma de la escuela.
// Inicia sesión con las credenciales guardadas en los SECRETOS de la función,
// lee el horario de clases y los fichajes, y los vuelca en la base de datos.
// NO envía fichajes a la escuela (eso será la Fase B, con confirmación).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { DOMParser, type Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

const BASE = (Deno.env.get("SCHOOL_BASE_URL") ?? "http://113.30.148.43").replace(/\/$/, "");
const USERNAME = Deno.env.get("SCHOOL_USERNAME") ?? "";
const PASSWORD = Deno.env.get("SCHOOL_PASSWORD") ?? "";
// Los fichajes solo se leen a partir de esta fecha (inicio de uso de la app).
const START = Deno.env.get("SCHOOL_START") ?? "2026-10-19";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// ---- cookies (fetch no las gestiona solo) ----
function mergeCookies(jar: Map<string, string>, res: Response) {
  const list = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const c of list) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}
const cookieHeader = (jar: Map<string, string>) => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

function extractCsrf(html: string): string | null {
  const m =
    html.match(/name="csrf_token"[^>]*value="([^"]+)"/i) ||
    html.match(/value="([^"]+)"[^>]*name="csrf_token"/i);
  return m ? m[1] : null;
}

async function login(jar: Map<string, string>): Promise<void> {
  const g = await fetch(`${BASE}/login`, { redirect: "manual" });
  mergeCookies(jar, g);
  const csrf = extractCsrf(await g.text());
  if (!csrf) throw new Error("No se pudo leer el token de la página de acceso");

  const body = new URLSearchParams({ csrf_token: csrf, role: "teacher", username: USERNAME, password: PASSWORD });
  const p = await fetch(`${BASE}/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader(jar) },
    body: body.toString(),
  });
  mergeCookies(jar, p);

  // Comprobar que entramos: /teacher/ no debe redirigir al login
  const check = await fetch(`${BASE}/teacher/`, { redirect: "manual", headers: { Cookie: cookieHeader(jar) } });
  mergeCookies(jar, check);
  const html = await check.text();
  if (check.status >= 300 && check.status < 400) throw new Error("Usuario o contraseña incorrectos");
  if (/name="password"/i.test(html)) throw new Error("Usuario o contraseña incorrectos");
}

function toIsoDate(ddmmyyyy: string): string | null {
  const m = ddmmyyyy.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

type AttRow = { work_date: string; entrada: string | null; salida: string | null; horas: number };

async function readAttendanceRange(jar: Map<string, string>, from: string, to: string): Promise<AttRow[]> {
  const res = await fetch(`${BASE}/teacher/attendance?from_date=${from}&to_date=${to}`, {
    headers: { Cookie: cookieHeader(jar) },
  });
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  const rows: AttRow[] = [];
  for (const tr of doc?.querySelectorAll("table tbody tr") ?? []) {
    const tds = [...(tr as Element).querySelectorAll("td")].map((t) => t.textContent.trim());
    if (tds.length < 4) continue;
    const iso = toIsoDate(tds[0]);
    if (!iso) continue;
    const clean = (s: string) => (s && s !== "-" ? s : null);
    rows.push({ work_date: iso, entrada: clean(tds[1]), salida: clean(tds[2]), horas: parseFloat(tds[3]) || 0 });
  }
  return rows;
}

async function readAttendance(jar: Map<string, string>): Promise<AttRow[]> {
  const toD = new Date();
  const to = toD.toISOString().slice(0, 10);
  const back = new Date(toD.getTime() - 60 * 86400000).toISOString().slice(0, 10);
  const from = back < START ? START : back;
  if (to < from) return []; // aún no se ha llegado a la fecha de inicio
  return readAttendanceRange(jar, from, to);
}

/** Lee la hora del token CSRF de la página del profesor y envía un fichaje manual. */
async function postClockManual(jar: Map<string, string>, day: string, start: string, end: string): Promise<void> {
  const g = await fetch(`${BASE}/teacher/`, { headers: { Cookie: cookieHeader(jar) } });
  const csrf = extractCsrf(await g.text());
  if (!csrf) throw new Error("No se pudo preparar el envío (token)");
  const body = new URLSearchParams({ csrf_token: csrf, day, start, end });
  const p = await fetch(`${BASE}/teacher/clock-manual`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookieHeader(jar) },
    body: body.toString(),
  });
  mergeCookies(jar, p);
  if (p.status >= 400 && p.status < 600 && p.status !== 500) {
    // 4xx = rechazo del servidor
    if (p.status >= 400 && p.status < 500) throw new Error(`La escuela rechazó el fichaje (${p.status})`);
  }
}

async function readClasses(jar: Map<string, string>, from: string, to: string) {
  const res = await fetch(`${BASE}/teacher/history?from_date=${from}&to_date=${to}`, { headers: { Cookie: cookieHeader(jar) } });
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  const nodes = doc?.querySelectorAll(".day-section-head, article.history-class-item") ?? [];
  const classes: {
    external_id: string | null; weekday: number; class_date: string | null;
    start_time: string; end_time: string; subject: string; classroom: string | null; students: string[];
  }[] = [];
  let currentDate: string | null = null;
  for (const node of nodes) {
    const el = node as Element;
    if (el.classList.contains("day-section-head")) {
      const dateText = el.querySelector("div:last-child")?.textContent ?? "";
      currentDate = toIsoDate(dateText);
      continue;
    }
    const subject = el.querySelector("strong")?.textContent.trim() ?? "";
    const classroom = (el.querySelector(".text-muted")?.textContent ?? "").replace(/^[·\s]+/, "").trim() || null;
    const range = el.querySelector(".badge")?.textContent.trim() ?? "";
    const [start, end] = range.split("-").map((s) => s.trim());
    const text = el.textContent;
    const am = text.match(/Alumnos:\s*([^\n]+)/i);
    const students = am && !/sin lista/i.test(am[1])
      ? am[1].split(/,|·/).map((s) => s.trim()).filter(Boolean)
      : [];
    const weekday = currentDate ? new Date(currentDate + "T12:00:00Z").getUTCDay() : 0;
    if (subject && start && end) {
      classes.push({ external_id: null, weekday, class_date: currentDate, start_time: start, end_time: end, subject, classroom, students });
    }
  }
  return classes;
}

type Admin = ReturnType<typeof createClient>;

/** Fase B: envía a la escuela el fichaje de un día (con las horas reales guardadas). */
async function handleClock(admin: Admin, userId: string, day: string): Promise<Response> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return json({ error: "Día no válido" }, 400);

  const { data: session } = await admin.from("work_sessions").select("id, work_date").eq("user_id", userId).eq("work_date", day).maybeSingle();
  if (!session) return json({ error: "No tienes jornada guardada ese día" }, 400);
  const { data: events } = await admin.from("time_events").select("type, received_at_utc, local_time").eq("work_session_id", (session as { id: string }).id).order("received_at_utc", { ascending: true });
  const evs = (events ?? []) as { type: string; local_time: string }[];
  const firstIn = evs.find((e) => e.type === "clock_in");
  const lastOut = [...evs].reverse().find((e) => e.type === "clock_out");
  if (!firstIn || !lastOut) return json({ error: "La jornada de ese día no está cerrada (falta entrada o salida)" }, 400);
  const start = firstIn.local_time.slice(0, 5);
  const end = lastOut.local_time.slice(0, 5);
  const nowIso = () => new Date().toISOString();

  const jar = new Map<string, string>();
  try {
    await login(jar);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "No se pudo conectar" }, 502);
  }

  // ¿Ya está fichado ese día en la escuela? -> no duplicar
  const before = await readAttendanceRange(jar, day, day);
  const existing = before.find((r) => r.work_date === day && (r.entrada || r.horas > 0));
  if (existing) {
    await admin.from("platform_records").upsert({ user_id: userId, work_date: day, entrada: existing.entrada, salida: existing.salida, horas: existing.horas, fetched_at: nowIso() }, { onConflict: "user_id,work_date" });
    await admin.from("sync_jobs").upsert({ user_id: userId, work_date: day, status: "synced", method: "already", start_sent: start, end_sent: end, last_attempt_at: nowIso(), updated_at: nowIso() }, { onConflict: "user_id,work_date" });
    return json({ ok: true, status: "already", message: "Ese día ya estaba fichado en la escuela" });
  }

  await admin.from("sync_jobs").upsert({ user_id: userId, work_date: day, status: "pending", method: "clock_manual", start_sent: start, end_sent: end, last_attempt_at: nowIso(), updated_at: nowIso() }, { onConflict: "user_id,work_date" });
  try {
    await postClockManual(jar, day, start, end);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al enviar";
    await admin.from("sync_jobs").update({ status: "failed", last_error: msg, updated_at: nowIso() }).eq("user_id", userId).eq("work_date", day);
    return json({ ok: false, status: "failed", error: msg }, 502);
  }

  // Verificar releyendo la escuela
  const after = await readAttendanceRange(jar, day, day);
  const row = after.find((r) => r.work_date === day && (r.entrada || r.horas > 0));
  if (row) {
    await admin.from("platform_records").upsert({ user_id: userId, work_date: day, entrada: row.entrada, salida: row.salida, horas: row.horas, fetched_at: nowIso() }, { onConflict: "user_id,work_date" });
    await admin.from("sync_jobs").update({ status: "synced", last_error: null, updated_at: nowIso() }).eq("user_id", userId).eq("work_date", day);
    return json({ ok: true, status: "synced", entrada: row.entrada, salida: row.salida, horas: row.horas });
  }
  await admin.from("sync_jobs").update({ status: "needs_review", last_error: "Enviado pero no verificado", updated_at: nowIso() }).eq("user_id", userId).eq("work_date", day);
  return json({ ok: false, status: "needs_review", error: "Se envió pero no se pudo verificar; revísalo en la escuela" });
}

function defaultWeek(): { from: string; to: string } {
  const d = new Date();
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  const mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow));
  const sun = new Date(mon.getTime() + 6 * 86400000);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { from: fmt(mon), to: fmt(sun) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!USERNAME || !PASSWORD) return json({ error: "Faltan las credenciales de la escuela en los secretos" }, 400);

    const bodyIn = await req.json().catch(() => ({})) as { from?: string; to?: string; action?: string; day?: string };
    const dw = defaultWeek();
    const from = /^\d{4}-\d{2}-\d{2}$/.test(bodyIn.from ?? "") ? bodyIn.from! : dw.from;
    const to = /^\d{4}-\d{2}-\d{2}$/.test(bodyIn.to ?? "") ? bodyIn.to! : dw.to;

    const authHeader = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await anon.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "No autenticado" }, 401);

    const admin = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fase B: enviar un fichaje concreto a la escuela.
    if (bodyIn.action === "clock") return await handleClock(admin, user.id, bodyIn.day ?? "");

    const jar = new Map<string, string>();
    try {
      await login(jar);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error de conexión";
      await admin.from("integration_state").upsert({
        user_id: user.id, connected: false, last_status: "error", last_error: msg, updated_at: new Date().toISOString(),
      });
      return json({ error: msg }, 502);
    }

    const [attendance, classes] = await Promise.all([readAttendance(jar), readClasses(jar, from, to)]);

    // Clases: refrescar SOLO el rango pedido (borrar ese rango e insertar lo leído)
    await admin.from("classes").delete().eq("user_id", user.id).gte("class_date", from).lte("class_date", to);
    if (classes.length) {
      await admin.from("classes").insert(classes.map((c) => ({ ...c, user_id: user.id, synced_at: new Date().toISOString() })));
    }

    // Fichajes de la escuela: upsert por día
    for (const r of attendance) {
      await admin.from("platform_records").upsert(
        { user_id: user.id, ...r, fetched_at: new Date().toISOString() },
        { onConflict: "user_id,work_date" }
      );
    }

    await admin.from("integration_state").upsert({
      user_id: user.id, connected: true, last_sync_at: new Date().toISOString(),
      last_status: "ok", last_error: null, updated_at: new Date().toISOString(),
    });

    return json({ ok: true, classes: classes.length, attendance: attendance.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error inesperado" }, 500);
  }
});
