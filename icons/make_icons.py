"""Малює іконку застосунку «Кухня»: миска з парою на зеленому тлі.
Запуск: python make_icons.py (з цієї папки)."""
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).parent
GREEN, CREAM, MUSTARD = (46, 106, 70), (242, 244, 239), (232, 180, 87)


def draw(size, maskable=False):
    s = 4  # малюємо вчетверо більше, потім зменшуємо — гладкі краї
    W = size * s
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, W, W], fill=GREEN)
        k = 0.72  # безпечна зона для круглих іконок Android
    else:
        d.rounded_rectangle([0, 0, W - 1, W - 1], radius=int(W * 0.22), fill=GREEN)
        k = 0.86
    c = W / 2
    u = W * k / 2  # півширина малюнка

    def X(v): return c + v * u
    def Y(v): return c + v * u

    # миска
    d.pieslice([X(-0.78), Y(-0.55), X(0.78), Y(0.95)], 0, 180, fill=CREAM)
    d.rounded_rectangle([X(-0.86), Y(0.12), X(0.86), Y(0.24)], radius=int(u * 0.06), fill=CREAM)
    # що в мисці: три «горбики» їжі
    for cx, r, col in [(-0.38, 0.22, MUSTARD), (0.02, 0.27, (124, 198, 155)), (0.42, 0.2, (224, 110, 90))]:
        d.ellipse([X(cx - r), Y(0.14 - r), X(cx + r), Y(0.14 + r)], fill=col)
    d.rectangle([X(-0.86), Y(0.14), X(0.86), Y(0.25)], fill=CREAM)
    # пара
    w = int(u * 0.075)
    for sx in (-0.3, 0.05, 0.4):
        pts = [(X(sx + 0.06 * ((i % 2) * 2 - 1)), Y(-0.28 - i * 0.14)) for i in range(5)]
        d.line(pts, fill=CREAM, width=w, joint="curve")
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    draw(192).save(HERE / "icon-192.png")
    draw(512).save(HERE / "icon-512.png")
    draw(512, maskable=True).save(HERE / "icon-512-maskable.png")
    draw(64).save(HERE / "icon-64.png")
    print("ok")
