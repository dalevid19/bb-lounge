// B&B Lounge booking reminders. Runs every minute (scheduled in the database with pg_cron).
// Finds bookings that start within the next 30 minutes and sends a phone alert, once per booking,
// to the owner and HR, and to the technician(s) on that booking.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const REMIND_MIN = 30;
const LATE_MIN = 15; // still alert if the booking started up to 15 minutes ago and nobody acknowledged it
const MANILA_OFFSET_MIN = 8 * 60;

webpush.setVapidDetails("https://bblounge-app.pages.dev", Deno.env.get("VAPID_PUBLIC")!, Deno.env.get("VAPID_PRIVATE")!);
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const startMs = (b: Record<string, string>) => {
  const d = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(b.date || ""), t = /^(\d{1,2}):(\d{2})/.exec(b.time || "");
  if (!d || !t) return null;
  return Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]) - MANILA_OFFSET_MIN * 60000;
};
const fmtTime = (t: string) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("no", { status: 401 });
  const now = Date.now();
  const today = new Date(now + MANILA_OFFSET_MIN * 60000).toISOString().slice(0, 10);
  const yesterday = new Date(now + MANILA_OFFSET_MIN * 60000 - 86400000).toISOString().slice(0, 10);

  const { data: rows, error } = await db.from("docs").select("id,data").eq("col", "bookings").in("data->>date", [today, yesterday]).eq("data->>status", "booked");
  if (error) return new Response(error.message, { status: 500 });
  const due = (rows || []).map((r) => ({ id: r.id as string, b: r.data as Record<string, any> })).filter(({ b }) => {
    if (b.trip === "arrived") return false;
    const s = startMs(b); if (s == null) return false;
    const mins = (s - now) / 60000; return mins <= REMIND_MIN && mins > -LATE_MIN;
  });
  if (!due.length) return Response.json({ sent: 0 });

  const [{ data: profiles }, { data: subs }, { data: staff }] = await Promise.all([
    db.from("profiles").select("user_id,role,staff_id,active"),
    db.from("push_subs").select("endpoint,user_id,sub"),
    db.from("docs").select("id,data").eq("col", "staff"),
  ]);
  const staffName = (id: string) => ((staff || []).find((s) => s.id === id)?.data as any)?.name || "";
  let sent = 0;
  for (const { id, b } of due) {
    const key = `${id}|${b.date}|${b.time}`;
    const { error: dup } = await db.from("push_sent").insert({ key });
    if (dup) continue; // already alerted for this booking at this time
    const techs = [b.techId, b.techId2].filter(Boolean);
    const who = new Set((profiles || []).filter((p) => p.active && (p.role === "owner" || p.role === "hr" || (p.staff_id && techs.includes(p.staff_id)))).map((p) => p.user_id));
    const mins = Math.round(((startMs(b) as number) - now) / 60000);
    const techNames = techs.map(staffName).filter(Boolean).map((n: string) => n.split(" ")[0]).join(" + ") || b.techName || "";
    const services = (b.items || []).map((i: any) => i.name).filter(Boolean).join(", ");
    const payload = JSON.stringify({
      title: `${mins > 1 ? `In ${mins} min` : "Now"}: ${b.client || "Client"} at ${fmtTime(b.time)}`,
      body: [techNames, services, (b.address || "").split("\n")[0].slice(0, 80)].filter(Boolean).join(" · "),
      tag: key, url: "./#overview",
    });
    for (const s of (subs || []).filter((s) => who.has(s.user_id))) {
      try { await webpush.sendNotification(s.sub, payload, { TTL: 1800, urgency: "high" }); sent++; }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await db.from("push_subs").delete().eq("endpoint", s.endpoint); }
    }
  }
  await db.from("push_sent").delete().lt("sent_at", new Date(now - 3 * 86400000).toISOString());
  return Response.json({ due: due.length, sent });
});
