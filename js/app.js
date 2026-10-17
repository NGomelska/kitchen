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
  const RCATS = ["Сніданки", "М'ясні страви", "Рибні страви", "Гарніри", "Салати й овочі", "Закуски", "Супи", "ПП-десерти", "Десерти", "Випічка", "Соуси", "Інше"];
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
  const TABS = ["buy", "menu", "rec", "more"];
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
    tag: "all", rcat: "all", q: "", pantryEdit: false,
    weekStart: null, day: null, viewP: "me", profile: ""
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
    document.querySelectorAll("[data-tab]").forEach(s => s.hidden = s.dataset.tab !== tab);
    document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.go === tab));
    try { localStorage.setItem("kitchen-tab", tab); } catch (e) {}
    renderSub();
    window.scrollTo(0, 0);
  }
  const curTab = () => document.querySelector("nav.tabs button[aria-selected=true]")?.dataset.go || "menu";
  document.querySelectorAll("nav.tabs button").forEach(b => b.onclick = () => go(b.dataset.go));

  function renderSub() {
    if (curTab() !== "menu" || !S.weekStart) { $("#sub").textContent = ""; return; }
    const a = toDate(S.weekStart), b = toDate(addDays(S.weekStart, 6));
    const txt = a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MON[b.getMonth()]}` : `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]}`;
    $("#sub").innerHTML = `<button data-wk="-1" aria-label="Попередній тиждень">‹</button><span>${txt}</span><button data-wk="1" aria-label="Наступний тиждень">›</button>`;
  }
  $("#sub").addEventListener("click", ev => {
    const b = ev.target.closest("[data-wk]"); if (!b) return;
    S.weekStart = addDays(S.weekStart, 7 * +b.dataset.wk);
    S.day = S.weekStart;
    renderSub(); renderMenu();
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
    const bIds = new Set(bought.map(i => i.id));
    const pantry = S.items.filter(i => !i.need && i.staple && !bIds.has(i.id));
    const stale = S.items.some(i => !i.need && !i.staple);
    $("#cBuy").textContent = need.length || "";
    let h = `<div class="secthead" style="margin-top:6px"><h2>Треба купити <span class="n">${need.length || ""}</span></h2></div>`;
    if (!need.length) h += `<p class="empty">Усе куплено. Що закінчиться — натисни нижче в «Є вдома».</p>`;
    for (const [cat, arr] of groupByCat(need)) {
      h += `<div class="group" style="margin-bottom:12px"><h3>${esc(cat)}</h3><div class="list">`;
      for (const i of arr) h += `<div class="row" data-id="${esc(i.id)}"><button class="tick" data-act="buy" aria-label="Куплено: ${esc(i.name)}"><span></span></button><span class="nm">${esc(i.name)}</span>${i.amount ? `<span class="pill amt">${esc(i.amount)}</span>` : ""}<button class="x" data-act="del" aria-label="Прибрати ${esc(i.name)}">×</button></div>`;
      h += `</div></div>`;
    }
    if (bought.length) {
      h += `<div class="secthead"><h2>Куплено</h2>${stale ? '<button class="btn ghost small" data-act="clear">Прибрати разові</button>' : ""}</div><div class="list">`;
      for (const i of bought) h += `<div class="row done" data-id="${esc(i.id)}"><button class="tick" data-act="unbuy" aria-label="Повернути: ${esc(i.name)}"><span></span></button><span class="nm">${esc(i.name)}</span></div>`;
      h += `</div><p class="hint" style="margin-top:6px">Помилково відмітили? Натисни ще раз — продукт повернеться в список.</p>`;
    }
    h += `<div class="secthead"><h2>Є вдома</h2>${pantry.length ? `<button class="btn ghost small" data-act="pedit">${S.pantryEdit ? "Готово" : "Редагувати"}</button>` : ""}</div>`;
    h += `<p class="hint" style="margin-bottom:10px">${S.pantryEdit ? "Натисни ×, щоб прибрати продукт з постійних." : "Натисни на продукт, коли він закінчився, — він перейде в «Треба купити»."}</p>`;
    if (!pantry.length) h += `<p class="empty">Постійні продукти з'являться тут після покупки.</p>`;
    for (const [cat, arr] of groupByCat(pantry)) {
      h += `<div class="group" style="margin-bottom:12px"><h3>${esc(cat)}</h3><div class="chips">`;
      for (const i of arr) h += S.pantryEdit
        ? `<span class="chip" data-id="${esc(i.id)}">${esc(i.name)} <button class="x" style="width:28px;height:28px" data-act="pdel" aria-label="Прибрати ${esc(i.name)}">×</button></span>`
        : `<button class="chip" data-id="${esc(i.id)}" data-act="want"><span class="plus">+</span>${esc(i.name)}</button>`;
      h += `</div></div>`;
    }
    $("#buyList").innerHTML = h;
  }
  $("#buyList").addEventListener("click", async ev => {
    const b = ev.target.closest("[data-act]"); if (!b) return;
    const act = b.dataset.act, id = b.closest("[data-id]")?.dataset.id, it = id && S.items.find(i => i.id === id);
    if (act === "pedit") { S.pantryEdit = !S.pantryEdit; renderBuy(); return; }
    if (act === "clear") { for (const i of S.items.filter(i => !i.need && !i.staple)) await save(() => Store.del("items", i.id)); return; }
    if (!it) return;
    if (act === "buy") save(() => Store.update("items", id, { need: false, boughtAt: Date.now() }));
    else if (act === "unbuy") save(() => Store.update("items", id, { need: true, boughtAt: null }));
    else if (act === "want") save(() => Store.update("items", id, { need: true, boughtAt: null, addedAt: Date.now(), amount: "" }));
    else if (act === "del") save(() => it.staple ? Store.update("items", id, { need: false, amount: "" }) : Store.del("items", id));
    else if (act === "pdel") save(() => Store.del("items", id));
  });
  async function addToList(name, amount) {
    const ex = sameItem(name);
    if (ex) return save(() => Store.update("items", ex.id, { need: true, boughtAt: null, addedAt: Date.now(), amount: amount || ex.amount || "" }));
    return save(() => Store.set("items", Store.newId("i"), { name, cat: guessCat(name), staple: false, need: true, amount: amount || "", boughtAt: null, addedAt: Date.now() }));
  }

  /* ---------- меню-конструктор ---------- */
  function slotNut(slot, pid) {
    let n = Nutrition.zero(), g = 0; const w = +(person(pid) || {}).w || 1;
    for (const d of slot ? slot.dishes || [] : []) {
      if (!(d.who || []).includes(pid)) continue;
      const r = recipe(d.rid); if (r) { const x = nutOf(r); n = Nutrition.add(n, x, w); g += (x.g || 0) * w; }
    }
    n.g = g;
    return n;
  }
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
    let day = Nutrition.zero();
    for (const [m] of MEALS) day = Nutrition.add(day, slotNut(slotOf(S.day, m), p.id));
    const goalP = +p.goalP || 0, goalK = +p.goalK || 0;
    $("#totals").innerHTML = `<div class="card totals">
      <div class="who"><span class="hint" style="flex:1">КБЖУ за ${WDA[toDate(S.day).getDay()]}, тарілка:</span>${S.people.map(x => `<button class="av big${x.id === p.id ? "" : " off"}" data-vp="${esc(x.id)}" aria-label="${esc(x.name)}">${esc(x.short || x.name[0])}</button>`).join("")}</div>
      <div class="macros"><div><b>${r0(day.k)}</b><span>ккал</span></div><div><b>${r0(day.p)}</b><span>білки</span></div><div><b>${r0(day.f)}</b><span>жири</span></div><div><b>${r0(day.c)}</b><span>вуглев.</span></div></div>
      ${goalP ? `<div><div class="hint" style="margin-bottom:4px">Білок: ${r0(day.p)} з ${goalP} г</div><div class="bar"><i style="width:${Math.min(100, day.p / goalP * 100)}%"></i></div></div>` : ""}
      ${goalK ? `<div class="hint">Калорії: ${r0(day.k)} з ${goalK}</div>` : ""}
    </div>`;

    $("#meals").innerHTML = MEALS.map(([m, label]) => {
      const sl = slotOf(S.day, m), dishes = sl ? sl.dishes || [] : [];
      const n = slotNut(sl, p.id);
      const chips = dishes.map(d => {
        const r = recipe(d.rid); if (!r) return "";
        const who = S.people.filter(x => (d.who || []).includes(x.id)).map(x => x.short || x.name[0]).join("");
        return `<span class="dchip"><i class="sw g-${GROUPS[r.group] ? r.group : "dish"}"></i><span class="t">${esc(r.title)}</span><span class="w">${esc(who)}</span></span>`;
      }).join("");
      return `<button class="meal" data-meal="${m}">${bowl(groupsOf(dishes), 64)}<span class="body"><span class="lbl">${label}</span>${dishes.length ? `<span class="chips" style="gap:5px">${chips}</span>${n.k ? `<span class="nut">${esc(p.name)}: тарілка ≈${r0(n.g)} г · ${Nutrition.line(n)}</span>` : ""}` : `<span class="hint">Тапни, щоб зібрати миску</span>`}</span><span class="plusc">+</span></button>`;
    }).join("");

    const kid = (S.meta.week || {}).kid;
    $("#kidNote").innerHTML = kid ? `<details class="note"><summary>Обід сина: від пюре до звичайної їжі</summary><p>${esc(kid)}</p></details>` : "";
    const rows = Portions.aggregate(S.slots.filter(s => dates.includes(s.date)), recipeById(), S.people).filter(r => r.qty != null);
    $("#calcSub").textContent = rows.length ? `${rows.length} продуктів на цей тиждень` : "спершу збери миски";
  }
  $("#week").addEventListener("click", ev => { const b = ev.target.closest("[data-day]"); if (!b) return; S.day = b.dataset.day; renderMenu(); });
  $("#totals").addEventListener("click", ev => { const b = ev.target.closest("[data-vp]"); if (!b) return; S.viewP = b.dataset.vp; renderMenu(); });
  $("#meals").addEventListener("click", ev => { const b = ev.target.closest("[data-meal]"); if (b) openPicker(S.day, b.dataset.meal); });

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
      return `<button class="dish${sel.has(r.id) ? " sel" : ""}" data-act="pkT" data-rid="${esc(r.id)}">${bowl([GROUPS[r.group] ? r.group : "dish"], 36)}<span class="nm">${esc(r.title)}</span><span class="nut">${n.per100 ? `100 г: ${r0(n.per100.k)} ккал · Б ${r0(n.per100.p)}` : n.k ? `${r0(n.k)} ккал · Б ${r0(n.p)} на порцію` : ""}</span></button>`;
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
      return `<div class="prow"><span class="dchip"><i class="sw g-${GROUPS[r.group] ? r.group : "dish"}"></i><span class="t">${esc(r.title)}</span></span><span class="avs">${S.people.map(x => `<button class="av${(d.who || []).includes(x.id) ? "" : " off"}" data-act="pkW" data-i="${i}" data-p="${esc(x.id)}" aria-label="${esc(x.name)}">${esc(x.short || x.name[0])}</button>`).join("")}<button class="x" style="width:28px;height:28px" data-act="pkX" data-i="${i}" aria-label="Прибрати">×</button></span></div>`;
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
      for (const d of dishes) if (!merged.some(x => x.rid === d.rid)) merged.push(structuredClone(d));
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
          const m = sameItem(r.name), home = m && m.staple && !m.need, shelf = home && m.cat === "Бакалія";
          return `<label><input type="checkbox" data-n="${n}" ${r.qty != null && !shelf ? "checked" : ""}><span style="flex:1">${esc(cap(r.name))}<span class="src">${shelf ? "є вдома · " : home ? "є вдома, перевір кількість · " : ""}для: ${esc(r.from.join(", "))}</span></span><span class="q">${esc(r.label)}</span></label>`;
        }).join("")}</div>
        <button class="btn green wide" data-act="planAdd">Додати відмічене в покупки</button>
      </div>`);
    $("#sheet").dataset.plan = JSON.stringify(rows.map(r => ({ name: r.name, label: r.qty != null ? r.label : "" })));
  };

  /* ---------- рецепти ---------- */
  function renderTags() {
    const full = S.recipes.filter(r => !r.simple), cnt = c => full.filter(r => catOf(r) === c).length;
    const cats = RCATS.filter(c => cnt(c));
    $("#recCats").innerHTML = [["all", `Усі ${full.length}`], ...cats.map(c => [c, `${c} ${cnt(c)}`]), ["simple", "Прості страви"]].map(([v, l]) => `<button class="gbtn${S.rcat === v ? " on" : ""}" data-rcat="${esc(v)}">${esc(l)}</button>`).join("");
    $("#recTags").innerHTML = [["all", "Для всіх"], ...TAGS.map(t => [t, t])].map(([v, l]) => `<button class="chip small${S.tag === v ? " on" : ""}" data-tag="${esc(v)}">${esc(l)}</button>`).join("");
  }
  $("#recCats").onclick = ev => { const b = ev.target.closest("[data-rcat]"); if (!b) return; S.rcat = b.dataset.rcat; renderTags(); renderRecipes(); };
  $("#recTags").onclick = ev => { const b = ev.target.closest("[data-tag]"); if (!b) return; S.tag = b.dataset.tag; renderTags(); renderRecipes(); };
  $("#recSearch").oninput = ev => { S.q = ev.target.value.trim().toLowerCase(); renderRecipes(); };
  function renderRecipes() {
    let arr = S.recipes.slice().sort((a, b) => String(a.title).localeCompare(String(b.title), "uk"));
    if (S.rcat === "simple") arr = arr.filter(r => r.simple);
    else { arr = arr.filter(r => !r.simple); if (S.rcat !== "all") arr = arr.filter(r => catOf(r) === S.rcat); }
    if (S.tag !== "all") arr = arr.filter(r => (r.tags || []).includes(S.tag));
    if (S.q) arr = arr.filter(r => (r.title + " " + (r.ingredients || []).map(i => i.name).join(" ")).toLowerCase().includes(S.q));
    const el = $("#recList");
    if (!S.recipes.length) { el.innerHTML = `<p class="empty">Поки порожньо. Натисни «+ Рецепт».</p>`; return; }
    if (!arr.length) { el.innerHTML = `<p class="empty">Нічого не знайшла. Спробуй інше слово чи тег.</p>`; return; }
    const card = r => {
      const n = nutOf(r);
      return `<button class="rec" data-id="${esc(r.id)}">${r.thumb ? `<img class="th" src="${esc(r.thumb)}" alt="">` : `<span class="th">${bowl([GROUPS[r.group] ? r.group : "dish"], 60)}</span>`}<span class="meta"><span class="t">${esc(r.title)}</span><span class="nut">${n.per100 ? `на 100 г: ${Nutrition.line(n.per100)}` : n.k ? `на порцію: ${Nutrition.line(n)}` : ""}</span><span class="tags">${(r.tags || []).map(t => `<span class="pill">${esc(t)}</span>`).join("")}</span></span></button>`;
    };
    // «Усі» — розкладено по категоріях з заголовками
    if (S.rcat === "all" && !S.q) {
      el.innerHTML = RCATS.map(c => { const a = arr.filter(r => catOf(r) === c); return a.length ? `<h3 style="margin-top:8px">${esc(c)}</h3>${a.map(card).join("")}` : ""; }).join("");
    } else el.innerHTML = arr.map(card).join("");
  }
  $("#recList").onclick = ev => { const b = ev.target.closest(".rec"); if (b) openRecipe(b.dataset.id); };
  $("#recNew").onclick = () => openForm(null);

  function openSheet(html) { $("#sheetBody").innerHTML = html; $("#sheet").hidden = false; $("#sheet").scrollTop = 0; document.body.style.overflow = "hidden"; }
  function closeSheet() { $("#sheet").hidden = true; $("#sheetBody").innerHTML = ""; document.body.style.overflow = ""; delete $("#sheet").dataset.plan; P = null; }

  let view = { id: null, por: 0 };
  function scaled(g, k) {
    const u = Portions.normUnit(g.unit), q = +g.qty * k;
    if (u === "кг") return [q * 1000, "г"];
    if (u === "л") return [q * 1000, "мл"];
    return [q, u];
  }
  function openRecipe(id, por) {
    const r = recipe(id); if (!r) return;
    const base = +r.servings || 1;
    view = { id, por: por || base };
    const k = view.por / base, n = nutOf(r);
    const link = safeUrl(r.link);
    openSheet(`<div class="shhead"><button class="btn ghost small" data-act="close">← Назад</button><button class="btn ghost small" data-act="edit">Редагувати</button></div>
    <div class="stack" data-rid="${esc(r.id)}">
      <h2 style="font-size:2rem">${esc(r.title)}</h2>
      <div class="tags"><span class="pill">${esc(catOf(r))}</span><span class="pill"><i class="sw g-${GROUPS[r.group] ? r.group : "dish"}"></i> ${esc(GROUPS[r.group] || "Ціла страва")}</span>${(r.tags || []).map(t => `<span class="pill">${esc(t)}</span>`).join("")}</div>
      ${r.thumb ? `<img class="bigimg" src="${esc(r.thumb)}" alt="Фото рецепта">` : ""}
      ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">Відкрити оригінал ↗</a>` : ""}
      <div class="card stack" style="gap:8px">${n.per100 ? `<h3>КБЖУ на 100 г</h3>
        <div class="nutbox"><div><b>${r0(n.per100.k)}</b><span>ккал</span></div><div><b>${r0(n.per100.p)}</b><span>білки</span></div><div><b>${r0(n.per100.f)}</b><span>жири</span></div><div><b>${r0(n.per100.c)}</b><span>вуглев.</span></div></div>
        <p class="hint"><b>1 порція ≈ ${r0(n.g)} г:</b> ${Nutrition.line(n)}${r.simple ? " (вага сирого продукту)" : ""}</p>` : `<h3>КБЖУ на 1 порцію</h3>
        <div class="nutbox"><div><b>${r0(n.k)}</b><span>ккал</span></div><div><b>${r0(n.p)}</b><span>білки</span></div><div><b>${r0(n.f)}</b><span>жири</span></div><div><b>${r0(n.c)}</b><span>вуглев.</span></div></div>`}
        ${n.missing.length ? `<p class="hint">Без даних для: ${esc(n.missing.join(", "))} — цифри неповні. Можна вписати КБЖУ вручну в «Редагувати».</p>` : `<p class="hint">Приблизно, ±15 %. Вага — сирих продуктів; готова страва легша, тож на 100 г готової трохи більше калорій. Порція тата ×${N(+(person("dad") || {}).w || 1)}, сина ×${N(+(person("kid") || {}).w || 1)}.</p>`}
      </div>
      ${r.tip ? `<div class="tip"><b>Порада:</b> ${esc(r.tip)}</div>` : ""}
      ${(r.ingredients || []).length ? `<div class="card">
        <div class="servings" style="margin-bottom:8px"><h3 style="flex:1">Інгредієнти</h3><span class="stepper"><button data-act="pminus" aria-label="Менше порцій">−</button><span>${N(view.por)}</span><button data-act="pplus" aria-label="Більше порцій">+</button></span><span class="hint">порц.</span></div>
        <p class="hint" style="margin-bottom:4px">Відміть, чого нема вдома, і додай у покупки.</p>
        <div class="ing">${r.ingredients.map((g, i) => `<label><input type="checkbox" data-n="${i}"><span style="flex:1">${esc(g.name)}</span><span class="q">${g.qty == null ? "за смаком" : esc(Portions.fmt(...scaled(g, k)))}</span></label>`).join("")}</div>
        <button class="btn wide" style="margin-top:10px" data-act="tolist">Додати відмічене в покупки</button>
      </div>` : ""}
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

  /* форма рецепта */
  let F = null;
  function openForm(r, prefill) {
    F = { id: r ? r.id : null, thumb: r ? r.thumb || "" : "", files: [], tags: new Set(r ? r.tags || [] : []) };
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
      <label class="fl">Категорія<select id="fCat">${RCATS.map(c => `<option${c === (r ? catOf(r) : (prefill && prefill.cat) || "Інше") ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
      <label class="fl">Що це в мисці<select id="fGroup">${GKEYS.map(k => `<option value="${k}"${k === ((r && r.group) || "dish") ? " selected" : ""}>${GROUPS[k]}</option>`).join("")}</select></label>
      <div class="group"><span class="fl">Для кого</span><div class="chips" id="fTags"></div></div>
      <label class="fl">На скільки порцій рецепт<input type="number" id="fServ" min="0.5" step="0.5" value="${esc(r ? r.servings || 4 : 4)}"></label>
      <label class="fl">Інгредієнти <span class="hint">Кожен з нового рядка: «700 г фарш з індички», «2 шт яйця», «сіль — за смаком»</span><textarea id="fIng" rows="7">${esc(ingText)}</textarea></label>
      <label class="fl">Як готувати <span class="hint">Кожен крок з нового рядка</span><textarea id="fSteps" rows="6">${esc(r ? (r.steps || []).join("\n") : "")}</textarea></label>
      <label class="fl">Порада для мене / для сина<textarea id="fTip" rows="3">${esc(r ? r.tip || "" : "")}</textarea></label>
      <div class="group"><span class="fl">КБЖУ на порцію вручну <span class="hint">Необов'язково: якщо заповнити, застосунок не рахуватиме сам</span></span>
        <div class="nutbox"><input type="number" id="nK" placeholder="ккал" value="${esc(nu.k ?? "")}"><input type="number" id="nP" placeholder="Б" value="${esc(nu.p ?? "")}"><input type="number" id="nF" placeholder="Ж" value="${esc(nu.f ?? "")}"><input type="number" id="nC" placeholder="У" value="${esc(nu.c ?? "")}"></div></div>
      <button class="btn" type="button" id="fSave">Зберегти рецепт</button>
    </div>`);
    drawFormTags(); drawThumbs();
    $("#fImg").onchange = async () => {
      const fs = [...$("#fImg").files]; $("#fImg").value = "";
      F.files.push(...fs);
      if (!F.thumb && fs[0]) F.thumb = await makeThumb(fs[0]);
      drawThumbs();
    };
    $("#fTags").onclick = ev => { const b = ev.target.closest("[data-tag]"); if (!b) return; const t = b.dataset.tag; F.tags.has(t) ? F.tags.delete(t) : F.tags.add(t); drawFormTags(); };
    $("#fParse").onclick = parseRecipe;
    $("#fSave").onclick = saveRecipe;
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
      steps: lines($("#fSteps").value), tip: $("#fTip").value.trim(), link: $("#fLink").value.trim(),
      thumb: F.thumb || "", simple: !!(old && old.simple), updatedAt: Date.now(),
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
        <h2>Мета на день</h2>
        <p class="hint">Необов'язково. Якщо вписати, у меню з'явиться смужка «скільки білку вже є». Цілі краще звірити з лікарем.</p>
        ${S.people.map(p => `<div class="group"><b>${esc(p.name)}</b><div class="person" style="grid-template-columns:1fr 1fr"><input type="number" min="0" step="5" placeholder="білок, г" data-pf="goalP" data-pid="${esc(p.id)}" value="${esc(p.goalP || "")}" aria-label="Білок на день: ${esc(p.name)}"><input type="number" min="0" step="50" placeholder="ккал" data-pf="goalK" data-pid="${esc(p.id)}" value="${esc(p.goalK || "")}" aria-label="Калорії на день: ${esc(p.name)}"></div></div>`).join("")}
      </div>
      <div class="card stack">
        <h2>Про родину для Gemini</h2>
        <p class="hint">Що враховувати, коли Gemini розбирає рецепт: ваші потреби, що їсть дитина. Зберігається тільки в закритих даних родини.</p>
        <textarea id="profileText" rows="5" placeholder="Напр.: мені — більше білку, мало цукру; син їсть кускус, макарони, котлети…">${esc(S.profile)}</textarea>
      </div>
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
  renderTags();
  (async () => {
    await Store.init();
    Store.sub("items", d => { S.items = d; renderBuy(); });
    Store.sub("recipes", d => { S.recipes = d; nutCache = new Map(); renderTags(); renderRecipes(); renderMenu(); });
    Store.sub("slots", d => { S.slots = d; renderMenu(); });
    Store.sub("meta", d => {
      S.meta = Object.fromEntries(d.map(x => [x.id, x]));
      if (!S.weekStart) {
        const tk = todayKey(), st = (S.meta.week || {}).start;
        // показуємо тиждень, де є сьогодні; але якщо меню складене наперед — його
        S.weekStart = st && tk < addDays(st, 7) && tk >= addDays(st, -6) ? (tk >= st ? sundayOf(tk) : st) : sundayOf(tk);
        if (st && tk < st && tk >= addDays(st, -6)) S.weekStart = st;
      }
      renderSub(); renderMenu();
    });
    Store.sub("settings", d => {
      const p = d.find(x => x.id === "people"); if (p && Array.isArray(p.list)) S.people = p.list;
      S.profile = (d.find(x => x.id === "profile") || {}).text || "";
      renderMenu(); if (!document.activeElement || document.activeElement.id !== "profileText") renderMore();
    });
    let t = null; try { t = localStorage.getItem("kitchen-tab"); } catch (e) {}
    go(TABS.includes(t) ? t : "menu");
    handleShare();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  })();
})();
