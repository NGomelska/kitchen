/* КБЖУ: калорії, білки, жири, вуглеводи.
   Значення на 100 г — усереднені з довідників, точність ±10–15 %. Для сирих продуктів (крупи — сухі).
   Якщо продукту нема в таблиці, страва покаже «без даних для: …», і цифри будуть неповні. */
const Nutrition = (() => {
  // [шаблон назви, ккал, Б, Ж, У, г в 1 шт, г в 1 ст.л.]
  const T = [
    [/яєчн\S* біл|білки яєчн/, 52, 11, 0.2, 0.7, null, 15],
    [/^яйц|^яйце/, 143, 12.6, 9.5, 0.7, 55, null],
    [/фарш\S* з індич|індич/, 160, 19, 9, 0, null, null],
    [/куряч\S* стегн|стегенц/, 150, 19, 8, 0, 110, null],
    [/куряч\S* філе|курк|курят/, 110, 23, 1.5, 0, 200, null],
    [/ялович/, 200, 19, 14, 0, null, null],
    [/свинин/, 240, 17, 19, 0, null, null],
    [/червон\S* риб|слабосол/, 200, 22, 12, 0, null, null],
    [/лосос|сьомг/, 200, 20, 13, 0, null, null],
    [/тунец|тунц/, 110, 25, 1, 0, 120, null],
    [/сосиск/, 260, 11, 23, 1.5, 50, null],
    [/кисломолочн|творог|сир кисломол/, 140, 17, 7, 3, null, 25],
    [/грецьк\S* йогурт|йогурт/, 75, 10, 2, 4, null, 25],
    [/твердий сир|^сир$|сир твердий|пармезан|моцарел/, 350, 25, 27, 0, null, 10],
    [/вершк(?!ов)/, 118, 3, 10, 4, null, 15],
    [/вершков\S* масл/, 748, 0.5, 82, 0.8, null, 15],
    [/молок/, 52, 3, 2.5, 4.8, null, 15],
    [/хумус/, 250, 7.5, 18, 14, null, 25],
    [/тортиль/, 300, 8, 7, 50, 60, null],
    [/хліб/, 250, 8, 3, 48, 30, null],
    [/сухар/, 395, 13, 5, 72, null, 10],
    [/вівсян\S* борошн/, 370, 13, 6.5, 60, null, 10],
    [/рисов\S* борошн/, 366, 6, 1.4, 80, null, 10],
    [/кукурудз\S* борошн/, 350, 7, 2, 75, null, 10],
    [/борошн/, 340, 10, 1.2, 70, null, 10],
    [/манк/, 333, 10.3, 1, 70, null, 12],
    [/шинк/, 110, 17, 4, 1, null, null],
    [/креветк/, 85, 20, 0.5, 0, null, null],
    [/гарбуз/, 45, 1, 0.1, 12, null, null],
    [/селер/, 42, 1.5, 0.3, 9, 150, null],
    [/пастернак/, 75, 1.2, 0.3, 18, 120, null],
    [/пекінськ/, 16, 1.2, 0.2, 3, null, null],
    [/редис/, 16, 0.7, 0.1, 3.4, 15, null],
    [/кефір/, 50, 3, 2.5, 4, null, 15],
    [/^мед|мед$|^мед /, 330, 0.3, 0, 82, null, 21],
    [/вода/, 0, 0, 0, 0, null, 15],
    [/соєв\S* соус|соус соєв/, 53, 8, 0.6, 5, null, 15],
    [/вівсян|пластівц/, 370, 13, 6.5, 60, null, 8],
    [/кускус/, 360, 12.8, 0.6, 72, null, 15],
    [/макарон|спагет|паста(?! томат)/, 350, 12, 1.5, 71, null, null],
    [/рис/, 350, 7, 0.6, 78, null, 15],
    [/греч/, 340, 12.6, 3.3, 64, null, 15],
    [/булгур/, 342, 12, 1.3, 68, null, 15],
    [/картопля фрі|фрі/, 150, 2.5, 5, 24, null, null],
    [/картопл/, 77, 2, 0.1, 17, 150, null],
    [/баклаж/, 25, 1, 0.2, 6, 350, null],
    [/цукіні|кабач/, 17, 1.2, 0.3, 3.1, 300, null],
    [/порей/, 61, 1.5, 0.3, 14, 150, null],
    [/цибул/, 40, 1.1, 0.1, 9, 100, null],
    [/часник/, 149, 6.4, 0.5, 33, 5, null],
    [/морк/, 41, 0.9, 0.2, 10, 80, null],
    [/помідор|томат(?!н)/, 18, 0.9, 0.2, 3.9, 120, null],
    [/огір/, 15, 0.7, 0.1, 3.6, 120, null],
    [/брокол/, 34, 2.8, 0.4, 7, null, null],
    [/цвітн\S* капуст/, 25, 1.9, 0.3, 5, null, null],
    [/салат/, 15, 1.4, 0.2, 2.9, null, null],
    [/зелен|кріп|петруш/, 40, 3, 0.5, 7, null, 4],
    [/горош/, 80, 5.4, 0.4, 14, null, 15],
    [/томатн\S* пасат|пасат/, 30, 1.4, 0.2, 5.5, null, 15],
    [/томатн\S* паст/, 82, 4.3, 0.5, 19, null, 20],
    [/кетчуп/, 40, 1.5, 0.2, 7, null, 15],
    [/солодк\S* гірчиц/, 140, 5, 4, 20, null, 15],
    [/гірчиц/, 66, 4, 4, 5, null, 15],
    [/олив\S* олі|олі[яї]/, 884, 0, 100, 0, null, 14],
    [/оливк|маслин/, 115, 0.8, 11, 6, 4, null],
    [/в'ялен|вялен/, 213, 5, 14, 23, null, 15],
    [/горіх/, 620, 18, 55, 15, null, 10],
    [/чіа/, 486, 17, 31, 42, null, 12],
    [/ягод|ягід/, 45, 0.8, 0.4, 9, null, 15],
    [/яблук/, 52, 0.3, 0.2, 14, 180, null],
    [/банан/, 89, 1.1, 0.3, 23, 120, null],
    [/еритрит|ванілін|оцет|сіль|перець|паприк|коріандр|спеці|кориц/, 0, 0, 0, 0, null, 5]
  ].map(([re, k, p, f, c, pc, tb]) => ({ re, k, p, f, c, pc, tb }));

  const canon = s => String(s || "").toLowerCase().replace(/[’`]/g, "'").trim();
  const find = name => T.find(e => e.re.test(canon(name))) || null;

  /* скільки грамів у рядку інгредієнта; null — не знаємо */
  function grams(ing, e) {
    if (ing.qty == null || ing.qty === "" || isNaN(+ing.qty)) return 0; // «за смаком»
    const q = +ing.qty, u = Portions.normUnit(ing.unit);
    if (u === "г" || u === "мл") return q;
    if (u === "кг" || u === "л") return q * 1000;
    if (u === "шт") return e && e.pc ? q * e.pc : null;
    if (u === "ст.л.") return q * (e && e.tb || 15);
    if (u === "ч.л.") return q * (e && e.tb || 15) / 3;
    if (u === "пучок") return q * 30;
    return null;
  }

  /* Вага після готування. Крупи й макарони при варінні вбирають воду, м'ясо й овочі в духовці
     чи аерогрилі втрачають. Коефіцієнти усереднені з кулінарних таблиць. */
  const GRAIN = [[/рис/, 3], [/греч/, 2.7], [/макарон|спагет/, 2.2], [/кускус/, 2.5], [/булгур/, 2.5], [/кіноа/, 2.8], [/пшон/, 3]];
  const MEATY = /куряч|курк|стегн|філе|фарш|індич|ялович|свинин|лосос|риб|тунц|тунец|сосиск|шинк|котлет/;
  const VEGGY = /баклаж|цукін|кабач|картопл|морк|цибул|брокол|капуст|помід|перец|гриб|порей|буряк/;
  function method(r) {
    const t = [r.title, ...(r.steps || []), ...(r.prep || []).map(p => p.t)].join(" ").toLowerCase();
    if (/запік|запек|духовк|аерогрил|смаж|обсмаж|гриль|печ[еи]/.test(t)) return "dry";
    if (/звари|варит|відвар|окроп|на пару|тушк|туши/.test(t)) return "boil";
    // прості гарніри (рис, гречка) рахуємо вареними
    if (r.simple && (r.ingredients || []).some(i => GRAIN.some(([re]) => re.test(String(i.name).toLowerCase())))) return "boil";
    return "raw";
  }
  function cookFactor(name, m, r) {
    const n = String(name || "").toLowerCase();
    const gr = GRAIN.find(([re]) => re.test(n));
    if (gr && (m === "boil" || r.simple)) return gr[1];
    if (m === "dry") return MEATY.test(n) ? 0.72 : VEGGY.test(n) ? 0.8 : 0.9;
    if (m === "boil") return MEATY.test(n) ? 0.8 : 1;
    return 1;
  }

  /* КБЖУ рецепта: на 1 порцію і на 100 г ГОТОВОЇ страви.
     Якщо готову страву зважили (cookedG — вага всієї страви), беремо цю вагу. */
  function perPortion(recipe) {
    const sum = { k: 0, p: 0, f: 0, c: 0 }, missing = [];
    let rawG = 0, cookG = 0;
    const s = +recipe.servings || 1, m = method(recipe);
    for (const ing of recipe.ingredients || []) {
      const e = find(ing.name);
      const g = grams(ing, e);
      if (g === 0) continue;
      if (g != null) { rawG += g; cookG += g * cookFactor(ing.name, m, recipe); }
      if (!e || g == null) { missing.push(ing.name); continue; }
      sum.k += e.k * g / 100; sum.p += e.p * g / 100; sum.f += e.f * g / 100; sum.c += e.c * g / 100;
    }
    const weighed = +recipe.cookedG > 0;
    if (weighed) cookG = +recipe.cookedG;
    // КБЖУ з книги на 100 г: беремо його, а порцію рахуємо за вагою
    if (recipe.n100) {
      const h = { k: +recipe.n100.k || 0, p: +recipe.n100.p || 0, f: +recipe.n100.f || 0, c: +recipe.n100.c || 0 };
      const pg = +recipe.portionG || (cookG / s) || 100;
      return { ...scale(h, pg / 100), g: pg, gRaw: rawG / s, per100: h, per100raw: null, yieldPct: rawG > 0 ? Math.round(pg * s / rawG * 100) : 100, method: "book", missing: [] };
    }
    const base = recipe.nutr
      ? { k: (+recipe.nutr.k || 0) * s, p: (+recipe.nutr.p || 0) * s, f: (+recipe.nutr.f || 0) * s, c: (+recipe.nutr.c || 0) * s }
      : sum;
    return {
      ...scale(base, 1 / s),
      g: cookG / s, gRaw: rawG / s,
      per100: cookG > 0 ? scale(base, 100 / cookG) : null,
      per100raw: rawG > 0 ? scale(base, 100 / rawG) : null,
      yieldPct: rawG > 0 ? Math.round(cookG / rawG * 100) : 100,
      method: weighed ? "weighed" : m,
      missing: recipe.nutr ? [] : missing
    };
  }
  const scale = (n, m) => ({ k: n.k * m, p: n.p * m, f: n.f * m, c: n.c * m });

  const add = (a, b, m = 1) => ({ k: a.k + b.k * m, p: a.p + b.p * m, f: a.f + b.f * m, c: a.c + b.c * m });
  const zero = () => ({ k: 0, p: 0, f: 0, c: 0 });
  const r0 = v => Math.round(v);
  const line = n => `${r0(n.k)} ккал · Б ${r0(n.p)} · Ж ${r0(n.f)} · У ${r0(n.c)}`;

  return { find, grams, perPortion, add, zero, line };
})();
