/* ui.js – small shared helpers and components. */
ML.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
ML.money = (p) => (p == null || p === '' ? 'Price on request' : 'KES ' + Number(p).toLocaleString('en-KE'));
ML.ago = function (t) { const m = (ML.now() - new Date(t)) / 6e4; return m < 60 ? Math.max(1, Math.round(m)) + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
ML.toast = function (m) { const t = document.getElementById('toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(ML._t); ML._t = setTimeout(() => (t.style.display = 'none'), 2600); };
ML.go = (path) => (location.hash = '#' + path);

ML.badge = function (l) { const s = ML.STATUS[l.st] || ['?', '']; return `<span class="badge ${s[1]}">${s[0]}</span>`; };
ML.icon = (l) => (l.type === 'residue' ? '🌾' : ML.EMOJI[l.crop] || '🧺');
ML.thumb = (l) => `<div class="thumb">${l.img ? `<img src="${l.img}" alt="${ML.esc(l.title)}, ${ML.esc(l.loc)}">` : `<span role="img" aria-label="${ML.esc(l.crop)}">${ML.icon(l)}</span>`}</div>`;

ML.listingCard = (l) => `<a class="card" data-st="${l.st}" href="#/l/${l.id}">${ML.thumb(l)}<h3>${ML.esc(l.title)}</h3>
  <div>${ML.badge(l)} <span class="badge">${l.type}</span></div>
  <p style="margin:8px 0 0">${l.q} ${ML.esc(l.u)} · ${ML.money(l.p)}${l.p ? '/' + ML.esc(l.u) : ''}<br><span class="muted">📍 ${ML.esc(l.loc)} · updated ${ML.ago(l.upd)}</span></p></a>`;
ML.grid = (a, empty) => (a.length ? `<div class="grid">${a.map(ML.listingCard).join('')}</div>` : `<p class="card muted">${empty || 'Nothing here yet.'}</p>`);
ML.stat = (n, label, href) => `<a class="card stat" href="#${href}"><b>${n}</b>${label}</a>`;
ML.unreadCount = () => { const u = ML.me(); return u ? ML.S.notifs.filter((n) => n.uid === u.id && !n.read).length : 0; };

// Decorative Kenyan farm scene (inline SVG). To use real footage, put a short loop at assets/hero.mp4 – it is laid over the scene automatically.
ML.SCENE = `<svg class="scene" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fb7e3"/><stop offset="1" stop-color="#f7e8b9"/></linearGradient></defs>
<rect width="1200" height="420" fill="url(#sky)"/><circle cx="1000" cy="92" r="70" fill="#ffd45e" opacity=".25"/><circle cx="1000" cy="92" r="44" fill="#ffd45e"/>
<g class="cloud" fill="#fff" opacity=".9"><ellipse cx="260" cy="80" rx="70" ry="20"/><ellipse cx="310" cy="68" rx="48" ry="18"/></g>
<g class="cloud c2" fill="#fff" opacity=".8"><ellipse cx="720" cy="120" rx="80" ry="20"/><ellipse cx="770" cy="108" rx="50" ry="16"/></g>
<path d="M0 250 Q220 190 430 240 T860 225 T1200 215 V420 H0Z" fill="#7fb27a"/><path d="M0 295 Q260 245 520 295 T1200 270 V420 H0Z" fill="#4c9255"/>
<g fill="none" stroke="#2f7a3f" stroke-width="7" stroke-linecap="round" opacity=".85"><path d="M-20 345 Q300 310 620 340 T1220 325"/><path d="M-20 368 Q300 333 620 363 T1220 348"/><path d="M-20 391 Q300 356 620 386 T1220 371"/></g>
<g fill="#1f4d2b"><path d="M1090 310 q-5 -50 0 -78 h7 q5 28 0 78z"/><ellipse cx="1094" cy="228" rx="78" ry="15"/></g></svg>
<video class="bg-vid" autoplay muted loop playsinline preload="none" aria-hidden="true" src="assets/hero.mp4" onerror="this.remove()"></video><div class="veil"></div>`;

// Soft floating farm icons drifting up behind the page content (decorative; disabled for reduced-motion users via CSS).
ML.floaters = function () {
  if (!document.createElement || !document.body) return;
  const icons = ['🌾', '🍃', '🌽', '🍅', '🌿', '🥬', '🫘', '🥑'], box = document.createElement('div');
  box.className = 'floaters'; box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('span');
    s.textContent = icons[i % icons.length];
    s.style.cssText = `--x:${(i * 37 + 5) % 96}%;--s:${22 + (i * 11) % 30}px;--d:${26 + (i * 7) % 24}s;--dl:-${(i * 5) % 30}s`;
    box.appendChild(s);
  }
  document.body.prepend(box);
};
