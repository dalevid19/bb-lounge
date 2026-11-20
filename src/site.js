/* B&B Lounge website: connects the app to Supabase (sign-in, live data, logo, downloads).
   The app itself is the same code as the Claude version; this file provides the services it asks for. */
(() => {
  "use strict";
  const CFG = window.BB_CONFIG || {};
  const sb = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: true, autoRefreshToken: true }, realtime: { params: { eventsPerSecond: 20 } } });
  const emailOf = (u) => String(u || "").trim().toLowerCase() + "@staff.bblounge.app";
  const $ = (s) => document.querySelector(s);

  /* ---------- sign-in screen ---------- */
  let resolveReady; const ready = new Promise(r => { resolveReady = r; });
  let profile = null, user = null;
  function showLogin(msg) {
    const el = $("#bbLogin"); el.hidden = false;
    $("#bbLoginMsg").textContent = msg || "";
    setTimeout(() => { const u = $("#bbUser"); if (u && !u.value) u.focus(); }, 50);
  }
  async function afterAuth(session) {
    user = session.user;
    const { data, error } = await sb.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
    if (error || !data) { await sb.auth.signOut(); showLogin("This account isn't set up yet. Ask the owner to add you."); return; }
    if (!data.active) { await sb.auth.signOut(); showLogin("This account is blocked. Ask the owner."); return; }
    profile = data;
    window.SITE.session = { id: data.user_id, name: data.name, role: data.role };
    $("#bbLogin").hidden = true;
    resolveReady();
  }
  document.addEventListener("submit", async (ev) => {
    if (ev.target.id !== "bbLoginForm") return;
    ev.preventDefault();
    const btn = $("#bbLoginBtn"); btn.disabled = true; $("#bbLoginMsg").textContent = "Signing in…";
    const { data, error } = await sb.auth.signInWithPassword({ email: emailOf($("#bbUser").value), password: $("#bbPass").value });
    btn.disabled = false;
    if (error) { $("#bbLoginMsg").textContent = /invalid/i.test(error.message) ? "Wrong username or password." : error.message; $("#bbPass").value = ""; $("#bbPass").focus(); return; }
    await afterAuth(data.session);
  });
  sb.auth.getSession().then(({ data }) => { if (data.session) afterAuth(data.session); else showLogin(""); });

  /* ---------- live document store (same shape the app already uses) ---------- */
  const cols = new Map(); // col -> { map: Map(id -> snapshot), subs: Set(cb), loaded }
  const freeze = (o) => { if (o && typeof o === "object") { Object.values(o).forEach(freeze); Object.freeze(o); } return o; };
  const mkSnap = (id, data) => ({ id, exists: data != null, data: () => data == null ? undefined : data, metadata: { fromCache: false, hasPendingWrites: false } });
  const colState = (c) => { if (!cols.has(c)) cols.set(c, { map: new Map(), subs: new Set(), loaded: false, loading: null }); return cols.get(c); };
  const emit = (c) => { const st = colState(c); const docs = [...st.map.values()].sort((a, b) => a.id < b.id ? -1 : 1); const snap = { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false, hasPendingWrites: false }, docChanges: () => [] }; st.subs.forEach(cb => { try { cb(snap); } catch (e) { console.error(e); } }); };
  const put = (c, id, data) => { const st = colState(c); if (data == null) st.map.delete(id); else st.map.set(id, mkSnap(id, freeze(JSON.parse(JSON.stringify(data))))); };
  async function loadCol(c) {
    const st = colState(c); if (st.loaded) return; if (st.loading) return st.loading;
    st.loading = (async () => {
      let from = 0; const size = 1000;
      for (;;) {
        const { data, error } = await sb.from("docs").select("id,data").eq("col", c).range(from, from + size - 1);
        if (error) throw error;
        data.forEach(r => put(c, r.id, r.data));
        if (data.length < size) break; from += size;
      }
      st.loaded = true;
    })();
    return st.loading;
  }
  let channel = null;
  function listen() {
    if (channel) return;
    channel = sb.channel("docs-live").on("postgres_changes", { event: "*", schema: "public", table: "docs" }, (p) => {
      const row = p.new && p.new.col ? p.new : p.old; if (!row || !row.col) return;
      if (!cols.has(row.col)) return;
      if (p.eventType === "DELETE") put(row.col, row.id, null); else put(row.col, row.id, p.new.data);
      emit(row.col);
    }).subscribe();
  }
  const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), b => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
  const err = (e) => { const x = new Error(e && e.message || String(e)); x.code = /row-level security|permission/i.test(x.message) ? "invalid_argument" : "unavailable"; return x; };
  async function write(c, id, data) {
    const { error } = await sb.from("docs").upsert({ col: c, id, data, updated_at: new Date().toISOString() });
    if (error) throw err(error);
    put(c, id, data); emit(c);
  }
  function docRef(path) {
    const [c, id] = path.split("/");
    return {
      id, path,
      async get() { const st = colState(c); if (st.loaded) return st.map.get(id) || mkSnap(id, null); const { data, error } = await sb.from("docs").select("data").eq("col", c).eq("id", id).maybeSingle(); if (error) throw err(error); return mkSnap(id, data ? freeze(data.data) : null); },
      async set(d) { await write(c, id, d); },
      async update(d) { const cur = await this.get(); if (!cur.exists) { const x = new Error("That record no longer exists."); x.code = "invalid_argument"; throw x; } await write(c, id, Object.assign(JSON.parse(JSON.stringify(cur.data())), d)); },
      async delete() { const { error } = await sb.from("docs").delete().eq("col", c).eq("id", id); if (error) throw err(error); put(c, id, null); emit(c); },
      onSnapshot(cb, onErr) { const st = colState(c); const f = () => cb(st.map.get(id) || mkSnap(id, null)); st.subs.add(f); listen(); loadCol(c).then(f).catch(e => onErr && onErr(err(e))); return () => st.subs.delete(f); },
      collection() { throw new Error("Nested collections are not used on the website"); }
    };
  }
  function colRef(c) {
    return {
      path: c,
      doc: (id) => docRef(c + "/" + (id || newId())),
      async add(d) { const ref = docRef(c + "/" + newId()); await ref.set(d); return ref; },
      onSnapshot(cb, onErr) { const st = colState(c); st.subs.add(cb); listen(); loadCol(c).then(() => emit(c)).catch(e => onErr && onErr(err(e))); return () => st.subs.delete(cb); },
      async get() { await loadCol(c); const docs = [...colState(c).map.values()]; return { docs, size: docs.length, empty: !docs.length }; }
    };
  }
  const db = { doc: docRef, collection: colRef };

  /* ---------- who is signed in ---------- */
  const userApi = {
    canEdit: async () => !!profile && (profile.role === "owner" || profile.role === "hr"),
    isOwner: async () => !!profile && profile.role === "owner",
    id: async () => user ? user.id : null,
    can: async () => true,
    me: async () => ({ id: user && user.id, name: profile && profile.name }),
    profiles: async (ids) => { const { data } = await sb.from("profiles").select("user_id,name").in("user_id", ids); const out = {}; (data || []).forEach(p => { out[p.user_id] = { id: p.user_id, name: p.name }; }); return out; }
  };

  /* ---------- logo uploads ---------- */
  const assets = {
    async upload(file) { const ext = (file.name || "logo.png").split(".").pop().toLowerCase(); const key = `logo-${Date.now()}.${ext}`; const { error } = await sb.storage.from("assets").upload(key, file, { upsert: true, contentType: file.type }); if (error) throw err(error); return { id: key, url: sb.storage.from("assets").getPublicUrl(key).data.publicUrl, contentType: file.type }; },
    async delete(id) { await sb.storage.from("assets").remove([id]); },
    async list() { return { assets: [] }; }
  };

  /* ---------- CSV downloads ---------- */
  const downloads = { async save({ filename, data }) { const blob = data instanceof Blob ? data : new Blob([data], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return { status: "saved" }; } };

  /* ---------- staff accounts (owner) ---------- */
  const helper = window.supabase.createClient(CFG.url, CFG.anonKey, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "bb-helper" } });
  window.SITE = {
    session: null,
    signOut: async () => { await sb.auth.signOut(); location.reload(); },
    async listAccounts() { const { data, error } = await sb.from("profiles").select("*"); if (error) throw err(error); return data; },
    async createAccount({ username, password, name, role, staff_id }) {
      const { data, error } = await helper.auth.signUp({ email: emailOf(username), password });
      if (error) throw new Error(/registered|exists/i.test(error.message) ? "That username is already taken." : error.message);
      const { error: e2 } = await sb.rpc("owner_add_profile", { p_user: data.user.id, p_username: username, p_name: name, p_role: role, p_staff: staff_id || "" });
      if (e2) throw err(e2);
    },
    async updateAccount(uid, d) { const { error } = await sb.from("profiles").update({ name: d.name, role: d.role, staff_id: d.staff_id || "", active: d.active }).eq("user_id", uid); if (error) throw err(error); },
    async setPassword(uid, pw) { const { error } = await sb.rpc("owner_set_password", { p_user: uid, p_password: pw }); if (error) throw err(error); },
    async changeMyPassword(pw) { const { error } = await sb.auth.updateUser({ password: pw }); if (error) throw err(error); }
  };

  /* ---------- what the app asks for ---------- */
  const services = { db, user: userApi, assets, downloads };
  window.claude = { use: async (name) => { await ready; return services[name] || null; } };
})();
