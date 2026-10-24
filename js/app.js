/* Інтерфейс: вкладки Купити / Меню / Рецепти / Ще. Дані — через Store. */
(() => {
  const CATS = ["Овочі і фрукти", "Хліб", "М'ясо і риба", "Молочне і яйця", "Бакалія", "Заморожене", "Солодке", "Дім і гігієна", "Інше"];
  const GUESS = [
    [/замор|морожен/i, "Заморожене"],
    [/хліб|батон|лаваш|тортил|булк|багет/i, "Хліб"],
    [/кур|індич|фарш|свин|ялович|телят|м['’]?яс|ковбас|сосиск|лосос|риб|тунец|тунц|креветк|філе|стегн|печінк/i, "М'ясо і риба"],
    [/молок|сир|творог|йогурт|кефір|сметан|вершк|масло вершк|яйц|білк|моцарел|бринз/i, "Молочне і яйця"],
    [/огір|помід|цукін|кабач|брокол|капуст|салат|морк|цибул|часн|перец|картоп|яблук|банан|груш|ягод|ягід|апельс|мандар|лимон|авокад|зелен|кріп|петруш|шпинат|гриб|фрукт|овоч|виноград|ківі|буряк|селер|баклаж|порей/i, "Овочі і фрукти"],
    [/кускус|макарон|спагет|рис|греч|пластів|вівс|борошн|олі[яї]|пасат|томатн|соус|горіх|чіа|еритрит|цукор|сіль|спеці|кава|чай|какао|сочевиц|нут|квасол|консерв|мед|крупа|булгур|кіноа|хумус|оливк|маслин|в'ялен|кетчуп|гірчиц|оцет|сухар|паприк|коріандр/i, "Бакалія"],
    [/печив|шоколад|цукерк|солодк|вафл/i, "Солодке"],
    [/папір|мило|шампун|порош|губк|пакет|засіб|підгуз|серветк|фольг|зубн/i, "Дім і гігієна"]
  ];
  const TAGS = ["Сім'я", "Для мене", "Син їсть", "Десерт", "Швидко"];
  const RCATS = ["Сніданки", "Супи", "М'ясні страви", "Рибні страви", "Гарніри", "Салати й овочі", "Закуски", "Дитячі страви", "ПП-десерти", "Десерти", "Випічка", "Соуси", "Інше"];
  /* категорія рецепта: вибрана вручну, а якщо ні — здогадка з групи страви */
  const catOf = r => {
    if (r.cat && RCATS.includes(r.cat)) return r.cat;
    const t = String(r.title || "").toLowerCase();
    if (/лосос|риб|тунц|тунец|сьомг/.test(t)) return "Рибні страви";
    if (/сніданок|омлет/.test(t)) return "Сніданки";
    if (/суп|борщ|бульйон/.test(t)) return "Супи";
    if (r.group === "protein") return "М'ясні страви";
    if (r.group === "base") return "Гарніри";
    if (r.group === "veg") return "Салати й овочі";
    if (r.group === "sauce") return "Соуси";
    if (r.group === "sweet") return (r.tags || []).includes("Для мене") ? "ПП-десерти" : "Десерти";
    return "Інше";
  };
  const GROUPS = { protein: "Білок", base: "Основа", veg: "Овочі", sauce: "Соус і зверху", sweet: "Десерт", dish: "Ціла страва" };
  const GKEYS = Object.keys(GROUPS);
  const MEALS = [["b", "Сніданок"], ["l", "Обід"], ["d", "Вечеря"], ["x", "Перекус / десерт"]];
  const TABS = ["buy", "prep", "menu", "me", "rec", "more"];
  /* підготовка: коли робити */
  const MEAL_T = { b: "08:00", l: "13:00", d: "18:30", x: "19:30" };
  const MEAL_GEN = { b: "сніданком", l: "обідом", d: "вечерею", x: "перекусом" };
  const WHEN_W = { eve: "напередодні", morn: "зранку", day: "вдень" };
  const hm = (t, minus) => { const [h, mm] = String(t || "18:30").split(":").map(Number); let x = h * 60 + mm - (+minus || 0); x = ((x % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
  /* рядок у формі рецепта ↔ справа: «напередодні: замаринувати курку (10 хв)», «за 30 хв: котлети в аерогриль (2 хв)» */
  function parsePrep(line) {
    let t = String(line || "").trim(); if (!t) return null;
    let when = "pre", before = 30, min = null;
    const m = /^([^:]{2,30}):\s*(.+)$/.exec(t);
    if (m) {
      const k = m[1].trim().toLowerCase(), b = /^за\s*(\d+)\s*(хв|год)/.exec(k);
      if (b) { before = +b[1] * (b[2] === "год" ? 60 : 1); t = m[2]; }
      else if (/^(напередодні|ввечері|звечора|на ніч)/.test(k)) { when = "eve"; t = m[2]; }
      else if (/^(зранку|вранці)/.test(k)) { when = "morn"; t = m[2]; }
      else if (/^(вдень|удень|в перерв)/.test(k)) { when = "day"; t = m[2]; }
    }
    const mm = /\((\d+)\s*хв\)\s*$/.exec(t);
    if (mm) { min = +mm[1]; t = t.slice(0, mm.index).trim(); }
    return when === "pre" ? { t, when, before, min } : { t, when, min };
  }
  /* 35 → «35 хв», 80 → «1 год 20 хв», 240 → «4 год» */
  const fmtMin = m => { m = Math.round(+m || 0); if (!m) return ""; const h = Math.floor(m / 60), r = m % 60; return h ? `${h} год${r ? ` ${r} хв` : ""}` : `${r} хв`; };
  const prepLine = p => `${p.when === "pre" ? `за ${p.before || 30} хв` : WHEN_W[p.when] || "вдень"}: ${p.t}${p.min ? ` (${p.min} хв)` : ""}`;
  const WD = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const WDF = ["неділя", "понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота"];
  const WDA = ["неділю", "понеділок", "вівторок", "середу", "четвер", "п'ятницю", "суботу"];
  const MON = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];

  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const guessCat = n => { for (const [re, c] of GUESS) if (re.test(n)) return c; return "Інше"; };
  const safeUrl = u => /^https?:\/\//i.test(String(u || "")) ? u : "";
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const N = Portions.num;
  const r0 = Math.round;

  /* дати без часових поясів: «2026-10-18» */
  const toDate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const iso = dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const addDays = (s, n) => { const d = toDate(s); d.setDate(d.getDate() + n); return iso(d); };
  const todayKey = () => iso(new Date());
  const sundayOf = s => addDays(s, -toDate(s).getDay());

  const S = {
    items: [], recipes: [], slots: [], meta: {}, people: SEED.people,
    tag: "all", rcat: "all", src: "all", q: "", pantryEdit: false, homeEdit: false,
    weekStart: null, day: null, viewP: "me", prepWho: "all", profile: "", aiKey: ""
  };
  let nutCache = new Map();
  const recipeById = () => Object.fromEntries(S.recipes.map(r => [r.id, r]));
  const recipe = id => S.recipes.find(r => r.id === id);
  const nutOf = r => { if (!nutCache.has(r.id)) nutCache.set(r.id, Nutrition.perPortion(r)); return nutCache.get(r.id); };
  const person = id => S.people.find(p => p.id === id);
  const weekDates = () => Array.from({ length: 7 }, (_, i) => addDays(S.weekStart, i));
  const slotOf = (date, meal) => S.slots.find(s => s.id === `${date}_${meal}`);

  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3200); }
  window.toast = toast;
  async function save(fn) { try { await fn(); return true; } catch (e) { console.error(e); toast("Не вдалося зберегти. Спробуй ще раз."); return false; } }

  /* миска згори: сегменти за групами страв */
  function bowl(groups, size = 64) {
    const c = size / 2, r = size / 2 - 5, ri = r - 3;
    const parts = groups.length ? groups : [];
    let h = "", a = -90;
    const s = 360 / (parts.length || 1);
    for (const g of parts) {
      if (parts.length === 1) { h += `<circle cx="${c}" cy="${c}" r="${ri}" fill="var(--${g})"/>`; break; }
      const a1 = a * Math.PI / 180, a2 = (a + s) * Math.PI / 180;
      h += `<path d="M${c} ${c}L${(c + ri * Math.cos(a1)).toFixed(1)} ${(c + ri * Math.sin(a1)).toFixed(1)}A${ri} ${ri} 0 ${s > 180 ? 1 : 0} 1 ${(c + ri * Math.cos(a2)).toFixed(1)} ${(c + ri * Math.sin(a2)).toFixed(1)}Z" fill="var(--${g})" stroke="var(--card)" stroke-width="2"/>`;
      a += s;
    }
    if (!parts.length) h = `<circle cx="${c}" cy="${c}" r="${ri - 2}" fill="none" stroke="var(--ink-soft)" stroke-width="1.5" stroke-dasharray="3 4"/>`;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" filter="url(#pencil)" aria-hidden="true"><circle cx="${c}" cy="${c + 2}" r="${r + 2}" fill="rgba(0,0,0,.08)"/><circle cx="${c}" cy="${c}" r="${r + 2}" fill="var(--paper)"/>${h}<circle cx="${c}" cy="${c}" r="${r + 2}" fill="none" stroke="var(--ink)" stroke-width="2"/></svg>`;
  }
  const groupsOf = dishes => { const seen = []; for (const d of dishes) { const r = recipe(d.rid); const g = r && GROUPS[r.group] ? r.group : "dish"; if (!seen.includes(g)) seen.push(g); } return seen; };

  /* ---------- вкладки ---------- */
  function go(tab) {
    if (tab === "prep") setTimeout(renderPrep, 0);
    document.querySelectorAll("[data-tab]").forEach(s => s.hidden = s.dataset.tab !== tab);
    document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.go === tab));
    try { localStorage.setItem("kitchen-tab", tab); } catch (e) {}
    renderSub();
    window.scrollTo(0, 0);
  }
  const curTab = () => document.querySelector("nav.tabs button[aria-selected=true]")?.dataset.go || "menu";
  document.querySelectorAll("nav.tabs button").forEach(b => b.onclick = () => go(b.dataset.go));

  function renderSub() {
    if (!["menu", "prep"].includes(curTab()) || !S.weekStart) { $("#sub").textContent = ""; return; }
    const a = toDate(S.weekStart), b = toDate(addDays(S.weekStart, 6));
    const txt = a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MON[b.getMonth()]}` : `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]}`;
    $("#sub").innerHTML = `<button data-wk="-1" aria-label="Попередній тиждень">‹</button><span>${txt}</span><button data-wk="1" aria-label="Наступний тиждень">›</button>`;
  }
  $("#sub").addEventListener("click", ev => {
    const b = ev.target.closest("[data-wk]"); if (!b) return;
    S.weekStart = addDays(S.weekStart, 7 * +b.dataset.wk);
    S.day = S.weekStart;
    renderSub(); renderMenu(); renderPrep();
  });

  /* ---------- покупки ---------- */
  $("#addCat").innerHTML = '<option value="">Відділ: визначу сама</option>' + CATS.map(c => `<option>${esc(c)}</option>`).join("");
  /* «Тортилья» = «Тортильї», «Курячі стегенця без кістки» = «Курячі стегенця»: порівнюємо без закінчень */
  const stem = s => Portions.canon(s).split(" ").map(w => w.length > 4 ? w.slice(0, -2) : w).join(" ");
  const sameItem = name => {
    const c = Portions.canon(name), sc = stem(name);
    return S.items.find(i => Portions.canon(i.name) === c)
      || S.items.find(i => stem(i.name) === sc)
      || S.items.find(i => { const k = stem(i.name); return k.length > 3 && (sc.startsWith(k + " ") || k.startsWith(sc + " ")); });
  };
  $("#addForm").onsubmit = async ev => {
    ev.preventDefault();
    const raw = $("#addName").value.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    if (!raw.length) return;
    const cat = $("#addCat").value, staple = $("#addStaple").checked;
    $("#addName").value = ""; $("#addStaple").checked = false;
    for (const line of raw) {
      const p = Portions.parseLine(line);
      const name = cap(p.name), amount = p.qty == null ? "" : `${N(p.qty)} ${p.unit}`;
      const ex = sameItem(name);
      if (ex) await save(() => Store.update("items", ex.id, { need: true, boughtAt: null, addedAt: Date.now(), ...(amount ? { amount } : {}), ...(staple ? { staple: true } : {}) }));
      else await save(() => Store.set("items", Store.newId("i"), { name, cat: cat || guessCat(name), staple, need: true, amount, boughtAt: null, addedAt: Date.now() }));
    }
  };
  function groupByCat(arr) {
    const m = new Map(CATS.map(c => [c, []]));
    for (const i of arr) m.get(CATS.includes(i.cat) ? i.cat : "Інше").push(i);
    for (const a of m.values()) a.sort((x, y) => String(x.name).localeCompare(String(y.name), "uk"));
    return [...m.entries()].filter(([, a]) => a.length);
  }
  function renderBuy() {
    const now = Date.now();
    const need = S.items.filter(i => i.need);
    const bought = S.items.filter(i => !i.need && i.boughtAt && now - i.boughtAt < 36 * 3600e3).sort((a, b) => b.boughtAt - a.boughtAt);
    /* «Є вдома» (home) — що реально лежить вдома; «Постійні» (staple) — просто мітка «часто купуємо» */
    const home = S.items.filter(i => !i.need && i.home);
    const staples = S.items.filter(i => !i.need && !i.home && i.staple);
    const stale = bought.some(i => !i.staple);
    $("#cBuy").textContent = need.length || "";
    let h = rcBox() + `<div class="secthead" style="margin-top:6px"><h2>Треба купити <span class="n">${need.length || ""}</span></h2></div>`;
    if (!need.length) h += `<p class="empty">Усе куплено. Що закінчиться — натисни нижче в «Є вдома».</p>`;
    for (const [cat, arr] of groupByCat(need)) {
      h += `<div class="group" style="margin-bottom:12px"><h3>${esc(cat)}</h3><div class="list">`;
      for (const i of arr) h += `<div class="row" data-id="${esc(i.id)}"><button class="tick" data-act="buy" aria-label="Куплено: ${esc(i.name)}"><span></span></button><span class="nm">${esc(i.name)}</span>${i.amount ? `<span class="pill amt">${esc(i.amount)}</span>` : ""}<button class="hb" data-act="has" aria-label="Вже є вдома: ${esc(i.name)}" title="Вже є вдома">🏠</button><button class="x" data-act="del" aria-label="Прибрати ${esc(i.name)}">×</button></div>`;
      h += `</div></div>`;
    }
    if (bought.length) {
      h += `<div class="secthead"><h2>Куплено</h2>${stale ? '<button class="btn ghost small" data-act="clear">Сховати разові</button>' : ""}</div><div class="list">`;
      for (const i of bought) h += `<div class="row done" data-id="${esc(i.id)}"><button class="tick" data-act="unbuy" aria-label="Повернути: ${esc(i.name)}"><span></span></button><span class="nm">${esc(i.name)}</span></div>`;
      h += `</div><p class="hint" style="margin-top:6px">Помилково відмітили? Натисни ще раз — продукт повернеться в список. Куплене вже лежить і в «Є вдома». 🏠 у списку — «вже є, купувати не треба».</p>`;
    }
    const chips = (arr, edit, act, delAct) => groupByCat(arr).map(([cat, xs]) => `<div class="group" style="margin-bottom:12px"><h3>${esc(cat)}</h3><div class="chips">${xs.map(i => edit
      ? `<span class="chip" data-id="${esc(i.id)}">${esc(i.name)} <button class="x" style="width:28px;height:28px" data-act="${delAct}" aria-label="Прибрати ${esc(i.name)}">×</button></span>`
      : act === "want" ? `<span class="chip st" data-id="${esc(i.id)}">${esc(i.name)}<button data-act="want" aria-label="Купити: ${esc(i.name)}" title="Купити">🛒</button><button data-act="has" aria-label="Є вдома: ${esc(i.name)}" title="Є вдома">🏠</button></span>`
      : `<button class="chip" data-id="${esc(i.id)}" data-act="${act}">${esc(i.name)}</button>`).join("")}</div></div>`).join("");
    h += `<div class="secthead"><h2>Є вдома</h2><button class="btn ghost small" data-act="hedit">${S.homeEdit ? "Готово" : "Редагувати"}</button></div>`;
    h += `<p class="hint" style="margin-bottom:10px">${S.homeEdit ? "× — цього вже нема вдома. Нижче можна дописати, що є." : "Натисни на продукт, коли він закінчився, — він перейде в «Треба купити»."}</p>`;
    if (S.homeEdit) h += `<form class="meq" data-form="home" style="margin-bottom:10px"><input type="text" id="homeAdd" placeholder="що є вдома: рис, гречка, яйця…" autocomplete="off"><button class="btn small">Додати</button></form>`;
    if (!home.length) h += `<p class="empty">${S.homeEdit ? "Допиши вище, що зараз є вдома." : "Поки порожньо. Натисни «Редагувати» і допиши, що є вдома, — або відміть покупки, вони потраплять сюди самі."}</p>`;
    h += chips(home, S.homeEdit, "out", "hdel");
    if (staples.length || S.pantryEdit) {
      h += `<div class="secthead"><h2>Постійні продукти</h2>${staples.length ? `<button class="btn ghost small" data-act="pedit">${S.pantryEdit ? "Готово" : "Редагувати"}</button>` : ""}</div>`;
      h += `<p class="hint" style="margin-bottom:10px">${S.pantryEdit ? "Натисни ×, щоб прибрати продукт з постійних." : "Що часто купуємо. 🛒 — у «Треба купити», 🏠 — у «Є вдома»."}</p>`;
      h += chips(staples, S.pantryEdit, "want", "pdel");
    }
    $("#buyList").innerHTML = h;
  }
  /* ---- чек → покупки: Gemini читає чек, позиції зі списку стають купленими, решта — в «Є вдома» ---- */
  let RC = null;
  function rcBox() {
    if (!RC) return `<label class="btn ghost wide rcbtn">🧾 Фото чека — відмітити куплене<input type="file" id="rcImg" accept="image/*" multiple hidden></label>`;
    if (RC.busy) return `<div class="card rc"><p class="hint">Читаю чек…</p></div>`;
    if (!RC.rows) return `<div class="card rc"><p class="hint">${esc(RC.note)}</p><div class="pbtns" style="margin-top:0"><label class="btn">Ще раз<input type="file" id="rcImg" accept="image/*" multiple hidden></label><button class="btn ghost" data-act="rcX">Закрити</button></div></div>`;
    const on = RC.rows.filter(x => x.on);
    return `<div class="card rc"><h3>З чека: ${RC.rows.length}</h3>
      <p class="hint">✓ зі списку — стане купленим. Решта піде в «Є вдома». Зніми галочку з того, що не треба.</p>
      <div class="ing">${RC.rows.map((x, i) => { const m = x.match && S.items.find(it => it.id === x.match); return `<label><input type="checkbox" data-rc="${i}"${x.on ? " checked" : ""}><span style="flex:1">${esc(x.name)}<span class="src">${m ? `✓ зі списку: ${esc(m.name)}` : "→ в «Є вдома»"}${x.sk ? ` · ${esc(x.sk)}` : ""}</span></span><span class="q">${esc(x.qty || "")}</span></label>`; }).join("")}</div>
      <div class="pbtns"><button class="btn green" data-act="rcGo"${on.length ? "" : " disabled"}>Відмітити (${on.length})</button><button class="btn ghost" data-act="rcX">Скасувати</button></div>
    </div>`;
  }
  async function readReceipt(files) {
    if (!window.AI || !window.AI.readReceipt) { toast("Gemini ще не підключений (Ще → Ключ Gemini)."); return; }
    RC = { busy: true }; renderBuy();
    try {
      const imgs = []; for (const f of files.slice(0, 3)) imgs.push(dataToFile(await shrink(f, 1600, 0.85), "receipt.jpg"));
      const need = S.items.filter(i => i.need).map(i => `${i.id} | ${i.name}${i.amount ? ` (${i.amount})` : ""}`).join("\n");
      const known = S.items.filter(i => !i.need).map(i => i.name).join(", ");
      const prompt = `На фото — чек зі словацького магазину (Lidl, Kaufland, Billa, dm тощо); якщо фото кілька — це частини одного чека.
Випиши всі куплені товари. НЕ включай: пакети (taška), заставу за пляшки (záloha), знижки (zľava), підсумки, оплату.
Для кожного товару:
- name: коротка назва українською, як у сімейному списку покупок («Фарш з індички», «Молоко», «Картопля», «Кисломолочний сир»). Якщо товар уже є серед відомих назв — використай саме її.
- sk: назва як на чеку.
- qty: кількість або вага коротко («1 кг», «2 шт», «500 г»); якщо не видно — "".
- match: id пункту зі списку «Треба купити», якщо це той самий продукт (навіть інша марка чи інша вага); інакше null.
Список «Треба купити» (id | назва):
${need || "— порожній"}
Відомі назви: ${known}
Поверни ТІЛЬКИ JSON: {"items":[{"name":"","sk":"","qty":"","match":null}]}`;
      const j = await window.AI.readReceipt({ prompt, images: imgs });
      const ids = new Set(S.items.filter(i => i.need).map(i => i.id));
      const rows = (j.items || []).filter(x => x && x.name).map(x => ({ name: cap(String(x.name)), sk: String(x.sk || ""), qty: String(x.qty || ""), match: ids.has(x.match) ? x.match : null, on: true }));
      RC = rows.length ? { rows } : { note: "На чеку не знайшла товарів. Сфотографуй рівніше й ще раз." };
    } catch (e) { console.error(e); RC = { note: e && e.userMessage || "Не вийшло прочитати чек. Спробуй ще раз." }; }
    renderBuy();
  }
  $("#buyList").addEventListener("change", ev => {
    if (ev.target.id === "rcImg") { const fs = [...ev.target.files]; if (fs.length) readReceipt(fs); return; }
    if (ev.target.dataset.rc != null && RC && RC.rows) { RC.rows[+ev.target.dataset.rc].on = ev.target.checked; renderBuy(); }
  });
  $("#buyList").addEventListener("click", async ev => {
    const b = ev.target.closest("[data-act]"); if (!b) return;
    const act = b.dataset.act, id = b.closest("[data-id]")?.dataset.id, it = id && S.items.find(i => i.id === id);
    if (act === "rcX") { RC = null; renderBuy(); return; }
    if (act === "rcGo" && RC && RC.rows) {
      const now = Date.now(); let n = 0;
      for (const x of RC.rows.filter(x => x.on)) {
        const ex = (x.match && S.items.find(i => i.id === x.match)) || sameItem(x.name);
        const ok = ex ? await save(() => Store.update("items", ex.id, { need: false, home: true, boughtAt: now }))
          : await save(() => Store.set("items", Store.newId("i"), { name: x.name, cat: guessCat(x.name), staple: false, home: true, need: false, amount: "", boughtAt: now, addedAt: now }));
        if (ok) n++;
      }
      RC = null; renderBuy(); toast(`Відмітила з чека: ${n}`); return;
    }
    if (act === "pedit") { S.pantryEdit = !S.pantryEdit; renderBuy(); return; }
    if (act === "hedit") { S.homeEdit = !S.homeEdit; renderBuy(); if (S.homeEdit) $("#homeAdd")?.focus(); return; }
    if (act === "clear") { for (const i of S.items.filter(i => !i.need && !i.staple && i.boughtAt)) await save(() => Store.update("items", i.id, { boughtAt: null })); return; }
    if (!it) return;
    if (act === "buy") save(() => Store.update("items", id, { need: false, home: true, boughtAt: Date.now() }));
    else if (act === "unbuy") save(() => Store.update("items", id, { need: true, home: false, boughtAt: null }));
    else if (act === "want") save(() => Store.update("items", id, { need: true, boughtAt: null, addedAt: Date.now(), amount: "" }));
    else if (act === "has") save(() => Store.update("items", id, { need: false, home: true, boughtAt: null, amount: "" }));
    else if (act === "out") save(() => Store.update("items", id, { need: true, home: false, boughtAt: null, addedAt: Date.now(), amount: "" }));
    else if (act === "del") save(() => it.staple || it.home ? Store.update("items", id, { need: false, amount: "" }) : Store.del("items", id));
    else if (act === "hdel") save(() => it.staple ? Store.update("items", id, { home: false }) : Store.del("items", id));
    else if (act === "pdel") save(() => it.home ? Store.update("items", id, { staple: false }) : Store.del("items", id));
  });
  $("#buyList").addEventListener("submit", async ev => {
    if (ev.target.dataset.form !== "home") return;
    ev.preventDefault();
    const names = $("#homeAdd").value.split(/[,;\n]/).map(x => cap(x.trim())).filter(Boolean);
    for (const name of names) {
      const ex = sameItem(name);
      if (ex) await save(() => Store.update("items", ex.id, { home: true, need: false, amount: "" }));
      else await save(() => Store.set("items", Store.newId("i"), { name, cat: guessCat(name), staple: false, home: true, need: false, amount: "", boughtAt: null, addedAt: Date.now() }));
    }
    $("#homeAdd")?.focus();
  });
  async function addToList(name, amount) {
    const ex = sameItem(name);
    if (ex) return save(() => Store.update("items", ex.id, { need: true, boughtAt: null, addedAt: Date.now(), amount: amount || ex.amount || "" }));
    return save(() => Store.set("items", Store.newId("i"), { name, cat: guessCat(name), staple: false, need: true, amount: amount || "", boughtAt: null, addedAt: Date.now() }));
  }

  /* ---------- меню-конструктор ---------- */
  /* що людина з'їла: меню × правки порцій + додане окремо (документ meta/eat_<дата>_<людина>) */
  const eatDoc = (date, pid) => S.meta[`eat_${date}_${pid}`] || {};
  function slotNut(slot, pid, date, meal) {
    let n = Nutrition.zero(), g = 0; const w = +(person(pid) || {}).w || 1;
    const adj = date ? eatDoc(date, pid).adj || {} : {};
    for (const d of slot ? slot.dishes || [] : []) {
      if (!(d.who || []).includes(pid)) continue;
      const f = adj[`${meal}_${d.rid}`] ?? 1;
      const r = recipe(d.rid); if (r && f) { const x = nutOf(r); n = Nutrition.add(n, x, w * f); g += (x.g || 0) * w * f; }
    }
    if (date) for (const e of eatDoc(date, pid).extra || []) if (e.meal === meal) { n = Nutrition.add(n, e); g += +e.g || 0; }
    n.g = g;
    return n;
  }
  const dayNut = (date, pid) => MEALS.reduce((a, [m]) => Nutrition.add(a, slotNut(slotOf(date, m), pid, date, m)), Nutrition.zero());
  function renderMenu() {
    if (!S.weekStart) return;
    const dates = weekDates(), tk = todayKey();
    if (!dates.includes(S.day)) S.day = dates.includes(tk) ? tk : dates[0];
    $("#week").innerHTML = dates.map(d => {
      const dishes = MEALS.flatMap(([m]) => (slotOf(d, m) || {}).dishes || []);
      const gs = groupsOf(dishes).slice(0, 4);
      return `<button class="dayc${d === S.day ? " on" : ""}${d === tk ? " today" : ""}" data-day="${d}"><b>${WD[toDate(d).getDay()]}</b><span>${toDate(d).getDate()}.${String(toDate(d).getMonth() + 1).padStart(2, "0")}</span><span class="dots">${gs.map(g => `<i class="g-${g}"></i>`).join("")}</span></button>`;
    }).join("");

    // КБЖУ за день для вибраної людини
    const p = person(S.viewP) || S.people[0];
    const day = dayNut(S.day, p.id);
    // тиждень: дні до сьогодні включно, де щось було
    const past = dates.filter(d => d <= tk).map(d => dayNut(d, p.id)).filter(n => n.k > 0);
    const avg = past.length ? Nutrition.add(Nutrition.zero(), past.reduce((a, n) => Nutrition.add(a, n), Nutrition.zero()), 1 / past.length) : null;
    const edits = Object.keys(eatDoc(S.day, p.id).adj || {}).length + (eatDoc(S.day, p.id).extra || []).length;
    const goalP = +p.goalP || 0, goalK = +p.goalK || 0;
    $("#totals").innerHTML = `<div class="card totals">
      <div class="who"><span class="hint" style="flex:1">З'їдено за ${WDA[toDate(S.day).getDay()]}:</span>${S.people.map(x => `<button class="av big${x.id === p.id ? "" : " off"}" data-vp="${esc(x.id)}" aria-label="${esc(x.name)}">${esc(x.short || x.name[0])}</button>`).join("")}</div>
      <div class="macros"><div><b>${r0(day.k)}</b><span>ккал</span></div><div><b>${r0(day.p)}</b><span>білки</span></div><div><b>${r0(day.f)}</b><span>жири</span></div><div><b>${r0(day.c)}</b><span>вуглев.</span></div></div>
      ${goalP ? `<div><div class="hint" style="margin-bottom:4px">Білок: ${r0(day.p)} з ${goalP} г</div><div class="bar"><i style="width:${Math.min(100, day.p / goalP * 100)}%"></i></div></div>` : ""}
      ${goalK ? `<div class="hint">Калорії: ${r0(day.k)} з ${goalK}</div>` : ""}
      <button class="btn ghost small" data-eat="1">Мій день: що з'їла${edits ? ` · правок ${edits}` : ""} →</button>
      ${avg && past.length > 1 ? `<div class="hint">Тиждень, у середньому за ${past.length} дн.: <b>${r0(avg.k)} ккал</b> · Б ${r0(avg.p)} · Ж ${r0(avg.f)} · У ${r0(avg.c)}</div>` : ""}
    </div>`;

    $("#meals").innerHTML = MEALS.map(([m, label]) => {
      const sl = slotOf(S.day, m), dishes = sl ? sl.dishes || [] : [];
      const n = slotNut(sl, p.id, S.day, m);
      const chips = dishes.map(d => {
        const r = recipe(d.rid); if (!r) return "";
        const who = S.people.filter(x => (d.who || []).includes(x.id)).map(x => x.short || x.name[0]).join("");
        return `<span class="dchip link" data-rid="${esc(r.id)}"><i class="sw g-${GROUPS[r.group] ? r.group : "dish"}"></i><span class="t">${esc(r.title)}${d.left ? " ↻" : ""}</span><span class="w">${esc(who)}</span></span>`;
      }).join("");
      return `<button class="meal" data-meal="${m}">${bowl(groupsOf(dishes), 64)}<span class="body"><span class="lbl">${label}</span>${dishes.length ? `<span class="chips" style="gap:5px">${chips}</span>${n.k ? `<span class="nut">${esc(p.name)}: тарілка ≈${r0(n.g)} г · ${Nutrition.line(n)}</span>` : ""}` : `<span class="hint">Тапни, щоб зібрати миску</span>`}</span><span class="plusc">+</span></button>`;
    }).join("");

    const kid = (S.meta.week || {}).kid;
    $("#kidNote").innerHTML = kid ? `<details class="note"><summary>Обід сина: від пюре до звичайної їжі</summary><p>${esc(kid)}</p></details>` : "";
    const rows = Portions.aggregate(S.slots.filter(s => dates.includes(s.date)), recipeById(), S.people).filter(r => r.qty != null);
    $("#calcSub").textContent = rows.length ? `${rows.length} продуктів на цей тиждень` : "спершу збери миски";
  }
  $("#week").addEventListener("click", ev => { const b = ev.target.closest("[data-day]"); if (!b) return; S.day = b.dataset.day; renderMenu(); renderPrep(); });
  $("#totals").addEventListener("click", ev => {
    if (ev.target.closest("[data-eat]")) { openEat(S.day, S.viewP); return; }
    const b = ev.target.closest("[data-vp]"); if (!b) return; S.viewP = b.dataset.vp; renderMenu();
  });
  $("#meals").addEventListener("click", ev => {
    // тап по назві страви — відкрити рецепт; по решті миски — змінити миску
    const c = ev.target.closest("[data-rid]"); if (c) { const m = c.closest("[data-meal]"); openRecipe(c.dataset.rid, null, { date: S.day, meal: m && m.dataset.meal }); return; }
    const b = ev.target.closest("[data-meal]"); if (b) openPicker(S.day, b.dataset.meal);
  });

  /* ---------- підготовка ---------- */
  const mealTime = m => ((S.meta.times || {})[m]) || MEAL_T[m];
  const prepDoc = date => S.meta["prep_" + date] || {};
  /* справи, що належать стравам цього дня (страви «з залишків» не готуємо; одна страва — один раз) */
  function dayTasks(date) {
    const out = [], seen = new Set();
    for (const [m] of MEALS) {
      const sl = slotOf(date, m);
      for (const d of sl ? sl.dishes || [] : []) {
        if (d.left) continue;
        const r = recipe(d.rid); if (!r || seen.has(r.id)) continue;
        seen.add(r.id);
        (r.prep || []).forEach((x, i) => out.push({ ...x, key: `${m}_${r.id}_${i}`, date, meal: m, r }));
      }
    }
    for (const c of prepDoc(date).custom || []) out.push({ ...c, key: "c_" + c.id, date, custom: true });
    return out.map(t => ({ ...t, st: (prepDoc(date).s || {})[t.key] || {}, time: t.when === "pre" ? hm(mealTime(t.meal || "d"), t.before) : "" }));
  }
  function renderPrep() {
    if (!S.weekStart || !$("#prepList")) return;
    const dates = weekDates(), tk = todayKey();
    if (!dates.includes(S.day)) S.day = dates.includes(tk) ? tk : dates[0];
    $("#pweek").innerHTML = dates.map(d => {
      const left = [...dayTasks(d).filter(t => t.when !== "eve"), ...dayTasks(addDays(d, 1)).filter(t => t.when === "eve")].filter(t => !t.st.done).length;
      return `<button class="dayc${d === S.day ? " on" : ""}${d === tk ? " today" : ""}" data-day="${d}"><b>${WD[toDate(d).getDay()]}</b><span>${toDate(d).getDate()}.${String(toDate(d).getMonth() + 1).padStart(2, "0")}</span><span class="dots">${left ? `<em class="pcount">${left}</em>` : ""}</span></button>`;
    }).join("");
    const today = dayTasks(S.day), tomorrow = dayTasks(addDays(S.day, 1)).filter(t => t.when === "eve");
    const all = [...today.filter(t => t.when !== "eve"), ...tomorrow];
    const f = S.prepWho || "all";
    const vis = f === "all" ? all : all.filter(t => t.st.who === f);
    const sections = [
      ["Зранку", t => t.when === "morn" || (t.when === "pre" && t.meal === "b")],
      ["Вдень, у перервах", t => t.when === "day" || (t.when === "pre" && t.meal === "l")],
      [`Перед вечерею (${mealTime("d")})`, t => t.when === "pre" && (t.meal === "d" || t.meal === "x")],
      ["Ввечері — на завтра", t => t.when === "eve"]
    ];
    const preDin = today.filter(t => t.when === "pre" && t.meal === "d" && !t.st.done).reduce((a, t) => a + (+t.min || 0), 0);
    const done = all.filter(t => t.st.done).length;
    const per = S.people.map(x => [x, all.filter(t => t.st.who === x.id && !t.st.done).length]).filter(([, n]) => n);
    $("#prepTop").innerHTML = `<div class="card stack" style="gap:8px">
      <div class="who"><span class="hint" style="flex:1">Чиї справи показати:</span><button class="chip small${f === "all" ? " on" : ""}" data-pf="all">Усі</button>${S.people.map(x => `<button class="av big${f === x.id ? "" : " off"}" data-pf="${esc(x.id)}" aria-label="${esc(x.name)}">${esc(x.short || x.name[0])}</button>`).join("")}</div>
      <div class="hint">${all.length ? `Справ: <b>${all.length}</b> · зроблено ${done}${preDin ? ` · перед вечерею активної роботи ≈ <b>${preDin} хв</b>` : ""}${per.length ? `<br>${per.map(([x, n]) => `${esc(x.name)}: ${n}`).join(" · ")}` : ""}` : "На цей день справ немає."}</div>
    </div>`;
    const row = t => `<div class="row ptask${t.st.done ? " done" : ""}" data-k="${esc(t.key)}" data-date="${t.date}">
      <button class="tick" data-act="pt" aria-label="Зроблено: ${esc(t.t)}"><span></span></button>
      <span class="nm">${esc(t.t)}<span class="src">${t.time ? `о ${t.time} · ` : ""}${t.r ? esc(t.r.title) : "своя справа"}${t.min ? ` · ${t.min} хв` : ""}</span></span>
      <span class="avs">${S.people.map(x => `<button class="av${t.st.who === x.id ? "" : " off"}" data-act="pw" data-p="${esc(x.id)}" aria-label="Доручити: ${esc(x.name)}">${esc(x.short || x.name[0])}</button>`).join("")}${t.custom ? `<button class="x" style="width:28px;height:28px" data-act="pdel" aria-label="Видалити справу">×</button>` : ""}</span>
    </div>`;
    let h = "";
    for (const [title, test] of sections) {
      const arr = vis.filter(test).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      if (!arr.length) continue;
      h += `<div class="group" style="margin-bottom:14px"><h3>${esc(title)}</h3><div class="list">${arr.map(row).join("")}</div></div>`;
    }
    if (!h) {
      const anyMenu = MEALS.some(([m]) => ((slotOf(S.day, m) || {}).dishes || []).length);
      h = `<p class="empty">${!anyMenu ? "У меню на цей день ще нічого немає. Збери миски у вкладці «Меню» — і тут з'являться справи." : f !== "all" ? "Для цієї людини справ немає." : "Для страв цього дня підготовка не розписана. Додай її в рецепті («Редагувати» → «Підготовка заздалегідь») або впиши справу нижче."}</p>`;
    }
    $("#prepList").innerHTML = h;
  }
  async function prepWrite(date, fn) {
    const doc = structuredClone(prepDoc(date)); delete doc.id;
    doc.s = doc.s || {}; doc.custom = doc.custom || [];
    fn(doc);
    return save(() => Store.set("meta", "prep_" + date, doc));
  }
  $("#pweek").addEventListener("click", ev => { const b = ev.target.closest("[data-day]"); if (!b) return; S.day = b.dataset.day; renderPrep(); renderMenu(); });
  $("#prepTop").addEventListener("click", ev => { const b = ev.target.closest("[data-pf]"); if (!b) return; S.prepWho = b.dataset.pf; renderPrep(); });
  $("#prepList").addEventListener("click", ev => {
    const b = ev.target.closest("[data-act]"); if (!b) return;
    const rowEl = b.closest("[data-k]"), k = rowEl.dataset.k, date = rowEl.dataset.date;
    if (b.dataset.act === "pt") prepWrite(date, d => { d.s[k] = { ...(d.s[k] || {}), done: !(d.s[k] || {}).done }; });
    if (b.dataset.act === "pw") prepWrite(date, d => { const cur = (d.s[k] || {}).who; d.s[k] = { ...(d.s[k] || {}), who: cur === b.dataset.p ? "" : b.dataset.p }; });
    if (b.dataset.act === "pdel") prepWrite(date, d => { d.custom = d.custom.filter(c => "c_" + c.id !== k); delete d.s[k]; });
  });
  $("#prepAdd").onsubmit = ev => {
    ev.preventDefault();
    const t = $("#prepText").value.trim(); if (!t) return;
    const w = $("#prepWhen").value;
    const id = Date.now().toString(36);
    // «ввечері на завтра» — справа завтрашнього дня
    const date = w === "eve" ? addDays(S.day, 1) : S.day;
    const item = w === "pre" ? { id, t, when: "pre", meal: "d", before: 30 } : { id, t, when: w };
    prepWrite(date, d => { d.custom.push(item); });
    $("#prepText").value = "";
  };

  /* ---------- Мій день: що з'їла ---------- */
  let EAT = null;
  const FACTORS = [[0, "0"], [0.5, "½"], [1, "1"], [1.5, "1½"], [2, "2"]];
  const nowMeal = () => { const h = new Date().getHours(); return h < 11 ? "b" : h < 16 ? "l" : h < 21 ? "d" : "x"; };
  function openEat(date, pid) {
    EAT = { date, pid, form: false };
    drawEat();
  }
  function drawEat() {
    const { date, pid } = EAT, p = person(pid) || S.people[0], doc = eatDoc(date, pid), adj = doc.adj || {};
    const day = dayNut(date, pid);
    let h = `<div class="shhead"><button class="btn ghost small" data-act="close">← Назад</button><h2>${esc(p.name)}, ${WDF[toDate(date).getDay()]}</h2></div>
      <div class="card"><div class="macros"><div><b>${r0(day.k)}</b><span>ккал</span></div><div><b>${r0(day.p)}</b><span>білки</span></div><div><b>${r0(day.f)}</b><span>жири</span></div><div><b>${r0(day.c)}</b><span>вуглев.</span></div></div></div>
      <p class="hint" style="margin:10px 0">Усе з меню вважається з'їденим. Зміни порцію, якщо з'їла менше чи більше, і додай те, чого не було в меню.</p>`;
    for (const [m, label] of MEALS) {
      const sl = slotOf(date, m), dishes = (sl ? sl.dishes || [] : []).filter(d => (d.who || []).includes(pid) && recipe(d.rid));
      const extras = (doc.extra || []).filter(e => e.meal === m);
      if (!dishes.length && !extras.length) continue;
      h += `<div class="group" style="margin-bottom:12px"><h3>${label}</h3><div class="list">`;
      for (const d of dishes) {
        const f = adj[`${m}_${d.rid}`] ?? 1, r = recipe(d.rid);
        h += `<div class="row eatrow"><span class="nm">${esc(r.title)}</span><span class="fx">${FACTORS.map(([v, l]) => `<button class="chip small${v === f ? " on" : ""}" data-act="edF" data-m="${m}" data-rid="${esc(d.rid)}" data-v="${v}" aria-label="Порція ${l}">${l}</button>`).join("")}</span></div>`;
      }
      for (const e of extras) h += `<div class="row eatrow"><span class="nm">${esc(e.t)}<span class="src">${e.g ? `${r0(e.g)} г · ` : ""}${r0(e.k)} ккал · Б ${r0(e.p)} · Ж ${r0(e.f)} · У ${r0(e.c)}</span></span><button class="x" data-act="edX" data-id="${esc(e.id)}" aria-label="Прибрати">×</button></div>`;
      h += `</div></div>`;
    }
    h += EAT.form ? eatForm() : `<button class="btn green wide" data-act="edOpen">+ Додати з'їдене</button>`;
    openSheet(h);
    if (EAT.form) wireEatForm();
  }
  function eatForm() {
    const favs = ((S.meta.favs || {}).list || []);
    const opts = S.recipes.slice().sort((a, b) => a.title.localeCompare(b.title, "uk"));
    return `<div class="card stack" style="gap:10px">
      <h3>Додати з'їдене</h3>
      ${favs.length ? `<div class="chips">${favs.map((f, i) => `<button class="chip small" data-act="edFav" data-i="${i}">${esc(f.t)}</button>`).join("")}</div>` : ""}
      <label class="fl">Що з'їла <input type="text" id="eT" placeholder="напр.: 2 кубики гіркого шоколаду, пад тай з куркою (півпорції)"></label>
      <label class="fl">Фото етикетки, страви чи скриншот замовлення <input type="file" id="eImg" accept="image/*" multiple></label>
      <div class="parse"><button class="btn ghost" type="button" data-act="edAI">Порахувати з Gemini</button><span class="state" id="eState"></span></div>
      <label class="fl">Або з рецепта <select id="eRec"><option value="">— вибери —</option>${opts.map(r => `<option value="${esc(r.id)}">${esc(r.title)}</option>`).join("")}</select></label>
      <div class="person" style="grid-template-columns:1fr 1fr"><label class="fl">Скільки, г<input type="number" id="eG" min="0" step="5"></label><label class="fl">Коли<select id="eM">${MEALS.map(([m, l]) => `<option value="${m}"${m === nowMeal() ? " selected" : ""}>${l}</option>`).join("")}</select></label></div>
      <div class="nutbox"><input type="number" id="eK" placeholder="ккал"><input type="number" id="eP" placeholder="Б"><input type="number" id="eF" placeholder="Ж"><input type="number" id="eC" placeholder="У"></div>
      <p class="hint" id="eNote">КБЖУ — на всю з'їдену кількість.</p>
      <label class="chk"><input type="checkbox" id="eFav"> зберегти в «часті»</label>
      <div class="pbtns"><button class="btn" data-act="edAdd">Додати</button><button class="btn ghost" data-act="edCancel">Скасувати</button></div>
    </div>`;
  }
  let eatPer100 = null;
  function wireEatForm() {
    eatPer100 = null;
    $("#eRec").onchange = () => {
      const r = recipe($("#eRec").value); if (!r) return;
      const n = nutOf(r), w = +(person(EAT.pid) || {}).w || 1;
      $("#eT").value = r.title;
      eatPer100 = n.per100;
      const g = Math.round((n.g || 0) * w);
      $("#eG").value = g || "";
      fillEat(n.per100 && g ? scaleN(n.per100, g / 100) : Nutrition.add(Nutrition.zero(), n, w));
      $("#eNote").textContent = "Порахувала на одну твою порцію. Зміни грами — цифри перерахуються.";
    };
    $("#eG").oninput = () => { const g = +$("#eG").value; if (eatPer100 && g > 0) fillEat(scaleN(eatPer100, g / 100)); };
  }
  const scaleN = (n, k) => ({ k: n.k * k, p: n.p * k, f: n.f * k, c: n.c * k });
  const fillEat = n => { $("#eK").value = r0(n.k); $("#eP").value = r0(n.p); $("#eF").value = r0(n.f); $("#eC").value = r0(n.c); };
  async function eatWrite(fn) {
    const id = `eat_${EAT.date}_${EAT.pid}`, doc = structuredClone(S.meta[id] || {}); delete doc.id;
    doc.adj = doc.adj || {}; doc.extra = doc.extra || [];
    fn(doc);
    const ok = await save(() => Store.set("meta", id, doc));
    if (ok) setTimeout(() => { if (EAT && !$("#sheet").hidden) drawEat(); }, 150);
    return ok;
  }
  $("#sheet").addEventListener("click", async ev => {
    const b = ev.target.closest("[data-act]"); if (!b || !EAT || !b.dataset.act.startsWith("ed")) return;
    const act = b.dataset.act;
    if (act === "edF") { const k = `${b.dataset.m}_${b.dataset.rid}`, v = +b.dataset.v; eatWrite(d => { if (v === 1) delete d.adj[k]; else d.adj[k] = v; }); return; }
    if (act === "edX") { eatWrite(d => { d.extra = d.extra.filter(e => e.id !== b.dataset.id); }); return; }
    if (act === "edOpen") { EAT.form = true; drawEat(); $("#eT").focus(); return; }
    if (act === "edCancel") { EAT.form = false; drawEat(); return; }
    if (act === "edFav") {
      const f = ((S.meta.favs || {}).list || [])[+b.dataset.i]; if (!f) return;
      $("#eT").value = f.t; $("#eG").value = f.g || ""; fillEat(f); eatPer100 = f.g ? scaleN(f, 100 / f.g) : null; return;
    }
    if (act === "edAI") {
      const st = $("#eState");
      if (!window.AI || !window.AI.estimateFood) { st.textContent = "Gemini ще не підключений (Ще → Ключ Gemini)."; return; }
      const text = $("#eT").value.trim(), images = [...$("#eImg").files].slice(0, 3);
      if (!text && !images.length) { st.textContent = "Напиши, що з'їла, або додай фото."; return; }
      b.disabled = true; st.textContent = "Рахую…";
      try {
        const j = await window.AI.estimateFood({ text, images, grams: +$("#eG").value || null });
        if (j.title && !text) $("#eT").value = j.title;
        if (j.grams) $("#eG").value = r0(j.grams);
        fillEat(j); eatPer100 = j.grams ? scaleN(j, 100 / j.grams) : null;
        st.textContent = ""; $("#eNote").textContent = j.note ? `Gemini: ${j.note}` : "Порахувала. Перевір і натисни «Додати».";
      } catch (e) { console.error(e); st.textContent = e && e.userMessage || "Не вийшло порахувати. Впиши цифри вручну."; }
      finally { b.disabled = false; }
      return;
    }
    if (act === "edAdd") {
      const t = $("#eT").value.trim(); if (!t) { toast("Напиши, що з'їла."); return; }
      const v = id => +$(id).value || 0;
      const item = { id: Date.now().toString(36), t, meal: $("#eM").value, g: v("#eG") || null, k: v("#eK"), p: v("#eP"), f: v("#eF"), c: v("#eC") };
      if (!item.k && !item.p) { toast("Додай калорії або натисни «Порахувати з Gemini»."); return; }
      if ($("#eFav").checked) {
        const list = ((S.meta.favs || {}).list || []).filter(f => f.t !== t);
        list.unshift({ t, g: item.g, k: item.k, p: item.p, f: item.f, c: item.c });
        save(() => Store.set("meta", "favs", { list: list.slice(0, 20) }));
      }
      EAT.form = false;
      eatWrite(d => { d.extra.push(item); });
    }
  });

  /* ---------- вибір страв у миску ---------- */
  let P = null;
  function openPicker(date, meal) {
    const sl = slotOf(date, meal);
    P = { date, meal, dishes: structuredClone(sl ? sl.dishes || [] : []), g: "all", q: "", simple: false };
    const label = MEALS.find(x => x[0] === meal)[1];
    openSheet(`<div class="shhead"><button class="btn ghost small" data-act="close">← Назад</button><h2>${esc(label)}, ${WDF[toDate(date).getDay()]}</h2></div>
      <input type="search" id="pkQ" placeholder="Пошук страви">
      <div class="groups" id="pkGroups"></div>
      <div class="grid" id="pkGrid"></div>
      <div id="pkSimple"></div>
      <div class="picked" id="pkPicked"></div>`);
    $("#pkQ").oninput = e => { P.q = e.target.value.trim().toLowerCase(); drawPkGrid(); };
    drawPkGroups(); drawPkGrid(); drawPkSimple(); drawPkPicked();
  }
  function drawPkGroups() {
    $("#pkGroups").innerHTML = [["all", "Усі", null], ...GKEYS.map(k => [k, GROUPS[k], k])].map(([k, l, g]) =>
      `<button class="gbtn${P.g === k ? " on" : ""}" data-act="pkG" data-g="${k}">${g ? `<i class="sw g-${g}"></i>` : ""}${esc(l)}</button>`).join("");
  }
  function drawPkGrid() {
    let arr = S.recipes.slice();
    if (P.g !== "all") arr = arr.filter(r => (r.group || "dish") === P.g);
    if (P.q) arr = arr.filter(r => r.title.toLowerCase().includes(P.q));
    arr.sort((a, b) => GKEYS.indexOf(a.group) - GKEYS.indexOf(b.group) || a.title.localeCompare(b.title, "uk"));
    const sel = new Set(P.dishes.map(d => d.rid));
    $("#pkGrid").innerHTML = arr.length ? arr.map(r => {
      const n = nutOf(r);
      return `<button class="dish${sel.has(r.id) ? " sel" : ""}" data-act="pkT" data-rid="${esc(r.id)}">${Art.bowl(r, catOf(r), 44)}<span class="nm">${esc(r.title)}</span><span class="nut">${n.per100 ? `100 г: ${r0(n.per100.k)} ккал · Б ${r0(n.per100.p)}` : n.k ? `${r0(n.k)} ккал · Б ${r0(n.p)} на порцію` : ""}${r.time && r.time.total ? ` · ⏱ ${fmtMin(r.time.total)}` : ""}</span></button>`;
    }).join("") : `<p class="empty" style="grid-column:1/-1">Нічого не знайшла. Додай просту страву нижче.</p>`;
  }
  function drawPkSimple() {
    $("#pkSimple").innerHTML = P.simple
      ? `<div class="simpleform">
          <b>Проста страва</b>
          <input type="text" id="smName" placeholder="Назва: варений рис" value="${esc(P.q ? cap(P.q) : "")}">
          <div class="r2"><input type="text" id="smProd" placeholder="Продукт (рис)"><input type="number" id="smG" min="1" step="5" placeholder="г на порцію"></div>
          <select id="smGroup">${GKEYS.map(k => `<option value="${k}"${k === (P.g !== "all" ? P.g : "base") ? " selected" : ""}>${GROUPS[k]}</option>`).join("")}</select>
          <p class="hint">Грами — сирого продукту на одну доросту порцію (рис 70 г, гречка 70 г, макарони 80 г, салат 150 г).</p>
          <div class="pbtns"><button class="btn" data-act="smAdd">Додати в миску</button><button class="btn ghost" data-act="smCancel">Скасувати</button></div>
        </div>`
      : `<button class="simplebtn" data-act="smOpen"><svg width="34" height="34" viewBox="0 0 40 40" filter="url(#pencil)" aria-hidden="true"><circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/><path d="M20 12v16M12 20h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span style="display:block;color:inherit;font-size:inherit;font-weight:700">Проста страва вручну<span>варений рис, гречка, салат — назва і грами на порцію</span></span></button>`;
  }
  function drawPkPicked() {
    if (!P.dishes.length) { $("#pkPicked").innerHTML = `<p class="hint">Тапни на страви вище — вони з'являться тут. Потім познач, хто що їсть.</p><div class="pbtns"><button class="btn" data-act="pkSave">Готово</button><button class="btn ghost" data-act="close">Скасувати</button></div>`; return; }
    $("#pkPicked").innerHTML = `<h3>У мисці</h3>` + P.dishes.map((d, i) => {
      const r = recipe(d.rid); if (!r) return "";
      return `<div class="prow"><span class="dchip"><i class="sw g-${GROUPS[r.group] ? r.group : "dish"}"></i><span class="t">${esc(r.title)}</span></span><span class="avs">${S.people.map(x => `<button class="av${(d.who || []).includes(x.id) ? "" : " off"}" data-act="pkW" data-i="${i}" data-p="${esc(x.id)}" aria-label="${esc(x.name)}">${esc(x.short || x.name[0])}</button>`).join("")}<button class="x" style="width:28px;height:28px" data-act="pkX" data-i="${i}" aria-label="Прибрати">×</button></span></div>
        <div style="margin:-2px 0 6px 18px"><button class="chip small${d.left ? " on" : ""}" data-act="pkL" data-i="${i}">↻ залишки — не готуємо${d.left ? " ✓" : ""}</button></div>`;
    }).join("") + `<div class="pbtns"><button class="btn" data-act="pkSave">Готово</button><button class="btn ghost" data-act="pkSaveNext">Готово + на завтра ↻</button></div>`;
  }
  async function savePicker(alsoNext) {
    const dishes = P.dishes.filter(d => recipe(d.rid) && (d.who || []).length);
    const write = async (date, list) => {
      const id = `${date}_${P.meal}`;
      if (!list.length) return Store.del("slots", id);
      return Store.set("slots", id, { date, meal: P.meal, dishes: list });
    };
    if (!await save(() => write(P.date, dishes))) return;
    if (alsoNext && dishes.length) {
      const next = addDays(P.date, 1), ex = slotOf(next, P.meal);
      const merged = structuredClone(ex ? ex.dishes || [] : []);
      for (const d of dishes) if (!merged.some(x => x.rid === d.rid)) merged.push({ ...structuredClone(d), left: true });
      await save(() => write(next, merged));
      toast(`Скопійовано на ${WDA[toDate(next).getDay()]}`);
    }
    closeSheet();
  }

  /* підсумок покупок під меню тижня */
  $("#planCalc").onclick = () => {
    const dates = weekDates();
    const rows = Portions.aggregate(S.slots.filter(s => dates.includes(s.date)), recipeById(), S.people);
    if (!rows.length) { toast("Спершу збери миски на тиждень."); return; }
    openSheet(`<div class="shhead"><button class="btn ghost small" data-act="close">← Назад</button><h2>Покупки під меню</h2></div>
      <div class="stack">
        <p class="hint">Зніми галочку з того, що вже є вдома. «За смаком» — спеції й дрібниці, зазвичай вони є.</p>
        <div class="card ing" id="planRows">${rows.map((r, n) => {
          // бакалія «є вдома» — зазвичай вистачає; свіже (м'ясо, овочі, молочне) купуємо під меню
          const m = sameItem(r.name), home = m && m.home && !m.need, shelf = home && m.cat === "Бакалія";
          return `<label><input type="checkbox" data-n="${n}" ${r.qty != null && !shelf ? "checked" : ""}><span style="flex:1">${esc(cap(r.name))}<span class="src">${shelf ? "є вдома · " : home ? "є вдома, перевір кількість · " : ""}для: ${esc(r.from.join(", "))}</span></span><span class="q">${esc(r.label)}</span></label>`;
        }).join("")}</div>
        <button class="btn green wide" data-act="planAdd">Додати відмічене в покупки</button>
      </div>`);
    $("#sheet").dataset.plan = JSON.stringify(rows.map(r => ({ name: r.name, label: r.qty != null ? r.label : "" })));
  };

  /* ---------- рецепти ---------- */
  function renderTags() {
    const full = S.recipes.filter(r => !r.simple && (S.src === "all" || (S.src === "try" ? tryList().includes(r.id) : S.src === "mine" ? !r.src : (r.src || "").startsWith(S.src)))), cnt = c => full.filter(r => catOf(r) === c).length;
    const cats = RCATS.filter(c => cnt(c));
    $("#recCats").innerHTML = [["all", `Усі ${full.length}`], ...cats.map(c => [c, `${c} ${cnt(c)}`]), ["simple", "Прості страви"]].map(([v, l]) => `<button class="gbtn${S.rcat === v ? " on" : ""}" data-rcat="${esc(v)}">${esc(l)}</button>`).join("");
    const books = [...new Set(S.recipes.filter(r => r.src).map(r => r.src.split(" · ")[0]))];
    const tl = tryList().filter(id => recipe(id));
    $("#recSrc").innerHTML = books.length || tl.length ? [["all", "Усі джерела"], ...(tl.length ? [["try", `❤ Хочу спробувати ${tl.length}`]] : []), ["mine", "Мої"], ...books.map(b => [b, "📖 " + b])].map(([v, l]) => `<button class="chip small${S.src === v ? " on" : ""}" data-src="${esc(v)}">${esc(l)}</button>`).join("") : "";
    $("#recTags").innerHTML = [["all", "Для всіх"], ...TAGS.map(t => [t, t])].map(([v, l]) => `<button class="chip small${S.tag === v ? " on" : ""}" data-tag="${esc(v)}">${esc(l)}</button>`).join("");
  }
  $("#recCats").onclick = ev => { const b = ev.target.closest("[data-rcat]"); if (!b) return; S.rcat = b.dataset.rcat; renderTags(); renderRecipes(); };
  $("#recSrc").onclick = ev => { const b = ev.target.closest("[data-src]"); if (!b) return; S.src = b.dataset.src; renderTags(); renderRecipes(); };
  $("#recTags").onclick = ev => { const b = ev.target.closest("[data-tag]"); if (!b) return; S.tag = b.dataset.tag; renderTags(); renderRecipes(); };
  $("#recSearch").oninput = ev => { S.q = ev.target.value.trim().toLowerCase(); renderRecipes(); };
  function renderRecipes() {
    let arr = S.recipes.slice().sort((a, b) => String(a.title).localeCompare(String(b.title), "uk"));
    if (S.rcat === "simple") arr = arr.filter(r => r.simple);
    else { arr = arr.filter(r => !r.simple); if (S.rcat !== "all") arr = arr.filter(r => catOf(r) === S.rcat); }
    if (S.tag !== "all") arr = arr.filter(r => (r.tags || []).includes(S.tag));
    if (S.src === "try") arr = arr.filter(r => tryList().includes(r.id)); else if (S.src === "mine") arr = arr.filter(r => !r.src); else if (S.src !== "all") arr = arr.filter(r => (r.src || "").startsWith(S.src));
    if (S.q) arr = arr.filter(r => (r.title + " " + (r.ingredients || []).map(i => i.name).join(" ")).toLowerCase().includes(S.q));
    const el = $("#recList");
    if (!S.recipes.length) { el.innerHTML = `<p class="empty">Поки порожньо. Натисни «+ Рецепт».</p>`; return; }
    if (!arr.length) { el.innerHTML = `<p class="empty">Нічого не знайшла. Спробуй інше слово чи тег.</p>`; return; }
    const card = r => {
      const n = nutOf(r);
      return `<button class="rec" data-id="${esc(r.id)}"><span class="th">${Art.bowl(r, catOf(r), 60)}</span><span class="meta"><span class="t">${tryList().includes(r.id) ? "❤ " : ""}${esc(r.title)}</span><span class="nut">${n.per100 ? `на 100 г: ${Nutrition.line(n.per100)}` : n.k ? `на порцію: ${Nutrition.line(n)}` : ""}</span>${r.time && r.time.total ? `<span class="nut">⏱ ${fmtMin(r.time.total)}${r.time.active && r.time.active < r.time.total ? ` · біля плити ${fmtMin(r.time.active)}` : ""}</span>` : ""}<span class="tags">${(r.tags || []).map(t => `<span class="pill">${esc(t)}</span>`).join("")}</span></span></button>`;
    };
    // «Усі» — розкладено по категоріях з заголовками
    if (S.rcat === "all" && !S.q) {
      el.innerHTML = RCATS.map(c => { const a = arr.filter(r => catOf(r) === c); return a.length ? `<h3 style="margin-top:8px">${esc(c)}</h3>${a.map(card).join("")}` : ""; }).join("");
    } else el.innerHTML = arr.map(card).join("");
  }
  $("#recList").onclick = ev => { const b = ev.target.closest(".rec"); if (b) openRecipe(b.dataset.id); };
  $("#recNew").onclick = () => openForm(null);

  function openSheet(html) { $("#sheetBody").innerHTML = html; $("#sheet").hidden = false; $("#sheet").scrollTop = 0; document.body.style.overflow = "hidden"; }
  function closeSheet() { EAT = null; $("#sheet").hidden = true; $("#sheetBody").innerHTML = ""; document.body.style.overflow = ""; delete $("#sheet").dataset.plan; P = null; }

  let view = { id: null, por: 0 };
  function scaled(g, k) {
    const u = Portions.normUnit(g.unit), q = +g.qty * k;
    if (u === "кг") return [q * 1000, "г"];
    if (u === "л") return [q * 1000, "мл"];
    return [q, u];
  }
  /* залишки: наступні обіди/вечері після цього прийому їжі */
  const MORD = { b: 0, l: 1, d: 2, x: 3 };
  const after = (d1, m1, d2, m2) => d2 > d1 || (d2 === d1 && MORD[m2] > MORD[m1]);
  function nextSlots(date, meal, n) {
    const out = [];
    for (let i = 0; i < 7 && out.length < n; i++) {
      const d = addDays(date, i);
      for (const m of ["l", "d"]) if (after(date, meal, d, m) && out.length < n) out.push([d, m]);
    }
    return out;
  }
  const slotLabel = (d, m) => { const tk = todayKey(); const day = d === tk ? "сьогодні" : d === addDays(tk, 1) ? "завтра" : WDF[toDate(d).getDay()]; return `${day} ${m === "l" ? "обід" : "вечеря"}`; };
  function leftBar(r, ctx) {
    const sl = slotOf(ctx.date, ctx.meal), dish = sl && (sl.dishes || []).find(d => d.rid === r.id); if (!dish) return "";
    const later = S.slots.filter(s => after(ctx.date, ctx.meal, s.date, s.meal) && (s.dishes || []).some(d => d.rid === r.id && d.left));
    const opts = nextSlots(ctx.date, ctx.meal, 4);
    return `<div class="card leftbar">
      <div class="whorow"><span class="hint">Хто їсть:</span>${S.people.map(x => `<button class="av big${(dish.who || []).includes(x.id) ? "" : " off"}" data-act="whoT" data-p="${esc(x.id)}" aria-pressed="${(dish.who || []).includes(x.id)}" aria-label="${esc(x.name)}">${esc(x.short || x.name[0])}</button>`).join("")}</div>
      <div class="row2"><select id="leftTo">${opts.map(([d, m]) => `<option value="${d}_${m}">${slotLabel(d, m)}</option>`).join("")}</select><button class="btn small" data-act="leftAdd">↻ Лишилось</button></div>
      ${later.length ? `<p class="hint">Залишки вже стоять: ${later.map(s => slotLabel(s.date, s.meal)).join(", ")}.</p><button class="btn ghost small" data-act="leftDone">✓ Доїли — прибрати залишки</button>` : `<p class="hint">Лишилось? Додам на вибраний обід чи вечерю тим самим людям.</p>`}
    </div>`;
  }
  /* «Додати в меню» прямо з рецепта: день → прийом їжі → хто їсть */
  function addBar(r) {
    const a = view.add;
    if (!a) return `<button class="btn ghost wide" data-act="addOpen">📅 Додати в меню</button>`;
    const tk = todayKey(), days = Array.from({ length: 14 }, (_, i) => addDays(tk, i));
    const dayLbl = d => `${d === tk ? "сьогодні" : d === addDays(tk, 1) ? "завтра" : WDF[toDate(d).getDay()]}, ${toDate(d).getDate()} ${MON[toDate(d).getMonth()]}`;
    const there = ((slotOf(a.date, a.meal) || {}).dishes || []).map(d => recipe(d.rid)?.title).filter(Boolean);
    return `<div class="card leftbar">
      <b>Додати в меню</b>
      <div class="row2"><select id="addDay">${days.map(d => `<option value="${d}"${d === a.date ? " selected" : ""}>${dayLbl(d)}</option>`).join("")}</select><select id="addMeal">${MEALS.map(([m, l]) => `<option value="${m}"${m === a.meal ? " selected" : ""}>${l}</option>`).join("")}</select></div>
      <div class="whorow"><span class="hint">Хто їсть:</span>${S.people.map(x => `<button class="av big${a.who.includes(x.id) ? "" : " off"}" data-act="addW" data-p="${esc(x.id)}" aria-pressed="${a.who.includes(x.id)}" aria-label="${esc(x.name)}">${esc(x.short || x.name[0])}</button>`).join("")}</div>
      <p class="hint">${there.length ? `Там уже: ${esc(there.join(", "))}.` : "Там поки порожньо."}</p>
      <div class="pbtns" style="margin-top:0"><button class="btn" data-act="addGo">Додати</button><button class="btn ghost" data-act="addCancel">Скасувати</button></div>
    </div>`;
  }
  const tryList = () => ((S.meta.try || {}).ids || []);
  function openRecipe(id, por, ctx) {
    const r = recipe(id); if (!r) return;
    const base = +r.servings || 1;
    if (ctx === undefined) ctx = view && view.id === id ? view.ctx : null;
    view = { id, por: por || base, ctx, add: view && view.id === id ? view.add : null };
    const liked = tryList().includes(id);
    const k = view.por / base, n = nutOf(r);
    const link = safeUrl(r.link);
    openSheet(`<div class="shhead"><button class="btn ghost small" data-act="close">← Назад</button><span style="flex:1"></span><button class="btn ghost small heart${liked ? " on" : ""}" data-act="try" aria-pressed="${liked}" aria-label="Хочу спробувати">${liked ? "❤" : "♡"}</button><button class="btn ghost small" data-act="edit">Редагувати</button></div>
    <div class="stack" data-rid="${esc(r.id)}">
      <h2 style="font-size:2rem">${esc(r.title)}</h2>
      ${ctx && ctx.meal ? leftBar(r, ctx) : addBar(r)}
      <div class="tags">${r.src ? `<span class="pill">📖 ${esc(r.src)}</span>` : ""}<span class="pill">${esc(catOf(r))}</span><span class="pill"><i class="sw g-${GROUPS[r.group] ? r.group : "dish"}"></i> ${esc(GROUPS[r.group] || "Ціла страва")}</span>${(r.tags || []).map(t => `<span class="pill">${esc(t)}</span>`).join("")}</div>
      <div class="hero">${Art.bowl(r, catOf(r), 132)}</div>
      ${r.time && r.time.total ? `<p class="timeline">⏱ Разом <b>${fmtMin(r.time.total)}</b>${r.time.active ? ` · біля плити <b>${fmtMin(r.time.active)}</b>` : ""}</p>` : ""}
      ${r.thumb ? `<details class="note"><summary>Скриншот рецепта</summary><img class="bigimg" style="margin-top:8px" src="${esc(r.thumb)}" alt="Скриншот рецепта"></details>` : ""}
      ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">Відкрити оригінал ↗</a>` : ""}
      <div class="card stack" style="gap:8px">${n.per100 ? `<h3>КБЖУ на 100 г готової страви</h3>
        <div class="nutbox"><div><b>${r0(n.per100.k)}</b><span>ккал</span></div><div><b>${r0(n.per100.p)}</b><span>білки</span></div><div><b>${r0(n.per100.f)}</b><span>жири</span></div><div><b>${r0(n.per100.c)}</b><span>вуглев.</span></div></div>
        <p class="hint"><b>1 порція ≈ ${r0(n.g)} г готової:</b> ${Nutrition.line(n)}</p>
        <p class="hint">${n.method === "book" ? "КБЖУ з книги автора." : n.method === "weighed" ? `Вага зважена: вся страва ${r0(+r.cookedG)} г.` : n.method === "raw" ? "Страва без термообробки — вага як у продуктів." : `${n.method === "boil" ? "Варіння" : "Запікання / смаження"}: вихід ≈ ${n.yieldPct} % від ваги сирих продуктів (${r0(n.gRaw)} г сирих на порцію → ${r0(n.g)} г готових). Зважиш готову страву — впиши вагу в «Редагувати», буде точніше.`}${n.per100raw && n.method !== "raw" ? ` На 100 г сирої суміші: ${r0(n.per100raw.k)} ккал.` : ""}</p>` : `<h3>КБЖУ на 1 порцію</h3>
        <div class="nutbox"><div><b>${r0(n.k)}</b><span>ккал</span></div><div><b>${r0(n.p)}</b><span>білки</span></div><div><b>${r0(n.f)}</b><span>жири</span></div><div><b>${r0(n.c)}</b><span>вуглев.</span></div></div>`}
        ${n.missing.length ? `<p class="hint">Без даних для: ${esc(n.missing.join(", "))} — цифри неповні. Можна вписати КБЖУ вручну в «Редагувати».</p>` : `<p class="hint">Приблизно, ±15 %. Порції: ${S.people.map(x => `${esc(x.name)} ×${N(+x.w || 1)}`).join(", ")}.</p>`}
      </div>
      ${r.tip ? `<div class="tip"><b>Порада:</b> ${esc(r.tip)}</div>` : ""}
      ${(r.ingredients || []).length ? `<div class="card">
        <div class="servings" style="margin-bottom:8px"><h3 style="flex:1">Інгредієнти</h3><span class="stepper"><button data-act="pminus" aria-label="Менше порцій">−</button><span>${N(view.por)}</span><button data-act="pplus" aria-label="Більше порцій">+</button></span><span class="hint">порц.</span></div>
        ${r.ingredients.some(g => g.orig) ? `<p class="swapnote">🛒 Замінила для Словаччини: ${r.ingredients.filter(g => g.orig).map(g => `${esc(g.orig)} → ${esc(g.name)}`).join("; ")}</p>` : ""}<p class="hint" style="margin-bottom:4px">Відміть, чого нема вдома, і додай у покупки.</p>
        <div class="ing">${r.ingredients.map((g, i) => `<label><input type="checkbox" data-n="${i}"><span style="flex:1">${esc(g.name)}${g.sk ? ` <span class="sk">${esc(g.sk)}</span>` : ""}${g.orig ? `<span class="orig">замість: ${esc(g.orig)}</span>` : ""}</span><span class="q">${g.qty == null ? "за смаком" : esc(Portions.fmt(...scaled(g, k)))}</span></label>`).join("")}</div>
        <button class="btn wide" style="margin-top:10px" data-act="tolist">Додати відмічене в покупки</button>
      </div>` : ""}
      ${(r.prep || []).length ? `<div class="card"><h3 style="margin-bottom:8px">Підготовка заздалегідь</h3><div class="stack" style="gap:6px">${r.prep.map(p => `<div><b>${p.when === "pre" ? `за ${p.before || 30} хв до їжі` : esc(WHEN_W[p.when] || "")}:</b> ${esc(p.t)}${p.min ? ` <span class="hint">· ${p.min} хв</span>` : ""}</div>`).join("")}</div></div>` : ""}
      ${(r.steps || []).length ? `<div class="card"><h3 style="margin-bottom:8px">Як готувати</h3><ol class="steps">${r.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>` : ""}
      <button class="btn danger" data-act="delrec">Видалити рецепт</button>
    </div>`);
  }

  /* усі кнопки у висувних екранах */
  $("#sheet").addEventListener("click", async ev => {
    const b = ev.target.closest("[data-act]"); if (!b) return;
    const act = b.dataset.act;
    if (act === "close") { closeSheet(); return; }
    // конструктор
    if (P) {
      if (act === "pkG") { P.g = b.dataset.g; drawPkGroups(); drawPkGrid(); return; }
      if (act === "pkT") {
        const i = P.dishes.findIndex(d => d.rid === b.dataset.rid);
        if (i >= 0) P.dishes.splice(i, 1); else P.dishes.push({ rid: b.dataset.rid, who: S.people.map(x => x.id) });
        drawPkGrid(); drawPkPicked(); return;
      }
      if (act === "pkW") {
        const d = P.dishes[+b.dataset.i], s = new Set(d.who || []);
        s.has(b.dataset.p) ? s.delete(b.dataset.p) : s.add(b.dataset.p);
        d.who = S.people.map(x => x.id).filter(x => s.has(x)); drawPkPicked(); return;
      }
      if (act === "pkL") { const d = P.dishes[+b.dataset.i]; d.left = !d.left; if (!d.left) delete d.left; drawPkPicked(); return; }
      if (act === "pkX") { P.dishes.splice(+b.dataset.i, 1); drawPkGrid(); drawPkPicked(); return; }
      if (act === "smOpen") { P.simple = true; drawPkSimple(); $("#smName").focus(); return; }
      if (act === "smCancel") { P.simple = false; drawPkSimple(); return; }
      if (act === "smAdd") {
        const title = cap($("#smName").value.trim()), g = +$("#smG").value;
        if (!title) { toast("Напиши назву страви."); return; }
        if (!(g > 0)) { toast("Скільки грамів на порцію?"); return; }
        const prod = cap($("#smProd").value.trim() || title.replace(/^варен\S*\s+/i, ""));
        const id = Store.newId("s");
        const ok = await save(() => Store.set("recipes", id, { title, group: $("#smGroup").value, simple: true, tags: [], servings: 1, ingredients: [{ qty: g, unit: "г", name: prod }], steps: [], tip: "", link: "", createdAt: Date.now(), updatedAt: Date.now() }));
        if (ok) { P.dishes.push({ rid: id, who: S.people.map(x => x.id) }); P.simple = false; drawPkSimple(); drawPkGrid(); drawPkPicked(); }
        return;
      }
      if (act === "pkSave") return savePicker(false);
      if (act === "pkSaveNext") return savePicker(true);
    }
    if (MP && act === "mpGo") { runPlan(); return; }
    if (MP && act === "mpSave") { savePlan(); return; }
    if (act === "planAdd") {
      const rows = JSON.parse($("#sheet").dataset.plan || "[]");
      const picked = [...document.querySelectorAll("#planRows input:checked")].map(i => rows[+i.dataset.n]);
      for (const p of picked) await addToList(cap(p.name), p.label);
      closeSheet(); go("buy"); toast(`Додано в покупки: ${picked.length}`); return;
    }
    const rid = $("#sheetBody [data-rid]")?.dataset.rid;
    const r = recipe(rid);
    if (!r) return;
    if (act === "edit") { openForm(r); return; }
    if (act === "addOpen") { view.add = { date: todayKey(), meal: r.group === "sweet" ? "b" : "d", who: S.people.map(x => x.id) }; openRecipe(r.id, view.por); return; }
    if (act === "addCancel") { view.add = null; openRecipe(r.id, view.por); return; }
    if (act === "addW" && view.add) {
      const w = new Set(view.add.who); w.has(b.dataset.p) ? w.delete(b.dataset.p) : w.add(b.dataset.p);
      view.add.who = S.people.map(x => x.id).filter(x => w.has(x)); openRecipe(r.id, view.por); return;
    }
    if (act === "addGo" && view.add) {
      const a = view.add; if (!a.who.length) { toast("Хтось має їсти — тапни на людей."); return; }
      const sl = slotOf(a.date, a.meal), dishes = structuredClone(sl ? sl.dishes || [] : []), ex = dishes.find(x => x.rid === r.id);
      if (ex) { ex.who = [...a.who]; delete ex.left; } else dishes.push({ rid: r.id, who: [...a.who] });
      const ok = await save(() => Store.set("slots", `${a.date}_${a.meal}`, { date: a.date, meal: a.meal, dishes }));
      if (ok) { view.add = null; toast(`В меню: ${a.date === todayKey() ? "сьогодні" : WDA[toDate(a.date).getDay()]}, ${MEALS.find(x => x[0] === a.meal)[1].toLowerCase()}`); setTimeout(() => openRecipe(r.id, view.por), 200); }
      return;
    }
    if (act === "try") {
      const ids = tryList().filter(x => x !== r.id); if (!tryList().includes(r.id)) ids.unshift(r.id);
      const ok = await save(() => Store.set("meta", "try", { ids }));
      if (ok) { setTimeout(() => openRecipe(r.id, view.por), 150); toast(ids.includes(r.id) ? "Додала в «Хочу спробувати»" : "Прибрала з «Хочу спробувати»"); }
      return;
    }
    if (act === "whoT" && view.ctx) {
      const ctx = view.ctx, sl = slotOf(ctx.date, ctx.meal); if (!sl) return;
      const dishes = structuredClone(sl.dishes || []), dd = dishes.find(x => x.rid === r.id); if (!dd) return;
      const w = new Set(dd.who || []); w.has(b.dataset.p) ? w.delete(b.dataset.p) : w.add(b.dataset.p);
      if (!w.size) { toast("Хтось має їсти — або прибери страву в мисці."); return; }
      dd.who = S.people.map(x => x.id).filter(x => w.has(x));
      const ok = await save(() => Store.set("slots", sl.id, { date: sl.date, meal: sl.meal, dishes }));
      if (ok) setTimeout(() => openRecipe(r.id, view.por), 200);
      return;
    }
    if (act === "leftAdd" && view.ctx) {
      const ctx = view.ctx, src = (slotOf(ctx.date, ctx.meal)?.dishes || []).find(d => d.rid === r.id); if (!src) return;
      const [d, m] = $("#leftTo").value.split("_"), id = `${d}_${m}`, sl = slotOf(d, m);
      const dishes = structuredClone(sl ? sl.dishes || [] : []), ex = dishes.find(x => x.rid === r.id);
      if (ex) { ex.left = true; ex.who = [...new Set([...(ex.who || []), ...(src.who || [])])]; } else dishes.push({ rid: r.id, who: [...(src.who || [])], left: true });
      const ok = await save(() => Store.set("slots", id, { date: d, meal: m, dishes }));
      if (ok) { toast(`Залишки: ${slotLabel(d, m)}`); setTimeout(() => openRecipe(r.id, view.por), 200); }
      return;
    }
    if (act === "leftDone" && view.ctx) {
      const ctx = view.ctx;
      for (const sl of S.slots.filter(s => after(ctx.date, ctx.meal, s.date, s.meal) && (s.dishes || []).some(d => d.rid === r.id && d.left))) {
        const dishes = sl.dishes.filter(d => !(d.rid === r.id && d.left));
        await save(() => dishes.length ? Store.set("slots", sl.id, { date: sl.date, meal: sl.meal, dishes }) : Store.del("slots", sl.id));
      }
      toast("Залишки прибрала з меню"); setTimeout(() => openRecipe(r.id, view.por), 200);
      return;
    }
    if (act === "pminus" || act === "pplus") {
      const step = (+r.servings || 1) >= 6 ? 1 : 0.5;
      openRecipe(r.id, Math.max(step, view.por + (act === "pplus" ? step : -step)));
      return;
    }
    if (act === "tolist") {
      const k = view.por / (+r.servings || 1);
      const picked = [...document.querySelectorAll(".ing input:checked")].map(i => r.ingredients[+i.dataset.n]);
      if (!picked.length) { toast("Відміть продукти, яких нема вдома."); return; }
      for (const g of picked) await addToList(cap(g.name), g.qty == null ? "" : Portions.fmt(...scaled(g, k)));
      document.querySelectorAll(".ing input:checked").forEach(i => i.checked = false);
      toast(`Додано в покупки: ${picked.length}`); return;
    }
    if (act === "delrec") {
      if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Точно видалити? Натисни ще раз"; return; }
      if (await save(() => Store.del("recipes", r.id))) { closeSheet(); toast("Рецепт видалено"); }
    }
  });

  $("#sheet").addEventListener("change", ev => {
    if (!view.add || !["addDay", "addMeal"].includes(ev.target.id)) return;
    view.add[ev.target.id === "addDay" ? "date" : "meal"] = ev.target.value; openRecipe(view.id, view.por);
  });

  /* форма рецепта */
  let F = null;
  function openForm(r, prefill) {
    F = { id: r ? r.id : null, thumb: r ? r.thumb || "" : "", photo: r ? r.photo || "" : "", files: [], tags: new Set(r ? r.tags || [] : []), r };
    const ingText = r ? (r.ingredients || []).map(Portions.lineOf).join("\n") : "";
    const nu = (r && r.nutr) || {};
    openSheet(`<div class="shhead"><button class="btn ghost small" data-act="close">← Назад</button><h2>${r ? "Редагувати" : "Новий рецепт"}</h2></div>
    <div class="stack">
      <label class="fl">Посилання (Instagram, TikTok, YouTube)<input type="url" id="fLink" placeholder="https://" value="${esc((r && r.link) || (prefill && prefill.link) || "")}"></label>
      <label class="fl">Скриншоти рецепта<input type="file" id="fImg" accept="image/*" multiple></label>
      <div class="thumbs" id="fThumbs"></div>
      <label class="fl">Текст з опису (необов'язково)<textarea id="fText" placeholder="Встав текст рецепта, якщо він є в описі">${esc((prefill && prefill.text) || "")}</textarea></label>
      <div class="parse"><button class="btn ghost" type="button" id="fParse">Розібрати рецепт</button><span class="state" id="fState"></span></div>
      <hr>
      <label class="fl">Назва<input type="text" id="fTitle" value="${esc(r ? r.title : "")}"></label>
      <div class="group"><span class="fl">Фото страви <span class="hint">Кругле, в мисці. Без фото — іконка категорії.</span></span>
        <div class="photorow"><span id="fBowl"></span><div class="stack" style="gap:6px;flex:1">
          <label class="btn ghost small" style="text-align:center">Додати фото<input type="file" id="fPhoto" accept="image/*" hidden></label>
          <button class="btn ghost small" type="button" id="fCropShot">Вирізати зі скриншота</button>
          <button class="btn ghost small" type="button" id="fNoPhoto">Без фото</button>
        </div></div></div>
      <label class="fl">Категорія<select id="fCat">${RCATS.map(c => `<option${c === (r ? catOf(r) : (prefill && prefill.cat) || "Інше") ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
      <label class="fl">Що це в мисці<select id="fGroup">${GKEYS.map(k => `<option value="${k}"${k === ((r && r.group) || "dish") ? " selected" : ""}>${GROUPS[k]}</option>`).join("")}</select></label>
      <div class="group"><span class="fl">Для кого</span><div class="chips" id="fTags"></div></div>
      <div class="group"><span class="fl">Час готування, хв <span class="hint">Разом (з запіканням і охолодженням) і скільки з цього треба стояти біля плити</span></span>
        <div class="person" style="grid-template-columns:1fr 1fr"><input type="number" id="fTimeT" min="0" step="5" placeholder="разом" value="${esc(r && r.time ? r.time.total || "" : "")}"><input type="number" id="fTimeA" min="0" step="5" placeholder="біля плити" value="${esc(r && r.time ? r.time.active || "" : "")}"></div></div>
      <label class="fl">На скільки порцій рецепт<input type="number" id="fServ" min="0.5" step="0.5" value="${esc(r ? r.servings || 4 : 4)}"></label>
      <label class="fl">Інгредієнти <span class="hint">Кожен з нового рядка: «700 г фарш з індички», «2 шт яйця», «сіль — за смаком»</span><textarea id="fIng" rows="7">${esc(ingText)}</textarea></label>
      <label class="fl">Підготовка заздалегідь <span class="hint">Кожна справа з нового рядка: «напередодні: замаринувати курку (10 хв)», «зранку: …», «вдень: …», «за 30 хв: котлети в аерогриль (2 хв)»</span><textarea id="fPrep" rows="4">${esc(r ? (r.prep || []).map(prepLine).join("\n") : "")}</textarea></label>
      <label class="fl">Як готувати <span class="hint">Кожен крок з нового рядка</span><textarea id="fSteps" rows="6">${esc(r ? (r.steps || []).join("\n") : "")}</textarea></label>
      <label class="fl">Порада для мене / для сина<textarea id="fTip" rows="3">${esc(r ? r.tip || "" : "")}</textarea></label>
      <div class="group"><span class="fl">КБЖУ на порцію вручну <span class="hint">Необов'язково: якщо заповнити, застосунок не рахуватиме сам</span></span>
        <label class="fl" style="font-weight:600">Вага всієї готової страви, г <span class="hint">Якщо зважила після готування — КБЖУ на 100 г буде точним</span><input type="number" id="fCooked" min="0" step="10" placeholder="напр. 850" value="${esc(r && r.cookedG ? r.cookedG : "")}"></label>
        <div class="nutbox"><input type="number" id="nK" placeholder="ккал" value="${esc(nu.k ?? "")}"><input type="number" id="nP" placeholder="Б" value="${esc(nu.p ?? "")}"><input type="number" id="nF" placeholder="Ж" value="${esc(nu.f ?? "")}"><input type="number" id="nC" placeholder="У" value="${esc(nu.c ?? "")}"></div></div>
      <button class="btn" type="button" id="fSave">Зберегти рецепт</button>
    </div>`);
    drawFormTags(); drawThumbs(); drawPhoto();
    $("#fCat").onchange = drawPhoto; $("#fGroup").onchange = drawPhoto;
    $("#fPhoto").onchange = async () => {
      const f = $("#fPhoto").files[0]; $("#fPhoto").value = ""; if (!f) return;
      const u = URL.createObjectURL(f); const out = await Art.crop(u); URL.revokeObjectURL(u);
      if (out) { F.photo = out; drawPhoto(); }
    };
    $("#fCropShot").onclick = async () => {
      let src = F.thumb, u = null;
      if (F.files[0]) { u = URL.createObjectURL(F.files[0]); src = u; }
      if (!src) { toast("Спершу додай скриншот вище або фото."); return; }
      const out = await Art.crop(src); if (u) URL.revokeObjectURL(u);
      if (out) { F.photo = out; drawPhoto(); }
    };
    $("#fNoPhoto").onclick = () => { F.photo = ""; drawPhoto(); };
    $("#fImg").onchange = async () => {
      const fs = [...$("#fImg").files]; $("#fImg").value = "";
      F.files.push(...fs);
      if (!F.thumb && fs[0]) F.thumb = await makeThumb(fs[0]);
      drawThumbs(); drawPhoto();
    };
    $("#fTags").onclick = ev => { const b = ev.target.closest("[data-tag]"); if (!b) return; const t = b.dataset.tag; F.tags.has(t) ? F.tags.delete(t) : F.tags.add(t); drawFormTags(); };
    $("#fParse").onclick = parseRecipe;
    $("#fSave").onclick = saveRecipe;
  }
  function drawPhoto() {
    const el = $("#fBowl"); if (!el) return;
    el.innerHTML = Art.bowl({ photo: F.photo, group: $("#fGroup").value }, $("#fCat").value, 96);
    $("#fCropShot").hidden = !(F.files.length || F.thumb);
    $("#fNoPhoto").hidden = !F.photo;
  }
  function drawFormTags() { $("#fTags").innerHTML = TAGS.map(t => `<button type="button" class="chip${F.tags.has(t) ? " on" : ""}" data-tag="${esc(t)}">${esc(t)}</button>`).join(""); }
  function drawThumbs() {
    const el = $("#fThumbs");
    for (const u of drawThumbs._u || []) URL.revokeObjectURL(u);
    drawThumbs._u = F.files.map(f => URL.createObjectURL(f));
    el.innerHTML = (F.thumb && !F.files.length ? `<div><img src="${esc(F.thumb)}" alt=""><button type="button" data-k="thumb" aria-label="Прибрати фото">×</button></div>` : "") +
      drawThumbs._u.map((u, n) => `<div><img src="${u}" alt=""><button type="button" data-f="${n}" aria-label="Прибрати фото">×</button></div>`).join("");
    el.onclick = ev => {
      const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.k === "thumb") F.thumb = ""; else { F.files.splice(+b.dataset.f, 1); if (!F.files.length) F.thumb = ""; }
      drawThumbs();
    };
  }
  /* маленька копія фото для картки рецепта (щоб не забивати пам'ять телефону) */
  function makeThumb(file) {
    return new Promise(res => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, 480 / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => { URL.revokeObjectURL(url); res(""); };
      img.src = url;
    });
  }
  async function parseRecipe() {
    const st = $("#fState");
    if (!window.AI) { st.textContent = "Розбір з'явиться, коли підключимо Gemini. Поки що заповни вручну."; return; }
    const btn = $("#fParse"); btn.disabled = true; st.textContent = "Читаю рецепт…";
    try {
      const j = await window.AI.parseRecipe({ link: $("#fLink").value.trim(), text: $("#fText").value.trim(), images: F.files.slice(0, 4) });
      if (j.title && !$("#fTitle").value.trim()) $("#fTitle").value = j.title;
      if (j.servings) $("#fServ").value = j.servings;
      if (j.group && GROUPS[j.group]) $("#fGroup").value = j.group;
      if (j.cat && RCATS.includes(j.cat)) $("#fCat").value = j.cat;
      if (j.ingredients && j.ingredients.length) $("#fIng").value = j.ingredients.map(Portions.lineOf).join("\n");
      if (j.steps && j.steps.length) $("#fSteps").value = j.steps.join("\n");
      if (j.tip) $("#fTip").value = j.tip;
      if (j.time && +j.time.total) { $("#fTimeT").value = +j.time.total; if (+j.time.active) $("#fTimeA").value = +j.time.active; }
      if (Array.isArray(j.prep) && j.prep.length) $("#fPrep").value = j.prep.filter(x => x && x.t).map(x => prepLine({ t: String(x.t), when: ["eve", "morn", "day", "pre"].includes(x.when) ? x.when : "pre", before: +x.before || 30, min: +x.min || null })).join("\n");
      for (const t of j.tags || []) if (TAGS.includes(t)) F.tags.add(t);
      drawFormTags(); st.textContent = "Готово. Перевір і збережи.";
    } catch (e) { console.error(e); st.textContent = e && e.userMessage || "Не вийшло розібрати. Додай скриншот або заповни вручну."; }
    finally { btn.disabled = false; }
  }
  async function saveRecipe() {
    const title = $("#fTitle").value.trim();
    if (!title) { toast("Дай рецепту назву."); $("#fTitle").focus(); return; }
    const lines = s => s.split("\n").map(x => x.trim()).filter(Boolean);
    const nv = id => { const v = $(id).value.trim(); return v === "" ? null : +v; };
    const nutr = [nv("#nK"), nv("#nP"), nv("#nF"), nv("#nC")];
    const old = F.id ? recipe(F.id) : null;
    const body = {
      title, cat: $("#fCat").value, group: $("#fGroup").value, tags: [...F.tags], servings: Math.max(0.5, +$("#fServ").value || 4),
      ingredients: lines($("#fIng").value).map(Portions.parseLine).filter(Boolean).map(i => ({ ...i, name: cap(i.name) })),
      steps: lines($("#fSteps").value), prep: lines($("#fPrep").value).map(parsePrep).filter(Boolean), tip: $("#fTip").value.trim(), link: $("#fLink").value.trim(),
      thumb: F.thumb || "", photo: F.photo || "", simple: !!(old && old.simple), updatedAt: Date.now(),
      time: +$("#fTimeT").value > 0 ? { total: +$("#fTimeT").value, active: +$("#fTimeA").value || null } : null,
      cookedG: +$("#fCooked").value > 0 ? +$("#fCooked").value : null,
      nutr: nutr.some(v => v != null) ? { k: nutr[0] || 0, p: nutr[1] || 0, f: nutr[2] || 0, c: nutr[3] || 0 } : null
    };
    const id = F.id || Store.newId("r");
    if (!F.id) body.createdAt = Date.now();
    const ok = await save(() => F.id ? Store.update("recipes", id, body) : Store.set("recipes", id, body));
    if (ok) { F = null; toast("Рецепт збережено"); openRecipe(id); }
  }

  /* ---------- Ще: налаштування ---------- */
  function renderMore() {
    $("#moreBody").innerHTML = `
      <div class="card stack">
        <h2>Хто скільки їсть</h2>
        <p class="hint">1 = звичайна доросла порція. Від цього рахуються покупки і КБЖУ кожної тарілки.</p>
        ${S.people.map(p => `<label class="person"><span>${esc(p.name)}</span><input type="number" min="0" max="3" step="0.1" data-pf="w" data-pid="${esc(p.id)}" value="${esc(p.w)}" aria-label="Порція: ${esc(p.name)}"></label>`).join("")}
      </div>
      <div class="card stack">
        <h2>Коли їмо</h2>
        <p class="hint">Від цього «Підготовка» рахує, о котрій що ставити.</p>
        ${MEALS.map(([m, l]) => `<label class="person"><span>${l}</span><input type="time" data-mt="${m}" value="${esc(mealTime(m))}" aria-label="Час: ${l}"></label>`).join("")}
      </div>
      <div class="card stack">
        <h2>Мета на день</h2>
        <p class="hint">Необов'язково. Якщо вписати, у меню з'явиться смужка «скільки білку вже є». Цілі краще звірити з лікарем.</p>
        ${S.people.map(p => `<div class="group"><b>${esc(p.name)}</b><div class="person" style="grid-template-columns:1fr 1fr"><input type="number" min="0" step="5" placeholder="білок, г" data-pf="goalP" data-pid="${esc(p.id)}" value="${esc(p.goalP || "")}" aria-label="Білок на день: ${esc(p.name)}"><input type="number" min="0" step="50" placeholder="ккал" data-pf="goalK" data-pid="${esc(p.id)}" value="${esc(p.goalK || "")}" aria-label="Калорії на день: ${esc(p.name)}"></div></div>`).join("")}
      </div>
      <div class="card stack">
        <h2>Про родину для Gemini</h2>
        <p class="hint">Що враховувати, коли Gemini розбирає рецепт: ваші потреби, що їсть дитина. Зберігається тільки в закритих даних родини.</p>
        <textarea id="profileText" rows="5" placeholder="Напр.: мені — більше білку, мало цукру; син їсть кускус, макарони, котлети…">${esc(S.profile)}</textarea>
      </div>
      ${Store.mode === "cloud" ? `<div class="card stack">
        <h2>Ключ Gemini</h2>
        <p class="hint">Потрібен, щоб «Розібрати рецепт» читав скриншоти й посилання. Створи його на aistudio.google.com/apikey (проєкт Kitchen) і встав сюди. Зберігається тільки в закритих даних родини.</p>
        <input type="password" id="aiKey" placeholder="AIza…" value="${esc(S.aiKey)}" autocomplete="off">
        <p class="hint" id="aiKeyState">${S.aiKey ? "Ключ збережено ✓" : "Ключа ще немає"}</p>
      </div>` : ""}
      <div class="card stack">
        <h2>Синхронізація</h2>
        <p class="hint">${Store.mode === "local" ? "Зараз дані зберігаються тільки на цьому пристрої. Наступний крок — Firebase, тоді список побачить і чоловік." : `Дані спільні для всієї родини. Ти увійшла як ${esc((Store.user || {}).email || "")}.`}</p>
        ${Store.mode === "cloud" ? '<button class="btn ghost" id="outBtn" type="button">Вийти з акаунта</button>' : ""}
      </div>
      <div class="card stack">
        <h2>Копія даних</h2>
        <p class="hint">Файл з усіма рецептами, меню і списком — на випадок переїзду на інший телефон.</p>
        <button class="btn ghost" id="expBtn" type="button">Зберегти копію</button>
        <label class="btn ghost" style="text-align:center">Відновити з файлу<input type="file" id="impFile" accept="application/json" hidden></label>
        <button class="btn danger" id="resetBtn" type="button">Почати з прикладу заново</button>
      </div>`;
    $("#moreBody").querySelectorAll("[data-pf]").forEach(inp => inp.onchange = () => {
      const f = inp.dataset.pf, v = inp.value.trim();
      const list = S.people.map(p => p.id === inp.dataset.pid ? { ...p, [f]: f === "w" ? Math.max(0, +v || 0) : (v === "" ? "" : Math.max(0, +v || 0)) } : p);
      save(() => Store.set("settings", "people", { list }));
    });
    $("#moreBody").querySelectorAll("[data-mt]").forEach(inp => inp.onchange = () => {
      const times = { ...MEAL_T, ...(S.meta.times || {}) }; delete times.id; times[inp.dataset.mt] = inp.value || MEAL_T[inp.dataset.mt];
      save(() => Store.set("meta", "times", times));
    });
    const ak = $("#aiKey"); if (ak) ak.onchange = async e => { const v = e.target.value.trim(); if (await save(() => Store.set("settings", "ai", { geminiKey: v }))) $("#aiKeyState").textContent = v ? "Ключ збережено ✓" : "Ключ видалено"; };
    $("#profileText").onchange = e => save(() => Store.set("settings", "profile", { text: e.target.value.trim() }));
    const out = $("#outBtn"); if (out) out.onclick = () => Store.signOut();
    $("#expBtn").onclick = () => {
      const blob = new Blob([JSON.stringify(Store.exportAll(), null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `kuhnia-${todayKey()}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    $("#impFile").onchange = async ev => {
      const f = ev.target.files[0]; if (!f) return;
      try { await Store.importAll(JSON.parse(await f.text())); toast("Дані відновлено"); } catch (e) { toast("Цей файл не підходить."); }
    };
    $("#resetBtn").onclick = async ev => {
      const b = ev.currentTarget;
      if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "Усе твоє зітреться. Натисни ще раз"; return; }
      await Store.reset(); toast("Повернуто приклад");
    };
  }

  /* ---------- «Поділитися» з Instagram / TikTok ---------- */
  function handleShare() {
    const p = new URLSearchParams(location.search);
    const text = [p.get("title"), p.get("text"), p.get("url")].filter(Boolean).join("\n");
    if (!text) return;
    history.replaceState(null, "", location.pathname);
    const link = (text.match(/https?:\/\/\S+/) || [""])[0];
    const rest = text.replace(link, "").trim();
    go("rec");
    openForm(null, { link, text: rest });
    toast("Посилання отримано. Додай скриншот або натисни «Розібрати рецепт».");
  }

  /* ---------- старт ---------- */

  /* ---------- Я: мій раціон — з фото тарілки (меню не рахується автоматично) ---------- */
  const ME = { day: null, busy: false, est: null, note: "", hints: [], text: "", imgs: [], thumb: "", meal: null, open: null };
  const meP = () => person("me") || S.people[0];
  const meLog = (date, pid) => (eatDoc(date, pid).extra || []);
  const sumN = xs => xs.reduce((a, x) => ({ ...Nutrition.add(a, x), fib: (a.fib || 0) + (+x.fib || 0), fe: (a.fe || 0) + (+x.fe || 0) }), { ...Nutrition.zero(), fib: 0, fe: 0 });
  const r1 = v => Math.round(v * 10) / 10;
  async function meWrite(date, pid, fn) {
    const id = `eat_${date}_${pid}`, doc = structuredClone(S.meta[id] || {}); delete doc.id;
    doc.adj = doc.adj || {}; doc.extra = doc.extra || [];
    fn(doc);
    return save(() => Store.set("meta", id, doc));
  }
  /* фото з телефона завеликі — зменшуємо перед відправкою; маленька копія лишається в записі */
  function shrink(file, max, q) {
    return new Promise((res, rej) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res(c.toDataURL("image/jpeg", q));
      };
      img.onerror = e => { URL.revokeObjectURL(url); rej(e); };
      img.src = url;
    });
  }
  /* коли зроблено фото: EXIF DateTimeOriginal з JPEG, інакше — дата файлу */
  async function shotTime(file) {
    try {
      const v = new DataView(await file.slice(0, 131072).arrayBuffer());
      if (v.getUint16(0) !== 0xFFD8) throw 0;
      for (let o = 2; o + 4 < v.byteLength;) {
        const mk = v.getUint16(o), len = v.getUint16(o + 2);
        if (mk === 0xFFE1 && v.getUint32(o + 4) === 0x45786966) {
          const t = o + 10, le = v.getUint16(t) === 0x4949, u16 = x => v.getUint16(t + x, le), u32 = x => v.getUint32(t + x, le);
          const tag = (ifd, id) => { const n = u16(ifd); for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (u16(e) === id) return e; } return 0; };
          const str = e => { let s = ""; for (let i = 0; i < 19; i++) s += String.fromCharCode(v.getUint8(t + u32(e + 8) + i)); return s; };
          const ifd0 = u32(4), ex = tag(ifd0, 0x8769), e = (ex && tag(u32(ex + 8), 0x9003)) || tag(ifd0, 0x0132);
          if (e) { const m = str(e).match(/(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d)/); if (m) return new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]); }
          break;
        }
        if ((mk & 0xFF00) !== 0xFF00 || mk === 0xFFDA) break;
        o += 2 + len;
      }
    } catch (e) { /* не JPEG або без EXIF */ }
    return new Date(file.lastModified || Date.now());
  }
  const mealAt = d => { const h = d.getHours(); return h < 11 ? "b" : h < 16 ? "l" : h < 21 ? "d" : "x"; };
  const dataToFile = (d, n) => { const [h, b64s] = d.split(","), bin = atob(b64s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new File([u], n, { type: "image/jpeg" }); };
  const menuToday = (date, pid) => MEALS.flatMap(([m]) => ((slotOf(date, m) || {}).dishes || []).filter(d => (d.who || []).includes(pid)).map(d => d.rid)).filter((v, i, a) => recipe(v) && a.indexOf(v) === i);
  function renderMe() {
    const box = $("#meBox"); if (!box || !S.people.length) return;
    const p = meP(), tk = todayKey(); ME.day = ME.day || tk;
    const date = ME.day, d = toDate(date), log = meLog(date, p.id), day = sumN(log);
    const goalK = +p.goalK || 0, goalP = +p.goalP || 0, plate = +p.plate || 0;
    const ring = (v, goal, lbl, cls) => {
      const pct = goal ? Math.min(1, v / goal) : 0, R = 30, C = 2 * Math.PI * R;
      return `<div class="ring"><svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true"><circle cx="36" cy="36" r="${R}" fill="none" stroke="var(--paper-2)" stroke-width="8"/>${goal ? `<circle cx="36" cy="36" r="${R}" fill="none" stroke="var(${cls})" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 36 36)"/>` : ""}</svg><b>${r0(v)}</b><span>${lbl}${goal ? ` з ${goal}` : ""}</span></div>`;
    };
    const hints = menuToday(date, p.id);
    if (ME.batch) { box.innerHTML = batchBox(); return; }
    let h = `<div class="medate"><button data-me="prev" aria-label="Попередній день">‹</button><b>${date === tk ? "Сьогодні" : WDF[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}</b><button data-me="next" aria-label="Наступний день"${date >= tk ? " disabled" : ""}>›</button></div>
      <div class="card merings">${ring(day.k, goalK, "ккал", "--ink")}${ring(day.p, goalP, "білок, г", "--protein")}
        <div class="mesm"><div><span>Жири</span><b>${r0(day.f)} г</b></div><div><span>Вуглеводи</span><b>${r0(day.c)} г</b></div><div><span>Клітковина</span><b>${r0(day.fib)} / 25 г</b></div><div><span>Залізо</span><b>${r1(day.fe)} / 18 мг</b></div></div></div>
      ${!goalK || !goalP ? `<p class="hint">Цілі на день (ккал і білок) — у «Ще» → люди.</p>` : goalP > day.p && date === tk ? `<p class="hint">До цілі по білку ще <b>${r0(goalP - day.p)} г</b>.</p>` : ""}
      <div class="card stack meadd">
        <label class="mebig">📷 <b>Сфотографувати тарілку</b><span>${ME.imgs.length ? `фото: ${ME.imgs.length} — можна додати ще` : "або кілька фото — все, що з'їла за раз"}</span><input type="file" id="meImg" accept="image/*" capture="environment" multiple hidden></label>
        <label class="btn ghost wide" style="text-align:center">🖼 З галереї — все, що нафотографувала<input type="file" id="meGal" accept="image/*" multiple hidden></label>
        ${ME.thumb ? `<div class="methumbs">${ME.imgs.map(x => `<img src="${x}" alt="">`).join("")}<button class="x" data-me="clrImg" aria-label="Прибрати фото">×</button></div>` : ""}
        <input type="text" id="meT" placeholder="коментар: з'їла половину, ще сир і огірки…" value="${esc(ME.text)}">
        ${hints.length ? `<div><p class="hint" style="margin:0 0 4px">Є щось з меню? Тапни — Gemini візьме КБЖУ з рецепта:</p><div class="chips">${hints.map(rid => `<button class="chip small${ME.hints.includes(rid) ? " on" : ""}" data-me="hint" data-rid="${esc(rid)}">${esc(recipe(rid).title)}</button>`).join("")}</div></div>` : ""}
        <button class="btn green wide" data-me="est"${ME.busy ? " disabled" : ""}>${ME.busy ? "Рахую…" : "Порахувати"}</button>
        <p class="hint">${ME.note ? esc(ME.note) : plate ? `Тарілка ${plate} см — Gemini міряє порції по ній. <button class="linkb" data-me="plate">змінити</button>` : `<button class="linkb" data-me="plate">Вкажи діаметр своєї тарілки</button> — з ним вага порцій точніша.`}</p>
        ${ME.est ? estBox() : ""}
        ${((S.meta.favs || {}).list || []).length ? `<div class="chips">${S.meta.favs.list.slice(0, 12).map((f, i) => `<button class="chip small" data-me="fav" data-i="${i}">+ ${esc(f.t)}</button>`).join("")}</div>` : ""}
      </div>`;
    for (const [m, label] of MEALS) {
      const xs = log.filter(x => x.meal === m); if (!xs.length) continue;
      const n = sumN(xs);
      h += `<div class="group"><h3>${label} <small>${r0(n.k)} ккал · Б ${r0(n.p)}</small></h3><div class="list">${xs.map(x => `<div class="row eatrow tap${ME.open === x.id ? " open" : ""}" data-me="openE" data-id="${esc(x.id)}">${x.img ? `<img class="eimg" src="${x.img}" alt="">` : ""}<span class="nm">${esc(x.t)}<span class="src">${x.g ? `${r0(x.g)} г · ` : ""}${r0(x.k)} ккал · Б ${r0(x.p)} · Ж ${r0(x.f)} · У ${r0(x.c)}${x.fib != null ? ` · Кл ${r0(x.fib)} · Fe ${r1(x.fe || 0)}` : ""}</span></span><button class="x" data-me="del" data-id="${esc(x.id)}" aria-label="Прибрати">×</button></div>
        ${ME.open === x.id && (x.items || []).length ? `<div class="poredit">${x.items.map(it => `<div class="src">${esc(it.name)} · ${r0(it.grams)} г · ${r0(it.k)} ккал · Б ${r0(it.p)}${it.fib != null ? ` · Кл ${r0(it.fib)} г · Fe ${r1(it.fe || 0)} мг` : ""}</div>`).join("")}${x.note ? `<div class="src">💬 ${esc(x.note)}</div>` : ""}</div>` : ""}`).join("")}</div></div>`;
    }
    if (!log.length) h += `<p class="hint" style="margin-top:12px">За цей день ще нічого. Сфотографуй, що їси, — решту порахує Gemini.</p>`;
    const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(tk, -i));
    const ns = days.map(x => sumN(meLog(x, p.id)));
    const mx = Math.max(goalK || 0, ...ns.map(n => n.k), 1), filled = ns.filter(n => n.k > 0);
    h += `<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">Останні 7 днів</h3><div class="mewk">${days.map((x, i) => `<button data-me="day" data-d="${x}" class="${x === date ? "on" : ""}"><i style="height:${Math.round(ns[i].k / mx * 100)}%"></i>${goalK ? `<u style="bottom:${Math.round(goalK / mx * 100)}%"></u>` : ""}<span>${WD[toDate(x).getDay()]}</span></button>`).join("")}</div>
      ${filled.length ? `<p class="hint">У середньому: <b>${r0(filled.reduce((a, n) => a + n.k, 0) / filled.length)} ккал</b> · білок ${r0(filled.reduce((a, n) => a + n.p, 0) / filled.length)} г${goalP ? ` (ціль ${goalP})` : ""}</p>` : ""}</div>`;
    box.innerHTML = h;
  }
  /* ---- кілька прийомів з галереї: фото групуються за часом зйомки (до 40 хв між ними = один прийом) ---- */
  const menuInfo = rids => rids.filter(recipe).map(rid => { const r = recipe(rid), n = nutOf(r); const h = n.per100 || (n.g ? scaleN(n, 100 / n.g) : null); return { title: r.title, per100: h && { k: r0(h.k), p: r0(h.p), f: r0(h.f), c: r0(h.c) }, portionG: r0(n.g || 0) }; });
  const estItems = j => (j.items || []).map(x => ({ name: String(x.name || "?"), grams: +x.grams || 0, k: +x.k || 0, p: +x.p || 0, f: +x.f || 0, c: +x.c || 0, fib: +x.fib || 0, fe: +x.fe || 0 })).filter(x => x.k || x.grams);
  async function entryOf(items, meal, imgs, text) {
    const tot = sumN(items), thumb = imgs[0] ? await shrink(dataToFile(imgs[0], "t.jpg"), 160, 0.7) : "";
    const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t: items.map(x => x.name).join(", "), meal, g: r0(items.reduce((a, x) => a + (+x.grams || 0), 0)) || null, k: r0(tot.k), p: r0(tot.p), f: r0(tot.f), c: r0(tot.c), fib: r1(tot.fib), fe: r1(tot.fe),
      items: items.map(x => ({ name: x.name, grams: r0(x.grams), k: r0(x.k), p: r0(x.p), f: r0(x.f), c: r0(x.c), fib: r1(x.fib), fe: r1(x.fe) })) };
    if (thumb) item.img = thumb;
    if (text.trim()) item.note = text.trim();
    return item;
  }
  async function loadBatch(files) {
    const shots = [];
    for (const f of files.slice(0, 24)) { try { shots.push({ at: await shotTime(f), img: await shrink(f, 1280, 0.82) }); } catch (e) { console.error(e); } }
    shots.sort((a, b) => a.at - b.at);
    const gs = [];
    for (const s of shots) {
      const g = gs[gs.length - 1];
      if (g && s.at - g.last < 40 * 60000 && iso(s.at) === g.date && g.imgs.length < 4) { g.imgs.push(s.img); g.last = s.at; }
      else gs.push({ id: gs.length, at: s.at, last: s.at, date: iso(s.at), meal: mealAt(s.at), imgs: [s.img], text: "", est: null, busy: false, err: "" });
    }
    ME.batch = gs.length ? gs : null;
    if (files.length > 24) toast("Взяла перші 24 фото.");
  }
  function batchBox() {
    const gs = ME.batch, ready = gs.filter(g => g.est).length, todo = gs.filter(g => !g.est).length, busy = gs.some(g => g.busy);
    const day = g => { const d = toDate(g.date); return `${g.date === todayKey() ? "Сьогодні" : WDF[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} · ${String(g.at.getHours()).padStart(2, "0")}:${String(g.at.getMinutes()).padStart(2, "0")}`; };
    return `<div class="medate"><b>З галереї: ${gs.length} ${gs.length === 1 ? "прийом" : gs.length < 5 ? "прийоми" : "прийомів"}</b></div>
      <p class="hint">Фото, зроблені з різницею до 40 хв, — один прийом. День і прийом їжі — за часом зйомки, можна змінити.</p>
      ${gs.map((g, i) => `<div class="card stack meadd">
        <div class="bhead"><b>${day(g)}</b><button class="x" data-me="bX" data-i="${i}" aria-label="Не рахувати">×</button></div>
        <div class="methumbs">${g.imgs.map(x => `<img src="${x}" alt="">`).join("")}</div>
        <div class="pbtns"><input type="date" class="bdate" data-i="${i}" value="${g.date}" max="${todayKey()}"><select class="bmeal" data-i="${i}">${MEALS.map(([m, l]) => `<option value="${m}"${m === g.meal ? " selected" : ""}>${l}</option>`).join("")}</select></div>
        <input type="text" class="btext" data-i="${i}" placeholder="коментар: з'їла половину…" value="${esc(g.text)}">
        ${g.busy ? `<p class="hint">Рахую…</p>` : g.err ? `<p class="hint">${esc(g.err)}</p>` : ""}
        ${g.est ? `<div class="meest">${g.est.map((it, j) => `<div class="estrow"><span class="nm">${esc(it.name)}<span class="src">${r0(it.k)} ккал · Б ${r0(it.p)}</span></span><input type="number" class="bg" data-i="${i}" data-j="${j}" value="${r0(it.grams)}" min="0" step="10" inputmode="numeric" aria-label="Грамів"><span class="hint">г</span><button class="x" data-me="bItX" data-i="${i}" data-j="${j}" aria-label="Прибрати">×</button></div>`).join("")}
          <div class="esttot"><b>Разом: ${r0(sumN(g.est).k)} ккал</b> · Б ${r0(sumN(g.est).p)}</div></div>` : ""}
      </div>`).join("")}
      <div class="card stack meadd">
        ${todo ? `<button class="btn green wide" data-me="bEst"${busy ? " disabled" : ""}>${busy ? "Рахую…" : `Порахувати ${todo === gs.length ? "все" : `решту (${todo})`}`}</button>` : ""}
        ${ready ? `<button class="btn wide" data-me="bSave"${busy ? " disabled" : ""}>Зберегти пораховане (${ready})</button>` : ""}
        <button class="btn ghost wide" data-me="bCancel"${busy ? " disabled" : ""}>Скасувати</button>
      </div>`;
  }
  function estBox() {
    const e = ME.est, tot = sumN(e.items);
    return `<div class="meest">
      ${e.items.map((it, i) => `<div class="estrow"><span class="nm">${esc(it.name)}<span class="src">${r0(it.k)} ккал · Б ${r0(it.p)} · Ж ${r0(it.f)} · У ${r0(it.c)} · Кл ${r0(it.fib)} · Fe ${r1(it.fe)}</span></span><input type="number" class="estg" data-i="${i}" value="${r0(it.grams)}" min="0" step="10" inputmode="numeric" aria-label="Грамів"><span class="hint">г</span><button class="x" data-me="estX" data-i="${i}" aria-label="Прибрати">×</button></div>`).join("")}
      <div class="esttot"><b>Разом: ${r0(tot.k)} ккал</b> · Б ${r0(tot.p)} · Ж ${r0(tot.f)} · У ${r0(tot.c)} · клітковина ${r0(tot.fib)} г · залізо ${r1(tot.fe)} мг</div>
      <div class="pbtns"><select id="meM">${MEALS.map(([m, l]) => `<option value="${m}"${m === (ME.meal || nowMeal()) ? " selected" : ""}>${l}</option>`).join("")}</select><button class="btn" data-me="add">Зберегти</button></div>
      <label class="chk"><input type="checkbox" id="meFav"> зберегти в «часті»</label>
    </div>`;
  }
  $("#meBox").addEventListener("change", async ev => {
    if (ev.target.id === "meImg") {
      const files = [...ev.target.files].slice(0, 4 - ME.imgs.length);
      for (const f of files) { try { ME.imgs.push(await shrink(f, 1280, 0.82)); } catch (e) { console.error(e); } }
      ME.thumb = ME.imgs.length ? "1" : ""; ME.text = ($("#meT") || {}).value || ME.text; renderMe();
    }
    if (ev.target.id === "meGal") {
      const files = [...ev.target.files]; if (!files.length) return;
      $("#meBox").innerHTML = `<p class="hint" style="margin-top:12px">Читаю фото (${files.length})…</p>`;
      await loadBatch(files); renderMe(); return;
    }
    const g = ME.batch && ME.batch[+ev.target.dataset.i];
    if (g && ev.target.classList.contains("bdate") && ev.target.value) { g.date = ev.target.value; renderMe(); }
    if (g && ev.target.classList.contains("bmeal")) g.meal = ev.target.value;
    if (g && ev.target.classList.contains("btext")) g.text = ev.target.value;
    if (g && ev.target.classList.contains("bg") && g.est) {
      const it = g.est[+ev.target.dataset.j], gr = +ev.target.value;
      if (it && gr >= 0 && it.grams > 0) { const k = gr / it.grams; Object.assign(it, { grams: gr, k: it.k * k, p: it.p * k, f: it.f * k, c: it.c * k, fib: it.fib * k, fe: it.fe * k }); }
      renderMe();
    }
    if (ev.target.classList.contains("estg") && ME.est) {
      const it = ME.est.items[+ev.target.dataset.i], g = +ev.target.value;
      if (it && g >= 0 && it.grams > 0) { const k = g / it.grams; Object.assign(it, { grams: g, k: it.k * k, p: it.p * k, f: it.f * k, c: it.c * k, fib: it.fib * k, fe: it.fe * k }); }
      renderMe();
    }
  });
  $("#meBox").addEventListener("click", async ev => {
    const b = ev.target.closest("[data-me]"); if (!b) return;
    const act = b.dataset.me, p = meP(), tk = todayKey();
    if ($("#meT")) ME.text = $("#meT").value;
    if ($("#meM")) ME.meal = $("#meM").value;
    if (ME.batch) document.querySelectorAll("#meBox .btext").forEach(x => { const g = ME.batch[+x.dataset.i]; if (g) g.text = x.value; });
    if (act === "bCancel") { ME.batch = null; renderMe(); return; }
    if (act === "bX") { ME.batch.splice(+b.dataset.i, 1); if (!ME.batch.length) ME.batch = null; renderMe(); return; }
    if (act === "bItX") { const g = ME.batch[+b.dataset.i]; g.est.splice(+b.dataset.j, 1); if (!g.est.length) g.est = null; renderMe(); return; }
    if (act === "bEst") {
      if (!window.AI || !window.AI.estimatePlate) { toast("Gemini ще не підключений (Ще → Ключ Gemini)."); return; }
      for (const g of ME.batch.filter(x => !x.est)) {
        g.busy = true; g.err = ""; renderMe();
        try {
          const rids = ((slotOf(g.date, g.meal) || {}).dishes || []).filter(d => (d.who || []).includes(p.id)).map(d => d.rid);
          const j = await window.AI.estimatePlate({ text: g.text, images: g.imgs.map((x, i) => dataToFile(x, `plate${i}.jpg`)), plateCm: +p.plate || 0, menu: menuInfo(rids) });
          g.est = estItems(j); if (!g.est.length) { g.est = null; g.err = "Gemini не розпізнав їжу — додай коментар і порахуй ще раз."; }
        } catch (e) { console.error(e); g.err = e && e.userMessage || "Не вийшло порахувати. Спробуй ще раз."; }
        g.busy = false; if (!ME.batch) return; renderMe();
        if (/Ліміт|бюджет|баланс|оплат/i.test(g.err)) break;
      }
      return;
    }
    if (act === "bSave") {
      const done = ME.batch.filter(g => g.est); let n = 0;
      for (const g of done) {
        const item = await entryOf(g.est, g.meal, g.imgs, g.text);
        if (await meWrite(g.date, p.id, d => { d.extra.push(item); })) { n++; ME.batch = ME.batch.filter(x => x !== g); }
      }
      if (!ME.batch.length) ME.batch = null;
      toast(`Записала: ${n}`); renderMe(); return;
    }
    if (act === "prev") { ME.day = addDays(ME.day, -1); renderMe(); return; }
    if (act === "next") { if (ME.day < tk) ME.day = addDays(ME.day, 1); renderMe(); return; }
    if (act === "day") { ME.day = b.dataset.d; renderMe(); return; }
    if (act === "hint") { const r = b.dataset.rid; ME.hints = ME.hints.includes(r) ? ME.hints.filter(x => x !== r) : [...ME.hints, r]; renderMe(); return; }
    if (act === "clrImg") { ME.imgs = []; ME.thumb = ""; renderMe(); return; }
    if (act === "openE") { if (ev.target.closest("[data-me=del]")) return; ME.open = ME.open === b.dataset.id ? null : b.dataset.id; renderMe(); return; }
    if (act === "del") { meWrite(ME.day, p.id, d => { d.extra = d.extra.filter(e => e.id !== b.dataset.id); }); return; }
    if (act === "plate") {
      const v = prompt("Діаметр твоєї звичайної тарілки, см (виміряй рулеткою по краю):", p.plate || "26");
      if (v === null) return; const cm = +String(v).replace(",", ".");
      if (!(cm > 10 && cm < 40)) { toast("Напиши число від 10 до 40."); return; }
      const list = S.people.map(x => x.id === p.id ? { ...x, plate: cm } : x);
      await save(() => Store.set("settings", "people", { list })); toast(`Тарілка ${cm} см`); return;
    }
    if (act === "estX" && ME.est) { ME.est.items.splice(+b.dataset.i, 1); if (!ME.est.items.length) ME.est = null; renderMe(); return; }
    if (act === "fav") {
      const f = ((S.meta.favs || {}).list || [])[+b.dataset.i]; if (!f) return;
      await meWrite(ME.day, p.id, d => { d.extra.push({ id: Date.now().toString(36), t: f.t, meal: nowMeal(), g: f.g || null, k: f.k, p: f.p, f: f.f, c: f.c, ...(f.fib != null ? { fib: f.fib, fe: f.fe } : {}) }); });
      toast(`Додала: ${f.t}`); return;
    }
    if (act === "est") {
      const text = ME.text.trim();
      if (!text && !ME.imgs.length) { toast("Сфотографуй тарілку або напиши, що з'їла."); return; }
      if (!window.AI || !window.AI.estimatePlate) { ME.note = "Gemini ще не підключений (Ще → Ключ Gemini)."; renderMe(); return; }
      ME.busy = true; ME.est = null; ME.note = ""; renderMe();
      try {
        const menu = ME.hints.map(rid => { const r = recipe(rid), n = nutOf(r); const h = n.per100 || (n.g ? scaleN(n, 100 / n.g) : null); return { title: r.title, per100: h && { k: r0(h.k), p: r0(h.p), f: r0(h.f), c: r0(h.c) }, portionG: r0(n.g || 0) }; });
        const j = await window.AI.estimatePlate({ text, images: ME.imgs.map((x, i) => dataToFile(x, `plate${i}.jpg`)), plateCm: +p.plate || 0, menu });
        const items = (j.items || []).map(x => ({ name: String(x.name || "?"), grams: +x.grams || 0, k: +x.k || 0, p: +x.p || 0, f: +x.f || 0, c: +x.c || 0, fib: +x.fib || 0, fe: +x.fe || 0 })).filter(x => x.k || x.grams);
        if (!items.length) throw Object.assign(new Error("empty"), { userMessage: "Gemini не розпізнав їжу. Додай коментар словами." });
        ME.est = { items }; ME.note = j.note ? `Gemini: ${j.note}` : "";
      } catch (e) { console.error(e); ME.note = e && e.userMessage || "Не вийшло порахувати. Спробуй ще раз."; }
      ME.busy = false; renderMe(); return;
    }
    if (act === "add" && ME.est) {
      const items = ME.est.items, tot = sumN(items), meal = $("#meM").value, fav = $("#meFav").checked;
      const t = items.map(x => x.name).join(", ");
      const thumb = ME.imgs[0] ? await shrink(dataToFile(ME.imgs[0], "t.jpg"), 160, 0.7) : "";
      const item = { id: Date.now().toString(36), t, meal, g: r0(items.reduce((a, x) => a + (+x.grams || 0), 0)) || null, k: r0(tot.k), p: r0(tot.p), f: r0(tot.f), c: r0(tot.c), fib: r1(tot.fib), fe: r1(tot.fe),
        items: items.map(x => ({ name: x.name, grams: r0(x.grams), k: r0(x.k), p: r0(x.p), f: r0(x.f), c: r0(x.c), fib: r1(x.fib), fe: r1(x.fe) })) };
      if (thumb) item.img = thumb;
      if (ME.text.trim()) item.note = ME.text.trim();
      const ok = await meWrite(ME.day, p.id, d => { d.extra.push(item); });
      if (ok && fav) {
        const list = ((S.meta.favs || {}).list || []).filter(f => f.t !== t);
        list.unshift({ t, g: item.g, k: item.k, p: item.p, f: item.f, c: item.c, fib: item.fib, fe: item.fe });
        await save(() => Store.set("meta", "favs", { list: list.slice(0, 30) }));
      }
      if (ok) { Object.assign(ME, { est: null, text: "", imgs: [], thumb: "", hints: [], note: "", meal: null }); toast("Записала"); renderMe(); }
    }
  });

  /* ---------- Скласти меню з Gemini ---------- */
  let MP = null;
  function firstFreeDay() { let d = addDays(todayKey(), 1); for (let i = 0; i < 30 && S.slots.some(s => s.date === d); i++) d = addDays(d, 1); return d; }
  function openPlan() {
    MP = MP || { start: firstFreeDay(), days: 7, text: "", res: null, busy: false, note: "" };
    drawPlan();
  }
  function planPrompt(start, days, text) {
    const people = S.people.map(x => `${x.id} = ${x.name} (порція ×${N(+x.w || 1)})`).join("; ");
    const tl = tryList();
    const line = r => { const n = nutOf(r); return `${r.id}|${r.title}|${r.simple ? "простий гарнір/додаток" : catOf(r)}|${GROUPS[r.group] || "страва"}|${(r.tags || []).join(",")}|${r0(n.k)} ккал, Б ${r0(n.p)}${r.time && r.time.total ? `|${r.time.total} хв` : ""}${r.src ? "|книга" : ""}${tl.includes(r.id) ? "|ХОЧУ СПРОБУВАТИ" : ""}`; };
    const stock = S.items.filter(i => i.home && !i.need).map(i => i.name).join(", ");
    const dates = Array.from({ length: days }, (_, i) => { const d = addDays(start, i); return `${d} (${WDF[toDate(d).getDay()]})`; }).join(", ");
    const recent = S.slots.filter(s => s.date >= addDays(start, -7) && s.date < start).flatMap(s => (s.dishes || []).map(d => recipe(d.rid)?.title)).filter(Boolean);
    const before = S.slots.filter(s => s.date === addDays(start, -1)).flatMap(s => (s.dishes || []).filter(d => !d.left).map(d => `${s.meal}: ${recipe(d.rid)?.title} (${d.rid})`));
    return `Склади меню для родини на дні: ${dates}.
Прийоми їжі: b — сніданок, l — обід, d — вечеря, x — перекус/десерт. Люди (id для поля who): ${people}.

Про родину (обов'язково дотримуйся):
${S.profile || "—"}

Правила складання:
- Використовуй ТІЛЬКИ рецепти зі списку нижче (поле rid — точний id). Прості гарніри/додатки теж зі списку.
- Насамперед — те, що є в холодильнику (фото й текст) і в запасах, щоб нічого не зіпсувалось.
- Додай 2–3 НОВІ страви на тиждень: спершу з позначкою «ХОЧУ СПРОБУВАТИ», далі з книги. Не повторюй страви з минулого тижня, якщо можна.
- Готуй раз — їж двічі: велику страву на вечерю став ще на обід наступного дня з "left": true.
- У будні на готування ввечері не більше 40 хв активної роботи; складніше — на вихідні.
- Сніданок Надії щодня має яєчні білки + 1 яйце (рецепт з білками або «Омлет з білків + 1 яйце»). Миколі сніданок — його кайзерка; обід він зазвичай пропускає. Петрові обід щодня, без еритритолу.
- Кожна людина отримує збалансовану миску: білок + гарнір/база + овочі.
- В "shop" — лише те, чого, судячи з фото/запасів, найімовірніше нема і що треба для цього меню; коротко, з кількістю.

Що вже є в запасах: ${stock || "—"}.
Минулого тижня їли: ${[...new Set(recent)].join(", ") || "—"}.
Учора готували (можуть бути залишки): ${before.join("; ") || "—"}.
Побажання й що в холодильнику словами: ${text || "—"}

Поверни ТІЛЬКИ JSON:
{"slots":[{"date":"YYYY-MM-DD","meal":"b|l|d|x","dishes":[{"rid":"...","who":["me","dad","kid"],"left":false}]}],"shop":[{"name":"Курячі стегенця","amount":"1 кг"}],"note":"2–3 речення: що використала з холодильника і що нового"}

Рецепти (id|назва|категорія|група|теги|КБЖУ на порцію|час):
${S.recipes.map(line).join("\n")}`;
  }
  function drawPlan() {
    const m = MP, end = addDays(m.start, m.days - 1);
    const clash = S.slots.filter(s => s.date >= m.start && s.date <= end).length;
    let h = `<div class="shhead"><button class="btn ghost small" data-act="close">← Назад</button><h2>Скласти меню</h2></div>
      <div class="card stack" style="gap:10px">
        <div class="person" style="grid-template-columns:1fr 1fr"><label class="fl">З якого дня<input type="date" id="mpStart" value="${m.start}"></label><label class="fl">Скільки днів<select id="mpDays">${[3, 4, 5, 7].map(n => `<option${n === m.days ? " selected" : ""}>${n}</option>`).join("")}</select></label></div>
        <label class="fl">Фото холодильника, полиць (можна кілька)<input type="file" id="mpImg" accept="image/*" multiple></label>
        <label class="fl">Що є, що треба доїсти, побажання<textarea id="mpText" rows="3" placeholder="напр.: є фарш і броколі, хочу щось з книги, у суботу гості">${esc(m.text)}</textarea></label>
        ${clash ? `<p class="hint">⚠ На ці дні вже є ${clash} прийомів їжі — після підтвердження вони заміняться.</p>` : ""}
        <button class="btn green wide" data-act="mpGo"${m.busy ? " disabled" : ""}>${m.busy ? "Складаю… (до хвилини)" : "✨ Скласти"}</button>
        ${m.note ? `<p class="hint">${esc(m.note)}</p>` : ""}
      </div>`;
    if (m.res) {
      const byDay = {};
      for (const sl of m.res.slots) (byDay[sl.date] = byDay[sl.date] || []).push(sl);
      h += `<div class="stack" style="gap:10px;margin-top:12px">${Object.keys(byDay).sort().map(d => `<div class="card"><h3 style="margin:0 0 6px">${WDF[toDate(d).getDay()]}, ${toDate(d).getDate()} ${MON[toDate(d).getMonth()]}</h3>${MEALS.filter(([mm]) => byDay[d].some(x => x.meal === mm)).map(([mm, label]) => `<div class="mprow"><b>${label}</b><span>${byDay[d].find(x => x.meal === mm).dishes.map(x => `${esc(recipe(x.rid).title)}${x.left ? " ↻" : ""} <small>${esc(S.people.filter(pp => x.who.includes(pp.id)).map(pp => pp.short || pp.name[0]).join(""))}</small>`).join(" · ")}</span></div>`).join("")}</div>`).join("")}
        ${m.res.shop.length ? `<div class="card"><h3 style="margin:0 0 6px">Докупити</h3><div class="ing" id="mpShop">${m.res.shop.map((x, i) => `<label><input type="checkbox" data-n="${i}" checked><span style="flex:1">${esc(x.name)}</span><span class="q">${esc(x.amount || "")}</span></label>`).join("")}</div></div>` : ""}
        <div class="pbtns"><button class="btn" data-act="mpSave">Записати в меню</button><button class="btn ghost" data-act="mpGo">Ще варіант</button></div>
      </div>`;
    }
    openSheet(h);
  }
  async function runPlan() {
    const m = MP;
    m.start = $("#mpStart").value || m.start; m.days = +$("#mpDays").value || 7; m.text = $("#mpText").value.trim();
    const images = [...$("#mpImg").files].slice(0, 4);
    if (!window.AI || !window.AI.planMenu) { m.note = "Gemini ще не підключений (Ще → Ключ Gemini)."; drawPlan(); return; }
    m.busy = true; m.note = ""; m.res = null; drawPlan();
    try {
      const j = await window.AI.planMenu({ prompt: planPrompt(m.start, m.days, m.text), images });
      const end = addDays(m.start, m.days - 1), ids = S.people.map(x => x.id);
      const slots = (j.slots || []).filter(sl => sl.date >= m.start && sl.date <= end && MEALS.some(([mm]) => mm === sl.meal)).map(sl => ({
        date: sl.date, meal: sl.meal,
        dishes: (sl.dishes || []).filter(d => recipe(d.rid)).map(d => ({ rid: d.rid, who: (d.who || []).filter(w => ids.includes(w)), ...(d.left ? { left: true } : {}) })).filter(d => d.who.length)
      })).filter(sl => sl.dishes.length);
      if (!slots.length) throw Object.assign(new Error("empty"), { userMessage: "Gemini повернув порожнє меню. Спробуй ще раз." });
      m.res = { slots, shop: (j.shop || []).filter(x => x && x.name).map(x => ({ name: cap(String(x.name)), amount: String(x.amount || "") })) };
      m.note = j.note || "";
    } catch (e) { console.error(e); m.note = e && e.userMessage || "Не вийшло скласти меню. Спробуй ще раз."; }
    m.busy = false;
    if (MP === m && !$("#sheet").hidden) drawPlan();
  }
  async function savePlan() {
    const m = MP; if (!m || !m.res) return;
    const end = addDays(m.start, m.days - 1);
    for (const sl of S.slots.filter(s => s.date >= m.start && s.date <= end)) await save(() => Store.del("slots", sl.id));
    for (const sl of m.res.slots) await save(() => Store.set("slots", `${sl.date}_${sl.meal}`, sl));
    const picked = [...document.querySelectorAll("#mpShop input:checked")].map(i => m.res.shop[+i.dataset.n]);
    for (const x of picked) await addToList(x.name, x.amount);
    S.day = m.start; S.weekStart = sundayOf(m.start);
    MP = null; closeSheet(); go("menu"); renderSub(); renderMenu(); renderPrep();
    toast(`Меню записане${picked.length ? `, у покупки: ${picked.length}` : ""}`);
  }
  $("#planMake").onclick = () => openPlan();

  renderTags();
  (async () => {
    await Store.init();
    Store.sub("items", d => { S.items = d; renderBuy(); });
    Store.sub("recipes", d => { S.recipes = d; nutCache = new Map(); renderTags(); renderRecipes(); renderMenu(); renderMe(); });
    Store.sub("slots", d => { S.slots = d; renderMenu(); renderPrep(); renderMe(); });
    Store.sub("meta", d => {
      S.meta = Object.fromEntries(d.map(x => [x.id, x]));
      if (!S.weekStart) {
        const tk = todayKey(), st = (S.meta.week || {}).start;
        // показуємо тиждень, де є сьогодні; але якщо меню складене наперед — його
        S.weekStart = st && tk < addDays(st, 7) && tk >= addDays(st, -6) ? (tk >= st ? sundayOf(tk) : st) : sundayOf(tk);
        if (st && tk < st && tk >= addDays(st, -6)) S.weekStart = st;
      }
      renderSub(); renderMenu(); renderPrep();
      if (JSON.stringify(tryList()) !== S._try) { S._try = JSON.stringify(tryList()); renderTags(); renderRecipes(); }
      if (EAT && !$("#sheet").hidden && !EAT.form) drawEat();
      if (!ME.busy && !ME.est && !["meT"].includes(document.activeElement?.id)) renderMe();
    });
    Store.sub("settings", d => {
      const p = d.find(x => x.id === "people"); if (p && Array.isArray(p.list)) S.people = p.list;
      S.profile = (d.find(x => x.id === "profile") || {}).text || "";
      S.aiKey = (d.find(x => x.id === "ai") || {}).geminiKey || "";
      if (!ME.busy) renderMe();
      renderMenu(); if (!document.activeElement || !["profileText", "aiKey"].includes(document.activeElement.id)) renderMore();
    });
    let t = null; try { t = localStorage.getItem("kitchen-tab"); } catch (e) {}
    go(TABS.includes(t) ? t : "menu");
    handleShare();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  })();
})();
