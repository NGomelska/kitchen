/* Картинки рецептів: кругле фото в мисці, мальовані іконки категорій, обрізка фото.
   Іконки — прості, у тому ж «олівцевому» стилі; згодом їх можна замінити власними малюнками. */
const Art = (() => {
  const INK = "var(--ink)", PAPER = "var(--paper)";
  /* іконки в полі 40×40, центр 20,20 */
  const ICONS = {
    "Сніданки": `<path d="M10 21c0-6 5-9 9-8 3-3 10-1 10 5 3 3 1 9-4 9-2 2-7 2-9 0-4 0-6-3-6-6z" fill="#FFFDF5" stroke="${INK}" stroke-width="1.6"/><circle cx="21" cy="20" r="3.6" fill="#F2B33D" stroke="${INK}" stroke-width="1.4"/>`,
    "Супи": `<path d="M10 20h20a10 7.5 0 0 1-20 0z" fill="#E7A456" stroke="${INK}" stroke-width="1.6"/><path d="M15 16c0-2 2-2 2-4M20 16c0-2 2-2 2-4M25 16c0-2 2-2 2-4" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    "М'ясні страви": `<path d="M10 22c-2-6 3-12 10-11 7 1 11 6 9 11-2 5-9 7-13 5-3-1-5-2-6-5z" fill="#D9735B" stroke="${INK}" stroke-width="1.6"/><circle cx="16" cy="21" r="2.6" fill="#FFF3E6" stroke="${INK}" stroke-width="1.3"/><path d="M21 15c3 0 5 2 6 4" stroke="#FFF3E6" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    "Рибні страви": `<path d="M8 20c4-6 13-7 18-1-5 6-14 6-18 1z" fill="#8FB6D6" stroke="${INK}" stroke-width="1.6"/><path d="M26 19l6-5v11z" fill="#8FB6D6" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="13" cy="19" r="1.1" fill="${INK}"/><path d="M18 16c1 2 1 5 0 7" stroke="${INK}" stroke-width="1.1" fill="none"/>`,
    "Гарніри": `<path d="M9 26c1-7 6-11 11-11s10 4 11 11z" fill="#F2D27A" stroke="${INK}" stroke-width="1.6"/><path d="M14 22l1 1M19 19l1 1M24 22l1 1M17 24l1 1M22 25l1 1" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>`,
    "Салати й овочі": `<path d="M11 28c-2-9 4-17 16-17 1 10-5 17-16 17z" fill="#7DB87D" stroke="${INK}" stroke-width="1.6"/><path d="M12 27l13-13M17 22h4M20 19v-4" stroke="${INK}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
    "Закуски": `<path d="M9 23h22l-2 5H11z" fill="#E8C07D" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="15" cy="19.5" r="3" fill="#D9735B" stroke="${INK}" stroke-width="1.3"/><circle cx="22" cy="19" r="3.4" fill="#7DB87D" stroke="${INK}" stroke-width="1.3"/><path d="M26 22l3-6" stroke="${INK}" stroke-width="1.3"/>`,
    "Дитячі страви": `<path d="M20 15c-6-3-11 1-10 7 1 6 5 9 10 7 5 2 9-1 10-7 1-6-4-10-10-7z" fill="#EC8A73" stroke="${INK}" stroke-width="1.6"/><path d="M20 15c0-3 2-4 3-5" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M22 12c2-2 5-2 6 0-2 2-4 2-6 0z" fill="#7DB87D" stroke="${INK}" stroke-width="1.1"/><circle cx="17" cy="21" r="1" fill="${INK}"/><circle cx="23" cy="21" r="1" fill="${INK}"/><path d="M17.5 24.5c1.5 1.2 3.5 1.2 5 0" stroke="${INK}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`,
    "ПП-десерти": `<path d="M13 22h14l-2 7H15z" fill="#E9A9BF" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 22c0-5 4-7 8-7s8 2 8 7z" fill="#FFFDF5" stroke="${INK}" stroke-width="1.6"/><path d="M20 15c1-3 4-4 6-3-1 3-4 4-6 3z" fill="#7DB87D" stroke="${INK}" stroke-width="1.1"/>`,
    "Десерти": `<path d="M13 22h14l-2 7H15z" fill="#E9A9BF" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 22c0-5 4-7 8-7s8 2 8 7z" fill="#FFFDF5" stroke="${INK}" stroke-width="1.6"/><circle cx="20" cy="13.5" r="2.2" fill="#D9535B" stroke="${INK}" stroke-width="1.2"/>`,
    "Випічка": `<path d="M8 24c2-9 22-9 24 0-3-2-7-3-12-3s-9 1-12 3z" fill="#E8B860" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M15 17l2 5M20 16v5M25 17l-2 5" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>`,
    "Соуси": `<path d="M20 11c4 6 7 9 7 13a7 7 0 0 1-14 0c0-4 3-7 7-13z" fill="#B79BE0" stroke="${INK}" stroke-width="1.6"/><path d="M17 24c0 2 1 3 3 3" stroke="#FFFDF5" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
    "Інше": `<path d="M15 11v8M13 11v6c0 2 4 2 4 0v-6M15 19v10M25 11c-3 2-3 9 0 10v8" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
  };
  let uid = 0;
  const rim = (c, r) => `<circle cx="${c}" cy="${c + 2}" r="${r + 2}" fill="rgba(0,0,0,.08)"/><circle cx="${c}" cy="${c}" r="${r + 2}" fill="${PAPER}"/>`;
  const edge = (c, r) => `<circle cx="${c}" cy="${c}" r="${r + 2}" fill="none" stroke="${INK}" stroke-width="2"/>`;

  /* миска рецепта: фото всередині або іконка категорії на тлі кольору групи */
  function bowl(r, cat, size = 60) {
    const c = size / 2, R = size / 2 - 5, ri = R - 2;
    const g = r.group || "dish";
    let inner;
    if (r.photo) {
      const id = "ph" + (++uid);
      inner = `<defs><clipPath id="${id}"><circle cx="${c}" cy="${c}" r="${ri}"/></clipPath></defs><image href="${r.photo}" x="${c - ri}" y="${c - ri}" width="${ri * 2}" height="${ri * 2}" clip-path="url(#${id})" preserveAspectRatio="xMidYMid slice"/>`;
      return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${rim(c, R)}${inner}<g filter="url(#pencil)">${edge(c, R)}</g></svg>`;
    }
    const k = (ri * 2) / 40 * 1.3;
    inner = `<circle cx="${c}" cy="${c}" r="${ri}" fill="var(--${g})" opacity=".28"/><g transform="translate(${c - 20 * k} ${c - 20 * k}) scale(${k})">${ICONS[cat] || ICONS["Інше"]}</g>`;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" filter="url(#pencil)" aria-hidden="true">${rim(c, R)}${inner}${edge(c, R)}</svg>`;
  }

  /* обрізка: кругла рамка, рух пальцем, збільшення двома пальцями або повзунком */
  function crop(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const N = 600;
        const el = document.createElement("div");
        el.className = "cropper";
        el.innerHTML = `<div class="crop-in"><h2>Обріж фото</h2>
          <div class="crop-stage"><canvas width="${N}" height="${N}"></canvas></div>
          <input type="range" min="1" max="4" step="0.01" value="1" aria-label="Збільшення">
          <p class="hint">Пересунь фото пальцем. Збільш повзунком або двома пальцями. У мисці буде тільки те, що в колі.</p>
          <div class="pbtns"><button class="btn" data-c="ok">Готово</button><button class="btn ghost" data-c="no">Скасувати</button></div></div>`;
        document.body.appendChild(el);
        const cv = el.querySelector("canvas"), ctx = cv.getContext("2d"), zr = el.querySelector("input");
        const base = N / Math.min(img.width, img.height);
        let z = 1, ox = 0, oy = 0;
        const clamp = () => {
          const w = img.width * base * z, h = img.height * base * z;
          ox = Math.max(-(w - N) / 2, Math.min((w - N) / 2, ox));
          oy = Math.max(-(h - N) / 2, Math.min((h - N) / 2, oy));
        };
        const paint = (g, n, dim) => {
          const s = n / N, w = img.width * base * z * s, h = img.height * base * z * s;
          g.clearRect(0, 0, n, n);
          g.drawImage(img, n / 2 - w / 2 + ox * s, n / 2 - h / 2 + oy * s, w, h);
          if (dim) {
            g.save(); g.fillStyle = "rgba(20,15,10,.55)"; g.beginPath(); g.rect(0, 0, n, n); g.arc(n / 2, n / 2, n / 2 - 6, 0, Math.PI * 2); g.fill("evenodd");
            g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.arc(n / 2, n / 2, n / 2 - 6, 0, Math.PI * 2); g.stroke(); g.restore();
          }
        };
        const draw = () => { clamp(); paint(ctx, N, true); };
        draw();
        zr.oninput = () => { z = +zr.value; draw(); };
        const pts = new Map(); let pinch = null;
        const scaleK = () => N / cv.getBoundingClientRect().width;
        cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
        cv.addEventListener("pointermove", e => {
          if (!pts.has(e.pointerId)) return;
          const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
          if (pts.size === 1) { const k = scaleK(); ox += (e.clientX - prev.x) * k; oy += (e.clientY - prev.y) * k; draw(); }
          else if (pts.size === 2) {
            const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinch) { z = Math.max(1, Math.min(4, z * d / pinch)); zr.value = z; draw(); }
            pinch = d;
          }
        });
        const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
        cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
        cv.addEventListener("wheel", e => { e.preventDefault(); z = Math.max(1, Math.min(4, z * (e.deltaY < 0 ? 1.08 : 0.93))); zr.value = z; draw(); }, { passive: false });
        el.onclick = e => {
          const b = e.target.closest("[data-c]"); if (!b) return;
          let out = null;
          if (b.dataset.c === "ok") { const oc = document.createElement("canvas"); oc.width = oc.height = 360; paint(oc.getContext("2d"), 360, false); out = oc.toDataURL("image/jpeg", 0.82); }
          el.remove(); resolve(out);
        };
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
  return { bowl, crop, ICONS };
})();
