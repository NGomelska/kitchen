/* Сховище даних.
   Без налаштувань Firebase — локальне (тільки цей пристрій).
   З налаштуваннями (js/firebase-config.js) — спільне для родини, через js/cloud.js.
   Решта застосунку бачить той самий набір функцій.

   Колекції: items, recipes, slots, meta, settings */
const Store = (() => {
  const KEY = "kitchen-app-v2";
  const COLS = ["items", "recipes", "slots", "meta", "settings"];

  /* ---------- локальне сховище ---------- */
  const local = (() => {
    let data = null;
    const subs = new Map();
    function load() {
      try { data = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { data = null; }
      if (!data || typeof data !== "object") data = {};
      for (const c of COLS) if (!data[c] || typeof data[c] !== "object") data[c] = {};
    }
    function persist() {
      try { localStorage.setItem(KEY, JSON.stringify(data)); }
      catch (e) { window.toast && window.toast("Не вдалося зберегти: на пристрої закінчилось місце."); }
    }
    function emit(col) {
      const docs = Object.entries(data[col]).map(([id, v]) => ({ id, ...v }));
      for (const cb of subs.get(col) || []) cb(docs);
    }
    function seedData() {
      return {
        items: structuredClone(SEED.items), recipes: structuredClone(SEED.recipes), slots: structuredClone(SEED.slots),
        meta: structuredClone(SEED.meta), settings: { people: { list: structuredClone(SEED.people) } }
      };
    }
    function seedIfEmpty() {
      if (!COLS.every(c => Object.keys(data[c]).length === 0)) return;
      data = seedData(); persist();
    }
    window.addEventListener("storage", e => { if (e.key === KEY) { load(); COLS.forEach(emit); } });
    return {
      mode: "local",
      async init() { load(); seedIfEmpty(); },
      seedData,
      sub(col, cb) {
        if (!subs.has(col)) subs.set(col, new Set());
        subs.get(col).add(cb);
        cb(Object.entries(data[col]).map(([id, v]) => ({ id, ...v })));
        return () => subs.get(col).delete(cb);
      },
      newId(prefix = "x") { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },
      async set(col, id, doc) { data[col][id] = structuredClone(doc); persist(); emit(col); },
      async update(col, id, patch) {
        if (!data[col][id]) throw new Error("not found");
        Object.assign(data[col][id], structuredClone(patch)); persist(); emit(col);
      },
      async del(col, id) { delete data[col][id]; persist(); emit(col); },
      exportAll() { return structuredClone(data); },
      async importAll(obj) {
        for (const c of COLS) data[c] = obj && typeof obj[c] === "object" ? obj[c] : {};
        persist(); COLS.forEach(emit);
      },
      async reset() { data = seedData(); persist(); COLS.forEach(emit); }
    };
  })();

  /* ---------- екран входу (для спільного режиму) ---------- */
  function showLogin({ error, signIn }) {
    let el = document.getElementById("login");
    if (!el) { el = document.createElement("div"); el.id = "login"; el.className = "login"; document.body.appendChild(el); }
    el.innerHTML = `<div class="login-in"><h1>Кухня</h1><p>Спільне меню й покупки родини.</p>${error ? `<p class="login-err"></p>` : ""}<button class="btn green wide" type="button">Увійти через Google</button><p class="hint" id="loginState"></p></div>`;
    if (error) el.querySelector(".login-err").textContent = error;
    el.querySelector("button").onclick = async () => {
      const st = el.querySelector("#loginState"); st.textContent = "Відкриваю вхід…";
      try { await signIn(); el.remove(); } catch (e) { console.error(e); st.textContent = "Вхід не вдався. Спробуй ще раз."; }
    };
  }

  /* ---------- вибір режиму ---------- */
  let backend = local;
  const api = {
    get mode() { return backend.mode; },
    get user() { return backend.user || null; },
    async init() {
      await local.init();
      if (!window.FIREBASE_CONFIG) return;
      try {
        const cloud = await import("./cloud.js");
        backend = await cloud.start({ config: window.FIREBASE_CONFIG, emails: window.FAMILY_EMAILS, local, showLogin });
        document.getElementById("login")?.remove();
      } catch (e) {
        console.error(e);
        window.toast && window.toast("Не вдалося підключити спільні дані — поки працюю на цьому телефоні.");
        backend = local;
      }
    },
    sub: (col, cb) => backend.sub(col, cb),
    newId: p => local.newId(p),
    set: (col, id, d) => backend.set(col, id, d),
    update: (col, id, p) => backend.update(col, id, p),
    del: (col, id) => backend.del(col, id),
    exportAll: () => backend.exportAll(),
    importAll: obj => backend.importAll(obj),
    reset: () => backend.reset(),
    signOut: () => backend.signOut && backend.signOut()
  };
  return api;
})();
