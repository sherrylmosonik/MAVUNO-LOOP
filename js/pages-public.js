/* pages-public.js – landing, login, register, marketplace, listing details, notifications (shared by all roles). */
const ROLE_INFO = {
  farmer: { icon: '🧑🏾‍🌾', title: 'Farmer', blurb: 'List produce and residues, get freshness alerts, and find buyers.' },
  buyer: { icon: '🛒', title: 'Buyer', blurb: 'Search real listings and send enquiries to farmers.' },
  admin: { icon: '🏛️', title: 'Cooperative board', blurb: 'Oversee listings, reports and members.' } };

ML.pages.landing = function () {
  const a = ML.S.listings.filter(ML.isVisible);
  return `<section class="hero">${ML.SCENE}<div class="hero-in"><h1>Sell Before It Spoils. Find Value Beyond the Harvest.</h1>
    <p>MavunoLoop connects Kenyan farmers, buyers and cooperatives. List produce, get freshness-risk estimates, and find buyers for farm residues.</p>
    <form onsubmit="return ML.act.heroSearch(event)" role="search"><label for="q">What are you looking for?</label>
      <div class="search"><input id="q" placeholder="e.g. I need 50 kg of tomatoes near Eldoret"><button class="btn light">Search</button></div></form>
      <p style="margin-top:16px"><a class="btn ghost" href="#/register/farmer">Sell produce</a><a class="btn ghost" href="#/register/farmer">List farm residues</a><a class="btn ghost" href="#/ussd">Try on a basic phone (USSD)</a></p></div></section>
    <h2>Choose how you use MavunoLoop</h2>
    <div class="grid">${Object.keys(ROLE_INFO).map((r) => `<div class="card role"><span class="ico">${ROLE_INFO[r].icon}</span><h3>${ROLE_INFO[r].title}</h3><p>${ROLE_INFO[r].blurb}</p>
      <a class="btn" href="#/login/${r}">Log in</a>${r !== 'admin' ? `<a class="btn alt" href="#/register/${r}">Create account</a>` : ''}</div>`).join('')}</div>
    <h2>Urgent listings</h2><p class="muted">Estimated to need a quick sale. Estimates are rule-based, not confirmed spoilage.</p>${ML.grid(a.filter((l) => ['ATTENTION', 'AT_RISK'].includes(l.st)))}
    <h2>Fresh produce</h2>${ML.grid(a.filter((l) => l.type === 'produce' && l.st === 'FRESH'))}
    <h2>Agricultural residues</h2>${ML.grid(a.filter((l) => l.type === 'residue'))}
    <h2>How it works</h2><div class="grid">
      <div class="card step"><i>1</i><div><h3>List</h3>Add produce or residues in a minute.</div></div>
      <div class="card step"><i>2</i><div><h3>Monitor</h3>Rules estimate freshness risk and alert you early.</div></div>
      <div class="card step"><i>3</i><div><h3>Confirm</h3>Tell us the real condition. Still good? It stays on sale.</div></div>
      <div class="card step"><i>4</i><div><h3>Find value</h3>If not fit for fresh sale, review safe alternatives and publish them yourself.</div></div></div>`;
};
ML.act.heroSearch = (e) => { e.preventDefault(); ML.go('/market?q=' + encodeURIComponent(document.getElementById('q').value)); return false; };

// ----- Login / Register -----
ML.pages.login = function (role) {
  const info = ROLE_INFO[role]; if (!info) return '<p class="card">Unknown page.</p>';
  const demo = ML.S.users.find((u) => u.role === role);
  return `<div class="card auth"><h1>${info.title} login</h1><p class="muted">${info.blurb}</p>
    <form onsubmit="return ML.act.login(event,'${role}')"><label for="em">Email</label><input id="em" type="email" required autocomplete="email">
    <label for="pw">Password</label><input id="pw" type="password" required autocomplete="current-password"><p class="error" id="err" role="alert"></p>
    <button class="btn">Log in</button></form>
    ${role !== 'admin' ? `<p>New here? <a href="#/register/${role}">Create a ${info.title.toLowerCase()} account</a></p>` : '<p class="muted">Cooperative board accounts are created by the platform team.</p>'}
    <div class="note muted">Demo account (browser-only sign-in, not secure): <b>${demo.email}</b> / <b>${demo.pass}</b>
      <button class="btn small alt" type="button" onclick="ML.act.fillDemo('${demo.email}','${demo.pass}')">Fill in</button></div>
    <p class="muted">Other roles: ${Object.keys(ROLE_INFO).filter((r) => r !== role).map((r) => `<a href="#/login/${r}">${ROLE_INFO[r].title}</a>`).join(' · ')}</p></div>`;
};
ML.act.fillDemo = (e, p) => { document.getElementById('em').value = e; document.getElementById('pw').value = p; };
ML.act.login = function (ev, role) {
  ev.preventDefault();
  if (ML.login(document.getElementById('em').value, document.getElementById('pw').value, role)) { ML.toast('Welcome back'); ML.go(ML.HOME[role]); }
  else document.getElementById('err').textContent = 'Email or password is incorrect for this account type.';
  return false;
};
ML.pages.register = function (role) {
  if (!['farmer', 'buyer'].includes(role)) return '<p class="card">Registration is only for farmers and buyers.</p>';
  return `<div class="card auth"><h1>Create ${ROLE_INFO[role].title.toLowerCase()} account</h1>
    <form onsubmit="return ML.act.register(event,'${role}')"><label>Full name</label><input id="rn" required>
    ${role === 'buyer' ? '<label>Business name (optional)</label><input id="ro">' : ''}
    <label>Phone</label><input id="rp" type="tel" required><label>Location</label><input id="rl" list="places" required><datalist id="places">${ML.PLACES.map((p) => `<option>${p}</option>`).join('')}</datalist>
    <label>Email</label><input id="re" type="email" required><label>Password (min 6 characters)</label><input id="rw" type="password" minlength="6" required>
    <p class="error" id="err" role="alert"></p><button class="btn">Create account</button></form><p>Already registered? <a href="#/login/${role}">Log in</a></p></div>`;
};
ML.act.register = function (ev, role) {
  ev.preventDefault(); const v = (id) => (document.getElementById(id) || {}).value || '';
  const err = ML.register({ role, name: v('rn').trim(), org: v('ro').trim(), phone: v('rp').trim(), loc: v('rl').trim(), email: v('re').trim().toLowerCase(), pass: v('rw') });
  if (err) { document.getElementById('err').textContent = err; return false; }
  ML.toast('Account created'); ML.go(ML.HOME[role]); return false;
};

// ----- Marketplace -----
ML.pages.market = function (p) {
  const text = p.get('q') || '', parsed = ML.parseQuery(text);
  const q = Object.assign({ text }, parsed, { type: p.get('type') || '', place: p.get('place') || '', max: +p.get('max') || 0, fresh: p.get('fresh') || '', sort: p.get('sort') || 'relevance' });
  const results = ML.search(q), opt = (cur, v, t) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${t}</option>`;
  return `<h1>Marketplace</h1><form class="card" onsubmit="return ML.act.marketSearch(event)">
    <label for="mq">Search (try "50 kg tomatoes Eldoret" or "nyanya")</label><input id="mq" value="${ML.esc(text)}">
    <div class="row"><div><label>Type</label><select id="mt">${opt(q.type, '', 'All')}${opt(q.type, 'produce', 'Produce')}${opt(q.type, 'residue', 'Residues')}</select></div>
    <div><label>Location</label><select id="mp">${opt(q.place, '', 'Anywhere')}${ML.PLACES.map((x) => opt(q.place, x, x)).join('')}</select></div>
    <div><label>Max price (KES)</label><input id="mx" type="number" min="0" value="${q.max || ''}"></div>
    <div><label>Freshness</label><select id="mf">${opt(q.fresh, '', 'Any')}${opt(q.fresh, 'FRESH', 'Fresh')}${opt(q.fresh, 'ATTENTION', 'Approaching window')}${opt(q.fresh, 'AT_RISK', 'At risk')}</select></div>
    <div><label>Sort by</label><select id="ms">${opt(q.sort, 'relevance', 'Relevance')}${opt(q.sort, 'urgent', 'Urgency')}${opt(q.sort, 'new', 'Newest')}</select></div></div><button class="btn">Search</button></form>
    ${text ? `<div class="note"><b>Understood:</b> crop ${parsed.crop || '—'}, location ${parsed.loc || '—'}, quantity ${parsed.qty ? parsed.qty + ' ' + (parsed.unit || '') : '—'} <span class="muted">(rule-based parser)</span></div>` : ''}
    <p class="muted">${results.length} listing(s). Ranking: relevance, location match, enough quantity, urgency (only for relevant listings) and recency. Sold, withdrawn and draft listings never appear.</p>
    ${results.length ? ML.grid(results) : `<div class="card"><b>No matching listings.</b> <a class="btn small alt" href="#/market?q=${encodeURIComponent(parsed.crop || '')}">Broaden search</a></div>`}`;
};
ML.act.marketSearch = function (e) {
  e.preventDefault(); const g = (i) => document.getElementById(i).value;
  ML.go('/market?' + new URLSearchParams({ q: g('mq'), type: g('mt'), place: g('mp'), max: g('mx'), fresh: g('mf'), sort: g('ms') })); return false;
};

// ----- Listing details (public view; seller phone/email never shown) -----
ML.pages.listing = function (id) {
  const l = ML.listing(id); if (!l) return '<div class="card">Listing not found. <a href="#/market">Back to marketplace</a></div>';
  document.title = l.title + ' – MavunoLoop';
  const me = ML.me(), seller = ML.user(l.sel) || {}, own = me && me.id === l.sel, e = ML.evalFresh(l);
  const enquiries = own ? ML.S.enquiries.filter((x) => x.lid === l.id) : [];
  return `<p><a href="#/market">← Marketplace</a></p><div class="row"><div>${ML.thumb(l)}</div><div style="flex:2 1 300px"><h1>${ML.esc(l.title)}</h1>
    <p>${ML.badge(l)} <span class="badge">${l.type}</span></p>
    <p><b>${l.q} ${ML.esc(l.u)}</b> · ${ML.money(l.p)}${l.p ? '/' + ML.esc(l.u) : ''}<br>📍 ${ML.esc(l.loc)}${l.h ? '<br>Harvested: ' + new Date(l.h).toDateString() : ''}
    <br>Available: ${ML.esc(l.avail || '—')}<br>Last updated: ${new Date(l.upd).toLocaleString()}<br>Seller: ${ML.esc((seller.name || '').split(' ')[0])}, ${ML.esc(seller.loc)} <span class="muted">(contact details hidden – send an enquiry)</span></p></div></div>
    ${l.type === 'produce' ? `<div class="note ${['AT_RISK', 'URGENT_REVIEW'].includes(l.st) ? 'warn' : ''}"><b>Farmer-reported condition:</b> ${ML.esc(l.cond)}<br><b>Estimated freshness:</b> ${e && e.status ? ML.STATUS[l.st][0] : 'Condition check needed'}<br><span class="muted">${ML.esc(e ? e.why : '')}</span></div>` : `<p>Intended use: ${ML.esc(l.intended || 'Not stated')}</p>`}
    ${!ML.isVisible(l) ? '<div class="note warn"><b>This listing is not an active offer.</b></div>' : ''}
    <p><button class="btn alt" onclick="ML.act.copyLink('${l.id}')">Copy listing link</button>
    ${own ? `<a class="btn alt" href="#/farmer/edit/${l.id}">Edit</a><a class="btn alt" href="#/farmer/ecard/${l.id}">Make e-card</a>` : me && me.role !== 'admin' ? `<button class="btn small alt" onclick="ML.act.report('${l.id}')">Report listing</button>` : ''}</p>
    ${ML.isVisible(l) && !own ? (me && me.role === 'buyer' ? `<div class="card"><h2>Express interest</h2><form onsubmit="return ML.act.enquire(event,'${l.id}')">
      <label>Quantity needed (${ML.esc(l.u)})</label><input id="eq" type="number" min="1" required><label>Message</label><textarea id="em" rows="3" maxlength="300"></textarea><button class="btn">Send enquiry</button></form></div>`
      : !me ? `<div class="card"><b>Want to buy?</b> <a class="btn small" href="#/login/buyer">Log in as buyer</a><a class="btn small alt" href="#/register/buyer">Create account</a></div>` : '') : ''}
    ${enquiries.length ? `<h2>Enquiries</h2>${enquiries.map((x) => `<div class="card">${ML.esc(x.buyerName)} wants ${x.qty} ${ML.esc(l.u)}<br>${ML.esc(x.msg)}</div>`).join('')}` : ''}`;
};
ML.act.copyLink = function (id) { const u = location.href.split('#')[0] + '#/l/' + id; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => ML.toast('Link copied'), () => prompt('Copy this link:', u)); };
ML.act.report = (id) => { ML.listing(id).reported = true; ML.save(); ML.toast('Reported to the cooperative board'); };
ML.act.enquire = function (ev, id) {
  ev.preventDefault(); const l = ML.listing(id), me = ML.me(), qty = +document.getElementById('eq').value;
  if (!(qty > 0)) { ML.toast('Enter a valid quantity'); return false; }
  ML.S.enquiries.unshift({ id: ML.uid('e'), lid: id, buyerId: me.id, buyerName: me.name, qty, msg: document.getElementById('em').value.slice(0, 300), status: 'new', at: ML.iso() });
  ML.notify(l.sel, id, 'enquiry', 'New enquiry: ' + l.title, `${me.name} wants ${qty} ${l.u}.`, null, `MavunoLoop: ${me.name} wants ${qty}${l.u} of ${l.crop}. Open the app to respond.`); ML.save(); ML.toast('Enquiry sent'); ML.go('/buyer/enquiries'); return false;
};

// ----- Notifications (any logged-in role) -----
ML.pages.notifications = function () {
  const me = ML.me(), list = ML.S.notifs.filter((n) => n.uid === me.id);
  return `<h1>Notifications</h1><button class="btn small alt" onclick="ML.act.readAll()">Mark all read</button>${list.map((n) => `<div class="card ${n.read ? '' : 'unread'}" style="margin:10px 0">
    <span class="badge">${n.type}</span> <b>${ML.esc(n.title)}</b><p style="margin:4px 0">${ML.esc(n.msg)}</p><span class="muted">${ML.ago(n.at)} · ${n.channel} · ${ML.esc(n.delivery)}</span><br>${n.sms ? `<div class="sms"><span class="muted">SMS preview (simulated)</span><br>${ML.esc(n.sms)}</div>` : ''}
    ${n.lid ? `<a href="#/l/${n.lid}" onclick="ML.act.readOne('${n.id}')">Open listing</a>` : ''}</div>`).join('') || '<p class="card muted">No notifications yet.</p>'}`;
};
ML.act.readOne = (id) => { const n = ML.S.notifs.find((x) => x.id === id); if (n) n.read = true; ML.save(); };
ML.act.readAll = () => { const me = ML.me(); ML.S.notifs.forEach((n) => { if (n.uid === me.id) n.read = true; }); ML.save(); ML.render(); };
