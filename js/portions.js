/* Порції й кількості: скільки купувати під заготовки на тиждень.
   Чисті функції без інтерфейсу — їх використовує app.js. */
const Portions = (() => {
  const UNIT = {
    "г": "г", "гр": "г", "g": "г", "кг": "кг", "kg": "кг",
    "мл": "мл", "ml": "мл", "л": "л", "l": "л",
    "шт": "шт", "шт.": "шт", "pcs": "шт", "банка": "шт", "банки": "шт", "банок": "шт",
    "ст.л.": "ст.л.", "ст. л.": "ст.л.", "ст.л": "ст.л.", "ч.л.": "ч.л.", "ч. л.": "ч.л.", "ч.л": "ч.л.",
    "уп": "уп.", "уп.": "уп.", "пучок": "пучок", "пучки": "пучок"
  };
  const normUnit = u => { const k = String(u || "").trim().toLowerCase(); return UNIT[k] ?? k; };

  /* одна назва для однакових продуктів: «Яйце» і «яйця» складаються разом */
  const SYN = { "яйце": "яйця", "цибулина": "цибуля", "цукіні": "цукіні", "кабачок": "цукіні", "кабачки": "цукіні" };
  const canon = name => { const n = String(name || "").trim().toLowerCase().replace(/\s+/g, " "); return SYN[n] || n; };

  const toBase = (qty, unit) => {
    const u = normUnit(unit);
    if (u === "кг") return [qty * 1000, "г"];
    if (u === "л") return [qty * 1000, "мл"];
    return [qty, u];
  };

  const familyWeight = (people, who) =>
    people.filter(p => (who || []).includes(p.id)).reduce((s, p) => s + (+p.w || 0), 0);
  const cookPortions = (cook, people) => (+cook.times || 0) * familyWeight(people, cook.who);
  const scaleFor = (cook, recipe, people) => cookPortions(cook, people) / (+recipe.servings || 1);

  const num = v => String(Math.round(v * 10) / 10).replace(".", ",");
  const roundUp = (x, step) => Math.ceil(x / step - 1e-9) * step;

  /* кількість так, як її зручно купувати */
  function fmt(q, u) {
    if (q == null) return "за смаком";
    if (u === "г" || u === "мл") {
      if (q >= 1000) return `≈${num(roundUp(q / 1000, 0.1))} ${u === "г" ? "кг" : "л"}`;
      return `≈${roundUp(q, q < 100 ? 10 : 50)} ${u}`;
    }
    if (u === "шт" || u === "уп." || u === "пучок") return `${Math.ceil(q - 1e-9)} ${u}`;
    if (u === "ст.л." || u === "ч.л.") return `${num(Math.round(q * 2) / 2)} ${u}`;
    return `${num(q)} ${u}`.trim();
  }

  /* Складає інгредієнти всіх страв тижня в список покупок.
     slots: [{dishes:[{rid, who:[...]}]}] — кожна страва в кожному прийомі їжі × хто її їсть */
  function aggregate(slots, recipesById, people) {
    const uses = [];
    for (const s of slots) for (const d of s.dishes || []) uses.push({ recipeId: d.rid, times: 1, who: d.who });
    const map = new Map();
    for (const c of uses) {
      const r = recipesById[c.recipeId];
      if (!r) continue;
      const k = scaleFor(c, r, people);
      if (!(k > 0)) continue;
      for (const ing of r.ingredients || []) {
        const has = ing.qty !== null && ing.qty !== "" && ing.qty !== undefined && !isNaN(+ing.qty);
        const [q, u] = has ? toBase(+ing.qty * k, ing.unit) : [null, ""];
        const key = canon(ing.name) + "|" + (has ? u : "?");
        if (!map.has(key)) map.set(key, { name: ing.name, key: canon(ing.name), qty: has ? 0 : null, unit: u, from: new Set() });
        const e = map.get(key);
        if (has) e.qty += q;
        e.from.add(r.title);
      }
    }
    return [...map.values()]
      .map(e => ({ ...e, from: [...e.from], label: fmt(e.qty, e.unit) }))
      .sort((a, b) => (a.qty == null) - (b.qty == null) || a.name.localeCompare(b.name, "uk"));
  }

  /* «700 г фаршу з індички» → {qty:700, unit:"г", name:"фаршу з індички"} */
  const FR = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
  const UNIT_RE = "(кг|гр|г|мл|л|шт\\.?|ст\\.\\s?л\\.?|ч\\.\\s?л\\.?|уп\\.?|банк[аи]?|банок|пучок)(?![а-яіїєґa-z])";
  function parseLine(s) {
    let t = String(s || "").replace(/^[\s•\-–—*]+/, "").trim();
    if (!t) return null;
    // «Фарш — 700 г» / «Фарш: 700 г»
    let m = new RegExp("^(.+?)\\s*[-–—:]\\s*([\\d.,½¼¾⅓⅔/]+)\\s*" + UNIT_RE + "?\\.?\\s*$", "i").exec(t);
    if (m) return { name: m[1].trim(), qty: toNum(m[2]), unit: normUnit((m[3] || "").replace(/\s/g, "")) || "шт" };
    m = new RegExp("^([\\d.,½¼¾⅓⅔/]+)\\s*" + UNIT_RE + "?\\.?\\s+(.+)$", "i").exec(t);
    if (m) return { name: m[3].trim(), qty: toNum(m[1]), unit: normUnit((m[2] || "").replace(/\s/g, "")) || "шт" };
    return { name: t.replace(/\s*[-–—:]?\s*за смаком\s*$/i, "").trim(), qty: null, unit: "" };
  }
  function toNum(s) {
    s = String(s).trim();
    if (FR[s] != null) return FR[s];
    if (/^\d+\/\d+$/.test(s)) { const [a, b] = s.split("/"); return +a / +b; }
    const range = /^([\d.,]+)\s*[-–]\s*([\d.,]+)$/.exec(s);
    if (range) return +range[2].replace(",", ".");
    return +s.replace(",", ".");
  }
  const lineOf = i => i.qty == null ? `${i.name} — за смаком` : `${num(i.qty)} ${i.unit} ${i.name}`.replace(/\s+/g, " ");

  return { normUnit, canon, familyWeight, cookPortions, scaleFor, aggregate, fmt, num, parseLine, lineOf };
})();
