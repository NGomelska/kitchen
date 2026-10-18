"""Збирає розібрані сторінки книг (backups/books/out) у рецепти застосунку.
Результат: backups/books/import.json — {id: рецепт}. Фото вкладаються як data:image/jpeg;base64.
Продовження рецептів на наступній сторінці дописуються до попереднього рецепта.
Запуск: python tools/build_import.py"""
import base64, json, re
from pathlib import Path

OUT = Path(r"D:/Personal projects claude/kitchen-app/backups/books/out")
DEST = Path(r"D:/Personal projects claude/kitchen-app/backups/books/import.json")
AUTHOR = "Маковецький"
CATS = ["Сніданки", "Супи", "М'ясні страви", "Рибні страви", "Гарніри", "Салати й овочі", "Закуски", "Дитячі страви", "ПП-десерти", "Десерти", "Випічка", "Соуси", "Інше"]
GROUPS = ["protein", "base", "veg", "sauce", "sweet", "dish"]
TAGS = ["Сім'я", "Для мене", "Син їсть", "Десерт", "Швидко"]
UNITS = {"г", "кг", "мл", "л", "шт", "ст.л.", "ч.л.", "пучок"}
SLUG = {"Сніданки": "snid", "Обіди": "obid", "Вечері": "vech", "Випічка і десерти": "vyp", "Смузі": "smuz", "Піца": "pica", "Гранола, топінги, морозиво": "gran"}


def num(v):
    try:
        return float(str(v).replace(",", "."))
    except Exception:
        return None


def ing(i):
    q = i.get("qty"); q = num(q) if q not in (None, "") else None
    u = str(i.get("unit") or "").strip().lower().replace(" ", "")
    u = {"гр": "г", "шт.": "шт", "стл": "ст.л.", "ст.л": "ст.л.", "чл": "ч.л.", "ч.л": "ч.л."}.get(u, u)
    if q is None: u = ""
    elif u not in UNITS: u = "шт" if not u else u
    name = str(i.get("name") or "").strip()
    return {"qty": q, "unit": u, "name": name[:1].upper() + name[1:]} if name else None


def main():
    out, last = {}, None
    for bdir in sorted(p for p in OUT.iterdir() if p.is_dir()):
        book = bdir.name; slug = SLUG.get(book, re.sub(r"\W+", "", book)[:6])
        for jf in sorted(bdir.glob("*.json")):
            d = json.loads(jf.read_text(encoding="utf-8"))
            cont = d.get("continuation")
            if cont and last:
                last["ingredients"] += [x for x in (ing(i) for i in cont.get("ingredients", []) or []) if x]
                last["steps"] += [str(s) for s in cont.get("steps", []) or []]
            for k, r in enumerate(d.get("recipes", []) or []):
                title = str(r.get("title") or "").strip()
                if not title: continue
                rid = f"mk-{slug}-{d.get('page', 0):03d}-{k}"
                serv = num(r.get("servings")) or 1
                rec = {
                    "title": title, "src": f"{AUTHOR} · {book}",
                    "cat": r.get("cat") if r.get("cat") in CATS else "Інше",
                    "group": r.get("group") if r.get("group") in GROUPS else "dish",
                    "tags": [t for t in r.get("tags", []) or [] if t in TAGS],
                    "servings": serv,
                    "ingredients": [x for x in (ing(i) for i in r.get("ingredients", []) or []) if x],
                    "steps": [re.sub(r"^\s*\d+[.)]\s*", "", str(s)).strip() for s in r.get("steps", []) or [] if str(s).strip()],
                    "prep": [p for p in r.get("prep", []) or [] if isinstance(p, dict) and p.get("t")],
                    "tip": "", "link": "", "thumb": "", "simple": False,
                    "time": {"total": int(num(r.get("time")) or 0), "active": None} if num(r.get("time")) else None,
                    "createdAt": 1792300000000, "updatedAt": 1792300000000,
                }
                k_, p_, f_, c_ = (num(r.get(x)) for x in ("kcal", "p", "f", "c"))
                if k_:
                    vals = {"k": k_, "p": p_ or 0, "f": f_ or 0, "c": c_ or 0}
                    if r.get("per") == "100g":
                        rec["n100"] = vals
                        if num(r.get("portion_g")): rec["portionG"] = num(r.get("portion_g"))
                    else:
                        rec["nutr"] = vals  # на порцію
                pf = r.get("photo_file")
                if pf and (bdir / pf).exists():
                    rec["photo"] = "data:image/jpeg;base64," + base64.b64encode((bdir / pf).read_bytes()).decode()
                out[rid] = rec
                last = rec if r.get("continues") else None
    DEST.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    by = {}
    for r in out.values(): by[r["src"]] = by.get(r["src"], 0) + 1
    print(f"Рецептів: {len(out)}  ({DEST.stat().st_size // 1024} КБ)")
    for k, v in by.items(): print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
