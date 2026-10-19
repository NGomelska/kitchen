"""Адаптує рецепти з книг під словацькі супермаркети: складні інгредієнти → доступні заміни
(оригінал лишається поруч), і словацька назва для кожного інгредієнта.
Вхід: backups/books/import.json. Кеш по пачках: backups/books/sk/<n>.json. Результат: backups/books/sk_patch.json.
Запуск: GEMINI_KEY=... python tools/adapt_sk.py"""
import json, os, re, sys, time, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(r"D:/Personal projects claude/kitchen-app/backups/books")
SRC, CACHE, DEST = ROOT / "import.json", ROOT / "sk", ROOT / "sk_patch.json"
URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent"
BATCH = 10

PROMPT = """Ти адаптуєш рецепти для родини в Братиславі (Словаччина). Купують у звичайних магазинах: Lidl, Kaufland, Billa, Tesco, dm.
Для кожного рецепта нижче пройди ВСІ інгредієнти по порядку:
- Якщо інгредієнт важко купити у звичайному словацькому супермаркеті (наприклад: темпе, маш, кінза, цільнозерновий бейгл, рідкісні борошна, сиропи, екзотичні соуси, спеції, яких нема в Lidl/Kaufland) — заміни на доступний аналог, який не зіпсує страву. "name" — заміна українською, "orig" — оригінальна назва.
- Звичайні продукти (курка, яйця, сир, крупи, овочі, йогурт, тофу, соєвий соус, авокадо тощо) не міняй і "orig" не пиши.
- Для КОЖНОГО інгредієнта дай "sk" — як він називається на полиці у Словаччині (наприклад: tvaroh, kuracie prsia, celozrnná kaiserka, petržlenová vňať).
- Кількості не повертай і не міняй. Кількість і порядок елементів "ing" — точно як в оригіналі.
- Якщо щось замінив і кроки згадують оригінал — поверни "steps" з заміною (той самий текст, тільки замінені назви). Якщо замін нема — "steps" не пиши.
Поверни ТІЛЬКИ JSON: {"<id>": {"ing": [{"name": "...", "sk": "...", "orig": "..."}], "steps": ["..."]}}

Рецепти:
"""


def ask(key, text):
    body = json.dumps({"contents": [{"role": "user", "parts": [{"text": text}]}], "generationConfig": {"responseMimeType": "application/json"}}).encode()
    for attempt in range(6):
        req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json", "x-goog-api-key": key})
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                d = json.loads(r.read())
            return "".join(p.get("text", "") for p in d["candidates"][0]["content"]["parts"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="ignore")[:300]
            if e.code in (402, 403):
                sys.exit(f"Баланс/ліміт Gemini: {msg}")
            if e.code in (429, 500, 503):
                time.sleep(15 * (attempt + 1)); continue
            raise RuntimeError(f"HTTP {e.code}: {msg}")
        except (urllib.error.URLError, TimeoutError):
            time.sleep(10 * (attempt + 1))
    raise RuntimeError("Gemini не відповідає")


def main():
    key = os.environ.get("GEMINI_KEY", "").strip() or sys.exit("Немає GEMINI_KEY")
    recs = json.loads(SRC.read_text(encoding="utf-8"))
    ids = sorted(recs)
    CACHE.mkdir(parents=True, exist_ok=True)
    for n in range(0, len(ids), BATCH):
        cf = CACHE / f"{n // BATCH:03d}.json"
        if cf.exists():
            continue
        chunk = ids[n:n + BATCH]
        text = PROMPT + "\n\n".join(
            f"id: {i}\nназва: {recs[i]['title']}\nінгредієнти: " + "; ".join(g["name"] for g in recs[i]["ingredients"]) + "\nкроки: " + " | ".join(recs[i]["steps"])
            for i in chunk)
        try:
            raw = ask(key, text)
            res = json.loads(re.search(r"\{[\s\S]*\}", raw).group(0))
        except SystemExit:
            raise
        except Exception as e:
            print(f"  пачка {n // BATCH}: помилка {e}", flush=True); continue
        cf.write_text(json.dumps(res, ensure_ascii=False), encoding="utf-8")
        swaps = sum(1 for v in res.values() for g in v.get("ing", []) if g.get("orig"))
        print(f"  пачка {n // BATCH + 1}/{(len(ids) + BATCH - 1) // BATCH}: замін {swaps}", flush=True)
        time.sleep(1)
    # збірка патча
    patch, bad = {}, 0
    for cf in sorted(CACHE.glob("*.json")):
        for rid, v in json.loads(cf.read_text(encoding="utf-8")).items():
            r = recs.get(rid)
            if not r: continue
            ing = v.get("ing") or []
            if len(ing) != len(r["ingredients"]):
                bad += 1; continue
            new = []
            for g, a in zip(r["ingredients"], ing):
                x = dict(g)
                if a.get("orig") and a.get("name"):
                    x["name"] = a["name"][:1].upper() + a["name"][1:]; x["orig"] = a["orig"]
                if a.get("sk"): x["sk"] = a["sk"]
                new.append(x)
            p = {"ingredients": new}
            if any(g.get("orig") for g in new) and v.get("steps") and len(v["steps"]) == len(r["steps"]):
                p["steps"] = v["steps"]
            patch[rid] = p
    DEST.write_text(json.dumps(patch, ensure_ascii=False), encoding="utf-8")
    sw = sum(1 for p in patch.values() if any(g.get("orig") for g in p["ingredients"]))
    print(f"Готово: {len(patch)} рецептів, з замінами {sw}, не зійшлось за кількістю {bad}")


if __name__ == "__main__":
    main()
