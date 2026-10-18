/* Спільне сховище родини (Firestore) + вхід через Google + розбір рецептів через Gemini.
   Підключається з store.js, тільки коли в firebase-config.js є налаштування. */
const V = "12.4.0";
const CDN = `https://www.gstatic.com/firebasejs/${V}`;
const COLS = ["items", "recipes", "slots", "meta", "settings"];

export async function start({ config, emails, local, showLogin }) {
  const [{ initializeApp }, A, F, AI] = await Promise.all([
    import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-firestore.js`), import(`${CDN}/firebase-ai.js`)
  ]);
  const app = initializeApp(config);
  const auth = A.getAuth(app);
  const db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  const allowed = (emails || []).map(e => e.toLowerCase());

  /* 1. вхід */
  const user = await new Promise(resolve => {
    const unsub = A.onAuthStateChanged(auth, u => {
      if (u && (!allowed.length || allowed.includes((u.email || "").toLowerCase()))) { unsub(); resolve(u); return; }
      showLogin({
        error: u ? `Акаунт ${u.email} не має доступу. Увійди тим, який додали в застосунок.` : "",
        signIn: async () => {
          if (u) await A.signOut(auth);
          const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
          try { await A.signInWithPopup(auth, p); }
          catch (e) { if (e && e.code === "auth/popup-blocked") await A.signInWithRedirect(auth, p); else throw e; }
        }
      });
    });
  });

  /* 2. дані: живі підписки на колекції */
  const cache = Object.fromEntries(COLS.map(c => [c, new Map()]));
  const subs = new Map();
  const ready = {};
  const emit = col => { const docs = [...cache[col].entries()].map(([id, v]) => ({ id, ...v })); for (const cb of subs.get(col) || []) cb(docs); };
  await Promise.all(COLS.map(col => new Promise(res => {
    F.onSnapshot(F.collection(db, col), snap => {
      for (const ch of snap.docChanges()) {
        if (ch.type === "removed") cache[col].delete(ch.doc.id); else cache[col].set(ch.doc.id, ch.doc.data());
      }
      emit(col);
      if (!ready[col]) { ready[col] = true; res(); }
    }, err => { console.error(col, err); window.toast && window.toast("Немає доступу до спільних даних. Перевір, що увійшла правильним акаунтом."); res(); });
  })));

  async function writeAll(obj) {
    const ops = [];
    for (const c of COLS) for (const [id, v] of Object.entries(obj[c] || {})) ops.push([c, id, v]);
    for (let i = 0; i < ops.length; i += 400) {
      const b = F.writeBatch(db);
      for (const [c, id, v] of ops.slice(i, i + 400)) b.set(F.doc(db, c, id), v);
      await b.commit();
    }
  }
  /* перший запуск: у хмарі порожньо — переносимо те, що вже є на цьому телефоні */
  if (COLS.every(c => cache[c].size === 0)) await writeAll(local.exportAll());

  /* 3. Gemini */
  const ai = AI.getAI(app, { backend: new AI.GoogleAIBackend() });
  window.AI = { parseRecipe: opts => parseRecipe(AI, ai, { ...opts, profile: (cache.settings.get("profile") || {}).text || "", key: (cache.settings.get("ai") || {}).geminiKey || "" }) };

  return {
    mode: "cloud",
    user: { email: user.email, name: user.displayName || "" },
    signOut: () => A.signOut(auth).then(() => location.reload()),
    sub(col, cb) {
      if (!subs.has(col)) subs.set(col, new Set());
      subs.get(col).add(cb);
      cb([...cache[col].entries()].map(([id, v]) => ({ id, ...v })));
      return () => subs.get(col).delete(cb);
    },
    newId: local.newId,
    set: (col, id, d) => F.setDoc(F.doc(db, col, id), d),
    update: (col, id, p) => F.updateDoc(F.doc(db, col, id), p),
    del: (col, id) => F.deleteDoc(F.doc(db, col, id)),
    exportAll: () => Object.fromEntries(COLS.map(c => [c, Object.fromEntries(cache[c])])),
    async importAll(obj) {
      for (const c of COLS) for (const id of cache[c].keys()) if (!(obj[c] || {})[id]) await F.deleteDoc(F.doc(db, c, id));
      await writeAll(obj);
    },
    async reset() { await this.importAll(local.seedData()); }
  };
}

/* ---------- розбір рецепта ---------- */
const GROUPS = ["protein", "base", "veg", "sauce", "sweet", "dish"];
const PROMPT = `Ти допомагаєш родині вести книгу рецептів. Нижче — рецепт (посилання, скриншоти та/або текст з опису поста чи відео).
Витягни рецепт і переклади все українською (назву, інгредієнти, кроки), навіть якщо оригінал англійською чи іншою мовою.
Переведи американські й британські міри в метричні з урахуванням продукту: cup борошна ≈ 125 г, cup цукру ≈ 200 г, cup коричневого цукру ≈ 220 г, cup вівсяних пластівців ≈ 90 г, cup рису ≈ 190 г, cup тертого сиру ≈ 100 г, cup рідини (молоко, вода, йогурт рідкий) = 240 мл, cup грецького йогурту ≈ 245 г, cup ягід ≈ 150 г, stick масла = 113 г, oz = 28 г, lb = 454 г, fl oz = 30 мл, tbsp = 1 ст.л., tsp = 1 ч.л. Температуру з °F переведи в °C (325°F ≈ 165°C, 350°F ≈ 175°C, 375°F ≈ 190°C, 400°F ≈ 200°C, 425°F ≈ 220°C), округлюючи до 5°. Мед, кленовий і кукурудзяний сиропи, цукор залиш як є в інгредієнтах, а в tip підкажи заміну на еритритол.
Поверни ТІЛЬКИ JSON без пояснень:
{"title":"Назва","servings":4,"cat":"М'ясні страви","group":"protein","tags":["Сім'я"],"ingredients":[{"qty":700,"unit":"г","name":"Фарш з індички"},{"qty":null,"unit":"","name":"Сіль"}],"steps":["Крок 1"],"prep":[{"when":"eve","t":"Замаринувати м'ясо, в холодильник","min":10},{"when":"pre","before":25,"t":"М'ясо в аерогриль 190° 20 хв","min":2}],"tip":"..."}
Правила:
- unit — лише: г, кг, мл, л, шт, ст.л., ч.л., пучок; або "" коли qty = null («за смаком»).
- servings — на скільки дорослих порцій розрахований рецепт (оціни, якщо не сказано).
- cat — категорія, одна з: "Сніданки","М'ясні страви","Рибні страви","Гарніри","Салати й овочі","Закуски","Супи","Дитячі страви","ПП-десерти","Десерти","Випічка","Соуси","Інше". ПП-десерти — без цукру, з еритритолом чи цукрозамінником. Дитячі страви — снеки й перекуси саме для малої дитини (яблучні палички, дитячі оладки тощо).
- group — що це в мисці: protein (м'ясо, риба, котлети), base (крупи, макарони, картопля), veg (овочі, салати), sauce (соус, хумус, топінг), sweet (десерт), dish (ціла страва, де все разом).
- tags — лише з: "Сім'я","Для мене","Син їсть","Десерт","Швидко". "Для мене" — багато білку і клітковини, мало цукру. "Син їсть" — підходить малій дитині, яка їсть небагато страв (див. «Про родину»). "Швидко" — до 30 хв.
- prep — що можна зробити заздалегідь, щоб увечері біля плити стояти менше: [{"when":"eve|morn|day|pre","t":"що зробити","min":10,"before":30}]. eve — напередодні ввечері (маринування, тісто, розморозка), morn — зранку, day — вдень у перервах (нарізати, натерти, сформувати), pre — останній крок перед їжею (before — за скільки хвилин до їжі почати: час запікання + підготовка). min — активна робота в хвилинах. 1–4 пункти.
- tip — 1–2 речення: як зробити страву кориснішою з урахуванням «Про родину» (більше білку чи клітковини, еритритол замість цукру) і як подати дитині.
- Якщо інгредієнтів або кроків не видно — залиш масив порожнім. Нічого не вигадуй.`;

async function parseRecipe(AI, ai, { link, text, images, profile, key }) {
  const prompt = PROMPT + `

Про родину: ${profile || "—"}

Посилання: ${link || "—"}
Текст:
${(text || "—").slice(0, 8000)}`;
  const imgs = [];
  for (const f of images || []) imgs.push({ mime: f.type || "image/jpeg", data: await b64(f) });
  const yt = /youtu\.?be/.test(link || "");
  // інші посилання (Instagram, TikTok) Gemini пробує відкрити сам
  const useUrl = !!link && !yt;
  let raw;
  try {
    if (key) raw = await viaKey(key, prompt, imgs, yt ? link : "", useUrl);
    else {
      const parts = [{ text: prompt }, ...imgs.map(i => ({ inlineData: { mimeType: i.mime, data: i.data } }))];
      if (yt) parts.push({ fileData: { mimeType: "video/mp4", fileUri: link } });
      const model = AI.getGenerativeModel(ai, { model: "gemini-flash-latest", ...(useUrl ? { tools: [{ urlContext: {} }] } : {}) });
      raw = (await model.generateContent({ contents: [{ role: "user", parts }] })).response.text();
    }
  } catch (e) {
    console.error(e);
    const msg = String(e && e.message);
    const err = new Error("gemini");
    err.userMessage = /quota|429|RESOURCE_EXHAUSTED/i.test(msg) ? "Ліміт Gemini на сьогодні вичерпано. Спробуй завтра або заповни вручну."
      : /genai config|API key|API_KEY|403|401/i.test(msg) ? "Gemini ще не підключений: встав ключ у «Ще → Ключ Gemini»."
      : yt ? "Не вдалося переглянути відео. Встав текст з опису або скриншот." : "Не вдалося розібрати. Додай скриншот або текст з опису.";
    throw err;
  }
  const m = String(raw || "").match(/\{[\s\S]*\}/);
  if (!m) { const err = new Error("no json"); err.userMessage = "Gemini не знайшов рецепт. Додай скриншот або текст з опису."; throw err; }
  const j = JSON.parse(m[0]);
  j.ingredients = (j.ingredients || []).filter(i => i && i.name).map(i => ({ qty: i.qty == null || i.qty === "" ? null : +i.qty, unit: i.qty == null ? "" : String(i.unit || "шт"), name: String(i.name) }));
  if (!GROUPS.includes(j.group)) j.group = "dish";
  if (!j.ingredients.length && !(j.steps || []).length) { const err = new Error("empty"); err.userMessage = "Рецепту в описі не видно. Додай скриншот або текст."; throw err; }
  return j;
}
/* прямий виклик Gemini API власним ключем (ключ лежить у закритих даних родини, не в коді) */
async function viaKey(key, prompt, imgs, ytLink, useUrl) {
  const parts = [{ text: prompt }, ...imgs.map(i => ({ inline_data: { mime_type: i.mime, data: i.data } }))];
  if (ytLink) parts.push({ file_data: { file_uri: ytLink } });
  const body = { contents: [{ role: "user", parts }], ...(useUrl ? { tools: [{ url_context: {} }] } : {}) };
  const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent", {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(body)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${r.status} ${(d.error && (d.error.status + " " + d.error.message)) || ""}`);
  return ((d.candidates || [])[0]?.content?.parts || []).map(p => p.text || "").join("");
}
function b64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
}
