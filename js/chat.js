/* chat.js – assistant: classifies what a user types (produce / residue / spoiled), extracts details, searches REAL listings,
 * and pre-fills the listing form. The farmer always reviews and saves; nothing is published by the chat.
 * Rule-based in this MVP. To add an LLM, set ML.CONFIG.aiEndpoint to a SERVER function that holds the API key. */
ML.CONFIG = { aiEndpoint: null }; // e.g. '/api/classify' → returns JSON { kind, crop, qty, unit, loc, price, avail }

ML.normUnit = (u) => (!u ? null : /bag|sack/.test(u) ? 'bags' : /crate/.test(u) ? 'crates' : /tonne/.test(u) ? 'tonnes' : /kg/.test(u) ? 'kg' : null);

ML.classify = function (text) {
  const raw = (text || '').toLowerCase(), why = [];
  const pm = raw.match(/\b(?:kes|ksh|sh|at)\.?\s*(\d[\d,]*)|@\s*(\d[\d,]*)/), price = pm ? +(pm[1] || pm[2]).replace(/,/g, '') : null;
  const t = pm ? raw.replace(pm[0], ' ') : raw, q = ML.parseQuery(t);
  let unit = ML.normUnit(q.unit); if (!unit) { const b = t.match(/(bags?|sacks?|crates?|kg|tonnes?)\s*(\d+)/); if (b) unit = ML.normUnit(b[1]); }
  const res = (t.match(/\b(stalks?|husks?|cobs?|straw|peels?|peelings|stover|vines|shells?|mabua|makapi|maganda|residues?|bagasse)\b/) || [])[1];
  const spoiled = /rotten|rotting|spoil|mould|mold|ameharibika|imeoza|inaoza|going bad/.test(t);
  const av = (t.match(/this week|next week|today|tomorrow|now|leo|kesho/) || [])[0];
  let kind = 'unknown', crop = q.crop;
  if (res) {
    kind = 'residue'; const r = /stalk|mabua/.test(res) ? 'stalks' : /husk|makapi/.test(res) ? 'husks' : /cob/.test(res) ? 'cobs' : res.replace(/s$/, '') + 's';
    crop = q.crop ? ({ beans: 'bean' }[q.crop] || q.crop) + ' ' + r : r; why.push(`"${res}" is a plant by-product left after harvest, not the harvested crop itself`);
  } else if (q.crop) { kind = 'produce'; why.push(`"${q.crop}" is a harvested crop`); }
  if (spoiled) { kind = 'spoiled'; why.push('you described it as rotten or spoiled'); }
  const buy = /\b(need|looking for|want|buy|nataka|natafuta|search|find|show)\b/.test(t), sell = /\b(sell|selling|have|got|nina|ninauza|nauza|list|harvested|available)\b/.test(t);
  return { kind, crop, qty: q.qty, unit, loc: q.loc, price, avail: av ? av[0].toUpperCase() + av.slice(1) : null, why, intent: buy && !sell ? 'buy' : sell ? 'sell' : 'none', text: text };
};
ML.prefillFrom = function (c) { const f = {}; if (c.crop) f.crop = c.crop; if (c.qty) f.q = c.qty; if (c.unit) f.u = c.unit; if (c.loc) f.loc = c.loc; if (c.price != null) f.p = c.price; if (c.avail) f.avail = c.avail; return f; };

ML.chat = {
  msgs: [], last: null,
  async classifyAsync(text) { // optional server-side LLM; output is validated, never trusted blindly
    const base = ML.classify(text); if (!ML.CONFIG.aiEndpoint) return base;
    try {
      const r = await fetch(ML.CONFIG.aiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) }), j = await r.json(), ok = {};
      if (['produce', 'residue', 'spoiled'].includes(j.kind)) ok.kind = j.kind; if (typeof j.crop === 'string' && j.crop.length < 40) ok.crop = j.crop.toLowerCase();
      if (+j.qty > 0) ok.qty = +j.qty; if (ML.normUnit(j.unit)) ok.unit = ML.normUnit(j.unit); if (ML.PLACES.includes(j.loc)) ok.loc = j.loc; if (+j.price >= 0 && j.price !== null) ok.price = +j.price;
      return Object.assign(base, ok);
    } catch (e) { return base; }
  },
  reply(text, c) {
    const me = ML.me(), farmer = me && me.role === 'farmer', e = ML.esc;
    if (c.kind === 'spoiled') return `<b>Please do not sell this as food or animal feed.</b> I can't tell from here how bad it is, so check it yourself.<ul><li>If part is still good, keep selling that part fresh.</li><li>If it is not fit for fresh sale, withdraw it. You will get reviewed options such as compost.</li><li>If unsure about safety, ask your county agricultural extension officer.</li></ul>${farmer ? '<a class="btn small" href="#/farmer/freshness">Open Freshness &amp; alternatives</a>' : '<a class="btn small" href="#/login/farmer">Log in as farmer</a>'}`;
    if (c.intent === 'buy' && (c.kind === 'produce' || c.kind === 'residue')) {
      const r = ML.search({ text, crop: c.kind === 'produce' ? c.crop : null, loc: c.loc, qty: c.qty, residue: c.kind === 'residue' }).slice(0, 3);
      if (!r.length) return `I found <b>no matching listings</b> right now, and I won't make one up. <a href="#/market">Browse all listings</a> or try a wider area.`;
      return `Found <b>${r.length}</b> real listing(s):<ul>${r.map((l) => `<li><a href="#/l/${l.id}">${e(l.title)}</a> – ${l.q} ${e(l.u)}, ${ML.money(l.p)}, ${e(l.loc)} ${ML.badge(l)}</li>`).join('')}</ul><span class="muted">Urgency labels are estimates. Check quality before buying.</span>`;
    }
    if (c.kind === 'produce' || c.kind === 'residue') {
      ML.chat.last = c; const miss = [], got = [];
      c.qty ? got.push(`Quantity: ${c.qty} ${c.unit || '(unit?)'}`) : miss.push('quantity'); if (c.qty && !c.unit) miss.push('unit');
      c.loc ? got.push('Location: ' + c.loc) : miss.push('location'); c.price != null ? got.push('Price: ' + ML.money(c.price)) : miss.push('price');
      if (c.avail) got.push('Availability: ' + c.avail); if (c.kind === 'produce') miss.push('harvest date (needed for freshness estimates)'); else miss.push('intended use (optional)');
      return `<b>This looks like ${c.kind === 'residue' ? 'a farm residue' : 'fresh produce'}: ${e(c.crop)}.</b><br><span class="muted">Why: ${e(c.why.join('; '))}.</span><ul>${got.map((g) => `<li>${e(g)}</li>`).join('')}</ul><b>Still needed:</b> ${e(miss.join(', '))}.<br>
        ${farmer ? '<button class="btn small" onclick="ML.chat.openForm()">Open pre-filled form</button>' : '<a class="btn small" href="#/login/farmer">Log in as farmer to list this</a>'}<br><span class="muted">You review and save it – nothing is published automatically.</span>`;
    }
    if (/^(hi|hello|hey|habari|jambo|mambo)\b/.test(text.trim().toLowerCase())) return 'Hello! Tell me what you have to sell, or what you need to buy. Swahili works too.';
    return `I didn't recognise a crop or residue. Try:<ul><li>"I have 20 bags of maize in Eldoret"</li><li>"I need 50 kg of tomatoes near Eldoret"</li><li>"I have maize stalks to sell"</li></ul>`;
  },
  openForm() {
    const c = ML.chat.last; if (!c) return; ML.formPrefill = ML.prefillFrom(c); const t = c.kind === 'residue' ? 'residue' : 'produce'; ML.chat.toggle(false);
    if (location.hash.startsWith('#/farmer/new?t=' + t)) ML.render(); else ML.go('/farmer/new?t=' + t);
  },
  async send(text) {
    text = (text || '').trim().slice(0, 300); if (!text) return;
    ML.chat.msgs.push({ me: true, html: ML.esc(text) }); ML.chat.draw();
    const c = await ML.chat.classifyAsync(text); ML.chat.msgs.push({ me: false, html: ML.chat.reply(text, c) }); ML.chat.draw();
  },
  draw() {
    const log = document.getElementById('chatLog'); if (!log) return;
    log.innerHTML = ML.chat.msgs.map((m) => `<div class="msg ${m.me ? 'me' : 'bot'}">${m.html}</div>`).join(''); log.scrollTop = log.scrollHeight;
  },
  toggle(force) { const p = document.getElementById('chatPanel'); if (!p) return; const open = force === undefined ? p.hidden : force; p.hidden = !open; document.getElementById('chatBtn').hidden = open; if (open) { ML.chat.chips(); ML.chat.draw(); document.getElementById('chatIn').focus(); } },
  chips() {
    const me = ML.me(), list = me && me.role === 'buyer' ? ['I need 50 kg of tomatoes near Eldoret', 'Nataka mahindi'] : ['I have 20 bags of maize in Eldoret', 'Nina nyanya 80 kg Eldoret, ready this week', 'I have maize stalks to sell', 'My tomatoes are rotting', 'I need 50 kg of tomatoes near Eldoret'];
    document.getElementById('chatChips').innerHTML = list.map((t) => `<button type="button" onclick="ML.chat.send(this.textContent)">${ML.esc(t)}</button>`).join('');
  },
  init() {
    if (!document.createElement || !document.body) return;
    const b = document.createElement('button'); b.id = 'chatBtn'; b.className = 'chat-btn'; b.textContent = '💬 Ask MavunoLoop'; b.onclick = () => ML.chat.toggle(true);
    const p = document.createElement('section'); p.id = 'chatPanel'; p.className = 'chat-panel'; p.hidden = true; p.setAttribute('aria-label', 'MavunoLoop assistant');
    p.innerHTML = `<div class="chat-head"><b>MavunoLoop assistant</b><span class="tip"><button type="button" aria-label="About this assistant">ℹ️</button>
        <span class="tip-text" role="tooltip">Rule-based helper (no AI model connected in this demo). It only shows real listings and never invents any.</span></span>
        <button aria-label="Close chat" onclick="ML.chat.toggle(false)">✕</button></div>
      <div id="chatLog" aria-live="polite"></div>
      <form id="chatForm" onsubmit="ML.chat.send(document.getElementById('chatIn').value);document.getElementById('chatIn').value='';return false">
        <span class="ex"><button type="button" class="ex-btn" aria-label="Show example messages" title="Examples">💡</button><span class="ex-pop" id="chatChips"></span></span>
        <input id="chatIn" maxlength="300" placeholder="Type your case here…" aria-label="Message"><button class="btn">Send</button></form>`;
    document.body.append(b, p);
    ML.chat.msgs.push({ me: false, html: 'Habari! 👋 What would you like to sell or buy today?' });
  } };
