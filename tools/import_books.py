"""Імпорт книг рецептів (PDF) у формат застосунку «Кухня».

Кожна сторінка → Gemini (ключ з змінної середовища GEMINI_KEY) → JSON рецептів.
Результати кешуються по сторінках у backups/books/out/<книга>/<сторінка>.json,
тож запуск можна переривати й продовжувати (наприклад, коли закінчився денний ліміт).
Фото страви вирізається з картинки сторінки за рамкою, яку повертає Gemini.

Запуск:  set GEMINI_KEY=...  &&  python tools/import_books.py [--limit N] [--book частина_назви]
"""
import argparse, base64, io, json, os, re, sys, time, urllib.request, urllib.error
from pathlib import Path
import pypdf
from PIL import Image, ImageOps

BOOKS_DIR = Path(r"D:/Personal projects claude/книги рецептів Маковецького")
OUT = Path(r"D:/Personal projects claude/kitchen-app/backups/books/out")
MODEL = "gemini-flash-latest"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

SHORT = {"сніданки": "Сніданки", "обід": "Обіди", "вечер": "Вечері", "випічка": "Випічка і десерти",
         "смузі": "Смузі", "піца": "Піца", "гранола": "Гранола, топінги, морозиво"}

PROMPT = """Це сторінка з української книги рецептів дієтолога. Якщо на сторінці немає рецепта (обкладинка, зміст, поради, вступ) — поверни {"recipes": []}.
Якщо є рецепт(и), поверни ТІЛЬКИ JSON:
{"recipes":[{"title":"Шакшука з томатами та яйцями","servings":1,"kcal":317,"p":17,"f":21,"c":15,"per":"portion","time":20,
"ingredients":[{"qty":2,"unit":"шт","name":"Яйця"},{"qty":200,"unit":"г","name":"Томати у власному соку"},{"qty":null,"unit":"","name":"Сіль"}],
"steps":["Цибулю дрібно наріжте…"],"cat":"Сніданки","group":"dish","tags":["Для мене"],
"prep":[{"when":"pre","before":20,"t":"Приготувати шакшуку","min":15}],
"photo":[x0,y0,x1,y1]}]}
Правила:
- Переписуй текст точно, як у книзі (українською). Кроки — окремими рядками без номерів.
- kcal/p/f/c — як у книзі. per = "portion", якщо вказано на порцію; "100g", якщо на 100 г. Якщо на 100 г, а є вихід/вага порції — додай "portion_g".
- servings — на скільки порцій рецепт (якщо «на порцію» і інгредієнти на одну — 1). time — хвилин, як у книзі.
- unit — лише: г, кг, мл, л, шт, ст.л., ч.л., пучок; або "" коли кількість «за смаком» (qty null). Яйця, банки, штучні продукти (банан, яблуко, тортилья) — залишай у шт. Для решти, якщо в дужках вказана вага в грамах (≈50 г), — бери грами.
- cat — одна з: "Сніданки","Супи","М'ясні страви","Рибні страви","Гарніри","Салати й овочі","Закуски","Дитячі страви","ПП-десерти","Десерти","Випічка","Соуси","Інше".
- group — protein|base|veg|sauce|sweet|dish (ціла страва). tags — з: "Сім'я","Для мене","Син їсть","Десерт","Швидко" ("Швидко" — до 30 хв; "Для мене" — багато білку, мало цукру; "Син їсть" — проста страва, яку охоче їсть 3-річна дитина).
- prep — 1–3 справи заздалегідь (when: eve|morn|day|pre; before — для pre, за скільки хв до їжі; min — активних хв).
- photo — рамка основного фото готової страви на сторінці в координатах 0–1000 (x0,y0,x1,y1), або null, якщо фото нема.
- Рецепт, що починається на цій сторінці і продовжується на наступній — поверни, що є, і додай "continues": true. Якщо сторінка — продовження попереднього рецепта, поверни {"recipes": [], "continuation": {"ingredients": [...], "steps": [...]}}."""


def book_name(fname):
    low = fname.lower()
    for k, v in SHORT.items():
        if k in low:
            return v
    return Path(fname).stem


def page_payload(reader, i):
    p = reader.pages[i]
    text = (p.extract_text() or "").strip()
    img = None
    try:
        ims = p.images
        if ims:
            big = max(ims, key=lambda im: len(im.data))
            img = Image.open(io.BytesIO(big.data)).convert("RGB")
    except Exception:
        img = None
    return text, img


def ask(key, prompt, img):
    parts = [{"text": prompt}]
    if img is not None:
        im = img.copy(); im.thumbnail((1600, 1600))
        buf = io.BytesIO(); im.save(buf, "JPEG", quality=85)
        parts.append({"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(buf.getvalue()).decode()}})
    body = json.dumps({"contents": [{"role": "user", "parts": parts}], "generationConfig": {"responseMimeType": "application/json"}}).encode()
    for attempt in range(6):
        req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json", "x-goog-api-key": key})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                d = json.loads(r.read())
            return "".join(pt.get("text", "") for pt in d["candidates"][0]["content"]["parts"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="ignore")[:300]
            if e.code == 429:
                if "PerDay" in msg or "per day" in msg.lower():
                    raise SystemExit(f"Денний ліміт Gemini вичерпано. Запусти завтра — продовжить з місця зупинки.\n{msg}")
                wait = 20 * (attempt + 1)
                print(f"   429, чекаю {wait} с…", flush=True); time.sleep(wait); continue
            if e.code in (500, 503):
                time.sleep(10 * (attempt + 1)); continue
            raise RuntimeError(f"HTTP {e.code}: {msg}")
        except (urllib.error.URLError, TimeoutError) as e:
            time.sleep(10 * (attempt + 1))
    raise RuntimeError("Gemini не відповідає")


def crop_photo(img, box, out_path):
    if img is None or not box or len(box) != 4:
        return False
    W, H = img.size
    x0, y0, x1, y1 = [max(0, min(1000, float(v))) for v in box]
    x0, x1 = sorted((x0 * W / 1000, x1 * W / 1000)); y0, y1 = sorted((y0 * H / 1000, y1 * H / 1000))
    if (x1 - x0) < 60 or (y1 - y0) < 60:
        return False
    cx, cy, s = (x0 + x1) / 2, (y0 + y1) / 2, min(x1 - x0, y1 - y0) * 0.92
    sq = img.crop((int(cx - s / 2), int(cy - s / 2), int(cx + s / 2), int(cy + s / 2)))
    sq = ImageOps.fit(sq, (240, 240), Image.LANCZOS)
    sq.save(out_path, "JPEG", quality=80)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="скільки нових сторінок обробити (0 = всі)")
    ap.add_argument("--book", default="", help="тільки книга, назва якої містить це")
    ap.add_argument("--pages", default="", help="конкретні сторінки, напр. 30,31")
    ap.add_argument("--delay", type=float, default=4.0)
    a = ap.parse_args()
    key = os.environ.get("GEMINI_KEY", "").strip()
    if not key:
        sys.exit("Немає GEMINI_KEY")
    done_new = 0
    for pdf in sorted(BOOKS_DIR.glob("*.pdf")):
        if a.book and a.book.lower() not in pdf.name.lower():
            continue
        bname = book_name(pdf.name)
        od = OUT / bname; od.mkdir(parents=True, exist_ok=True)
        reader = pypdf.PdfReader(str(pdf))
        pages = [int(x) for x in a.pages.split(",")] if a.pages else range(len(reader.pages))
        print(f"=== {bname}: {len(reader.pages)} стор.", flush=True)
        for i in pages:
            jf = od / f"{i:03d}.json"
            if jf.exists():
                continue
            if a.limit and done_new >= a.limit:
                print("Ліміт сторінок на цей запуск досягнуто."); return
            text, img = page_payload(reader, i)
            if img is None and len(text) < 40:
                jf.write_text(json.dumps({"recipes": [], "skipped": "empty"}, ensure_ascii=False), encoding="utf-8"); continue
            prompt = PROMPT + (f"\n\nТекст сторінки (якщо є, звіряй з картинкою):\n{text[:6000]}" if len(text) > 40 else "")
            try:
                raw = ask(key, prompt, img)
                m = re.search(r"\{[\s\S]*\}", raw or "")
                res = json.loads(m.group(0)) if m else {"recipes": [], "error": "no json"}
            except SystemExit:
                raise
            except Exception as e:
                print(f"  стор {i}: помилка {e}", flush=True); time.sleep(a.delay); continue
            for k, r in enumerate(res.get("recipes", []) or []):
                if crop_photo(img, r.get("photo"), od / f"{i:03d}_{k}.jpg"):
                    r["photo_file"] = f"{i:03d}_{k}.jpg"
            res["page"] = i
            jf.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
            titles = ", ".join(r.get("title", "?") for r in res.get("recipes", []) or [])
            print(f"  стор {i}: {titles or '—'}", flush=True)
            done_new += 1
            time.sleep(a.delay)
    print("Готово.")


if __name__ == "__main__":
    main()
