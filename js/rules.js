/* rules.js – freshness-risk rules, alert checker, workflow actions, search and ranking. */

// ---------- 1. Freshness estimate (transparent, rules-based, NOT a spoilage detector) ----------
ML.evalFresh = function (l) {
  if (l.type !== 'produce') return null;
  const days = ML.SHELF[l.crop];
  if (!days || !l.h) return { status: null, why: 'Condition check needed: no harvest date or no configured shelf-life for this crop, so no estimate is made.' };
  const win = days * (ML.STORAGE_FACTOR[l.stg] || 1), age = (ML.now() - new Date(l.h)) / ML.DAY, ratio = age / win;
  let status = ratio >= 1 ? 'URGENT_REVIEW' : ratio >= 0.85 ? 'AT_RISK' : ratio >= 0.6 ? 'ATTENTION' : 'FRESH';
  if (l.cond === 'deteriorating') status = 'URGENT_REVIEW';
  return { status, age, win, why: `ESTIMATE: harvested ${age.toFixed(1)} days ago, stored "${ML.STORAGE_LABEL[l.stg]}", configured window for ${l.crop} ≈ ${win.toFixed(1)} days (illustrative). FARMER-REPORTED condition: "${l.cond}". This is a rules-based estimate, not confirmed spoilage.` };
};

// ---------- 2. Alert checker (in production: run by a scheduled backend job; here: called on load and by demo tools) ----------
ML.runChecker = function () {
  let raised = 0;
  ML.S.listings.forEach((l) => {
    if (l.type !== 'produce' || l.draft || !['FRESH', 'ATTENTION', 'AT_RISK'].includes(l.st)) return;
    if (l.snooze && l.snooze > ML.now()) return;                       // farmer recently confirmed "still good"
    const e = ML.evalFresh(l);
    if (!e || !e.status || ML.RISK_ORDER[e.status] <= ML.RISK_ORDER[l.st]) return;
    if (!ML.setStatus(l, e.status, e.why)) return;
    raised++;
    const urgent = e.status === 'URGENT_REVIEW';
    ML.notify(l.sel, l.id, urgent ? 'confirm' : 'freshness', (urgent ? 'Please confirm condition: ' : 'Freshness alert: ') + l.title, e.why, `${l.id}:${e.status}:${l.cc}`, ML.smsFor(l, e.status)); // dedupe key
  });
  ML.save(); return raised;
};

// ---------- 3. Alternative-use workflow ----------
ML.flow = {
  stillGood(id) { const l = ML.listing(id); l.cond = 'good'; l.cc++; l.snooze = ML.now() + 2 * ML.DAY; if (l.st !== 'FRESH') ML.setStatus(l, 'FRESH', 'Farmer confirmed still suitable'); ML.save(); },
  notSuitable(id) {
    const l = ML.listing(id); l.cond = 'deteriorating';
    if (l.st !== 'URGENT_REVIEW') ML.setStatus(l, 'URGENT_REVIEW', 'Farmer reported deterioration');
    if (ML.setStatus(l, 'ALTERNATIVE_REVIEW', 'Farmer confirmed unsuitable for fresh sale')) {
      l.hidden = true; // withdrawn from the fresh marketplace
      ML.notify(l.sel, l.id, 'alternative', 'Alternative-use options ready', l.title + ' was withdrawn from fresh sale. Review safe alternatives.', null, 'MavunoLoop: ' + l.title + ' withdrawn from fresh sale. Do not sell it as food or feed. Open the app to review alternatives.');
    }
    ML.save();
  },
  createDraft(id) { // never published automatically
    const o = ML.listing(id), key = o.type === 'residue' ? o.crop : 'deteriorated produce', use = (ML.CATALOGUE[key] || ML.CATALOGUE['deteriorated produce'])[0][0];
    ML.S.listings.unshift({ id: ML.uid('l'), sel: o.sel, type: 'residue', crop: o.type === 'produce' ? o.crop + ' waste (not for food/feed)' : o.crop, title: o.crop + ' – ' + use, q: o.q, u: o.u, p: null, loc: o.loc, stg: 'ambient',
      cond: 'fair', st: 'ALTERNATIVE_LISTING', draft: true, hidden: false, reported: false, cc: 0, intended: use, avail: 'After you confirm', upd: ML.iso(), created: ML.iso(), origin: o.id });
    ML.save();
  },
  publish(id) { const d = ML.listing(id); d.draft = false; d.upd = ML.iso(); const o = ML.listing(d.origin); if (o) ML.setStatus(o, 'ALTERNATIVE_LISTING', 'Alternative listing published'); ML.save(); } };

// ---------- 4. Search & ranking (deterministic) ----------
ML.isVisible = (l) => !l.draft && !l.hidden && ['FRESH', 'ATTENTION', 'AT_RISK', 'AVAILABLE', 'ALTERNATIVE_LISTING'].includes(l.st);

ML.parseQuery = function (text) {   // rule-based fallback; an LLM can replace this on the server later
  const t = (text || '').toLowerCase(), o = { crop: null, loc: null, qty: null, unit: null, residue: false };
  for (const k in ML.ALIAS) if (ML.ALIAS[k].some((a) => new RegExp('\\b' + a + '\\b').test(t))) o.crop = k;
  o.loc = ML.PLACES.find((p) => t.includes(p.toLowerCase())) || null;
  const a = t.match(/(\d+)\s*(kg|bags?|crates?|sacks?|tonnes?)?/), b = t.match(/(bags?|crates?|sacks?|kg)\s*(\d+)/);
  if (a) { o.qty = +a[1]; o.unit = a[2] || null; } else if (b) { o.qty = +b[2]; o.unit = b[1]; }
  o.residue = /stalk|husk|cob|residue|mabua/.test(t);
  return o;
};

ML.score = function (l, q) {   // returns -1 when not relevant: urgency can never rescue an irrelevant listing
  const text = (q.text || '').toLowerCase();
  // Alternative-use listings (compost, biogas...) must not appear in searches for fresh produce
  if (l.st === 'ALTERNATIVE_LISTING' && !q.residue && !/compost|waste|biogas|residue/.test(text)) return -1;
  let rel = !text && !q.crop ? 1 : 0;
  if (q.crop && l.crop.includes(q.crop)) rel = 10;
  else if (text && (l.title + ' ' + l.crop).toLowerCase().split(/\W+/).some((w) => w.length > 3 && text.includes(w))) rel = 5;
  if (q.residue && l.type === 'residue') rel += 3;
  if (rel === 0) return -1;
  let s = rel * 5;
  if (q.loc && l.loc === q.loc) s += 20;                 // location match
  if (q.qty && l.q >= q.qty) s += 8;                      // enough quantity
  s += { AT_RISK: 14, ATTENTION: 7 }[l.st] || 0;          // urgency boost
  s += Math.max(0, 6 - (ML.now() - new Date(l.upd)) / ML.DAY); // recency
  return s;
};

ML.search = function (q) {
  return ML.S.listings.filter(ML.isVisible).map((l) => ({ l, s: ML.score(l, q) })).filter((x) => x.s >= 0)
    .filter((x) => (!q.type || x.l.type === q.type) && (!q.place || x.l.loc === q.place) && (!q.max || x.l.p == null || x.l.p <= q.max) && (!q.fresh || x.l.st === q.fresh))
    .sort((a, b) => q.sort === 'new' ? new Date(b.l.created) - new Date(a.l.created)
      : q.sort === 'urgent' ? ((ML.RISK_ORDER[b.l.st] || 0) - (ML.RISK_ORDER[a.l.st] || 0)) || b.s - a.s : b.s - a.s).map((x) => x.l);
};

// ---------- 5. Alert SMS text (SIMULATED – no SMS provider connected). Kept under ~160 characters ----------
ML.smsFor = function (l, status) {
  const lab = { ATTENTION: 'is nearing its selling window', AT_RISK: 'is at estimated risk', URGENT_REVIEW: 'needs a condition check' }[status] || 'needs attention';
  return `MavunoLoop: your ${l.crop} (${l.q}${l.u}) ${lab} (estimate). Check it now. Dial *384*88# then 3 to confirm. Reply STOP to opt out.`;
};
