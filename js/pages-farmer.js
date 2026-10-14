/* pages-farmer.js – farmer dashboard, listings, listing form, freshness centre, enquiries, e-cards. */
const mine = () => ML.S.listings.filter((l) => l.sel === ML.me().id);

// ----- Dashboard -----
ML.pages.farmerHome = function () {
  const m = mine().filter((l) => !l.draft), me = ML.me();
  const needs = m.filter((l) => ['ATTENTION', 'AT_RISK', 'URGENT_REVIEW', 'ALTERNATIVE_REVIEW'].includes(l.st)), drafts = mine().filter((l) => l.draft);
  const enq = ML.S.enquiries.filter((e) => m.some((l) => l.id === e.lid));
  return `<section class="hero slim">${ML.SCENE}<div class="hero-in"><h1>Hello, ${ML.esc(me.name.split(' ')[0])}</h1><p>Here is what needs your attention today.</p></div></section>
    <p><a class="btn" href="#/farmer/new?t=produce">Sell produce</a><a class="btn alt" href="#/farmer/new?t=residue">List residues</a></p>
    <div class="grid">${ML.stat(m.filter(ML.isVisible).length, 'Active listings', '/farmer/listings')}${ML.stat(m.filter((l) => l.st === 'FRESH').length, 'Fresh produce', '/farmer/listings')}
    ${ML.stat(needs.length + drafts.length, 'Need your attention', '/farmer/freshness')}${ML.stat(enq.filter((e) => e.status === 'new').length, 'New buyer enquiries', '/farmer/enquiries')}</div>
    <h2>Needs your attention</h2>${needs.length || drafts.length ? [...needs, ...drafts].map((l) => `<div class="card" style="margin-bottom:8px"><b>${ML.esc(l.title)}</b> ${ML.badge(l)}${l.draft ? ' <span class="badge b-yellow">Draft</span>' : ''}
      <br><a class="btn small" href="#/farmer/freshness">Review</a></div>`).join('') : '<p class="card muted">All good. Nothing needs attention right now.</p>'}
    <h2>Recent notifications</h2>${ML.S.notifs.filter((n) => n.uid === me.id).slice(0, 3).map((n) => `<div class="card" style="margin-bottom:8px"><b>${ML.esc(n.title)}</b><br><span class="muted">${ML.ago(n.at)}</span></div>`).join('') || '<p class="muted">None yet.</p>'}`;
};

// ----- My listings -----
ML.pages.farmerListings = function () {
  return `<h1>My listings</h1><a class="btn" href="#/farmer/new">+ New listing</a>${mine().map((l) => `<div class="card" style="margin:10px 0"><b>${ML.esc(l.title)}</b> ${ML.badge(l)}${l.draft ? ' <span class="badge b-yellow">Draft</span>' : ''}
    <span class="muted"> ${l.q} ${ML.esc(l.u)} · ${ML.money(l.p)}</span><br><a class="btn small alt" href="#/l/${l.id}">View</a><a class="btn small alt" href="#/farmer/edit/${l.id}">Edit</a>
    <a class="btn small alt" href="#/farmer/ecard/${l.id}">E-card</a>${['FRESH', 'ATTENTION', 'AT_RISK', 'AVAILABLE'].includes(l.st) ? `<button class="btn small" onclick="ML.act.sold('${l.id}')">Mark sold</button>` : ''}</div>`).join('') || '<p class="card muted">No listings yet.</p>'}`;
};
ML.act.sold = (id) => { ML.setStatus(ML.listing(id), 'SOLD', 'Farmer confirmed sale'); ML.save(); ML.toast('Marked as sold'); ML.render(); };

// ----- Create / edit listing -----
ML.pages.farmerForm = function (id, p) {
  const l = id ? ML.listing(id) : null;
  if (id && (!l || l.sel !== ML.me().id)) return '<div class="card note warn">You can only edit your own listings.</div>';
  const type = l ? l.type : p.get('t') || 'produce', v = l || {}, f = ML.formPrefill || {}; ML.formPrefill = null;
  const val = (k) => ML.esc(v[k] != null ? v[k] : f[k] != null ? f[k] : '');
  return `<h1>${l ? 'Edit' : 'New'} ${type === 'produce' ? 'produce' : 'residue'} listing</h1>
    ${!l ? `<div class="card"><h3>Describe it in your own words (optional)</h3><div class="row"><input id="nl" placeholder="Nina mahindi bags 20, Eldoret, ready this week">
      <button class="btn alt" type="button" onclick="ML.act.assist()">Fill form</button></div><p class="muted">Rule-based extraction in this MVP. Check every field – missing details stay blank.</p></div>` : ''}
    <form class="card" onsubmit="return ML.act.saveListing(event,'${id || ''}','${type}')">
    <label>${type === 'produce' ? 'Crop (e.g. tomato, maize, kale)' : 'Residue type (e.g. maize stalks)'}*</label><input id="f_crop" value="${val('crop')}" required>
    <div class="row"><div><label>Quantity*</label><input id="f_q" type="number" min="1" step="any" value="${val('q')}" required></div>
    <div><label>Unit*</label><select id="f_u">${['kg', 'bags', 'tonnes', 'crates', 'bunches'].map((u) => `<option ${(v.u || f.u) === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    <div><label>Price per unit (KES)${type === 'produce' ? '*' : ''}</label><input id="f_p" type="number" min="0" value="${val('p')}"></div></div>
    <label>Location*</label><input id="f_loc" list="places" value="${val('loc') || ML.esc(ML.me().loc)}" required><datalist id="places">${ML.PLACES.map((x) => `<option>${x}</option>`).join('')}</datalist>
    ${type === 'produce' ? `<div class="row"><div><label>Harvest date*</label><input id="f_h" type="date" max="${new Date().toISOString().slice(0, 10)}" value="${v.h ? v.h.slice(0, 10) : ''}"></div>
      <div><label>Storage</label><select id="f_stg">${Object.entries(ML.STORAGE_LABEL).map(([k, t]) => `<option value="${k}" ${v.stg === k ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div><label>Condition now</label><select id="f_cond">${['good', 'fair', 'deteriorating'].map((c) => `<option ${v.cond === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div></div>`
      : `<label>Intended use, if known</label><input id="f_intended" value="${val('intended')}"><label>Condition</label><select id="f_cond">${['good', 'fair'].map((c) => `<option ${v.cond === c ? 'selected' : ''}>${c}</option>`).join('')}</select>`}
    <label>Availability</label><input id="f_avail" value="${val('avail')}" placeholder="e.g. Ready this week"><label>Photo (optional, under 400 KB)</label><input id="f_img" type="file" accept="image/*">
    <p class="error" id="ferr" role="alert"></p><button class="btn">Save listing</button><a class="btn alt" href="#/farmer/listings">Cancel</a></form>`;
};
ML.act.assist = function () {
  const c = ML.classify(document.getElementById('nl').value);
  if (c.kind === 'unknown') { ML.toast('Could not recognise a crop or residue. Please fill the form by hand.'); return; }
  if (c.kind === 'spoiled') { ML.toast('Spoiled produce cannot be listed as fresh. Review it in Freshness.'); ML.go('/farmer/freshness'); return; }
  ML.formPrefill = ML.prefillFrom(c);
  const t = c.kind === 'residue' ? 'residue' : 'produce';
  ML.toast('Detected: ' + t + '. Please check each field.');
  if (location.hash.startsWith('#/farmer/new?t=' + t)) ML.render(); else ML.go('/farmer/new?t=' + t);
};
ML.act.saveListing = function (ev, id, type) {
  ev.preventDefault(); const g = (i) => (document.getElementById(i) || {}).value, errs = [];
  const crop = (g('f_crop') || '').trim().toLowerCase(), q = +g('f_q'), loc = (g('f_loc') || '').trim(), price = g('f_p'), h = g('f_h');
  if (crop.length < 2) errs.push('Enter the crop or residue name.'); if (!(q > 0)) errs.push('Quantity must be more than 0.'); if (!loc) errs.push('Enter a location.');
  if (type === 'produce') { if (!h) errs.push('Harvest date is needed for freshness estimates.'); if (price === '') errs.push('Enter an asking price.'); }
  if (price !== '' && +price < 0) errs.push('Price cannot be negative.');
  if (errs.length) { document.getElementById('ferr').textContent = errs.join(' '); return false; }
  const finish = (img) => {
    const l = id ? ML.listing(id) : { id: ML.uid('l'), sel: ML.me().id, type, created: ML.iso(), draft: false, hidden: false, reported: false, cc: 0, st: type === 'produce' ? 'FRESH' : 'AVAILABLE' };
    Object.assign(l, { crop, title: crop[0].toUpperCase() + crop.slice(1) + (type === 'produce' ? ' – ' + loc : ''), q, u: g('f_u'), p: price === '' ? null : +price, loc, avail: g('f_avail'), cond: g('f_cond'), upd: ML.iso() });
    if (type === 'produce') { l.h = new Date(h).toISOString(); l.stg = g('f_stg'); } else l.intended = g('f_intended');
    if (img) l.img = img; if (!id) ML.S.listings.unshift(l);
    if (type === 'produce' && l.cond === 'deteriorating') ML.setStatus(l, 'URGENT_REVIEW', 'Farmer reported deterioration');
    ML.save(); ML.runChecker(); ML.toast('Listing saved'); ML.go('/l/' + l.id);
  };
  const file = document.getElementById('f_img').files[0];
  if (file) { if (file.size > 4e5) { document.getElementById('ferr').textContent = 'Image is too large (max 400 KB).'; return false; } const r = new FileReader(); r.onload = () => finish(r.result); r.readAsDataURL(file); } else finish();
  return false;
};

// ----- Freshness & alternative-use centre -----
ML.pages.freshness = function () {
  const items = mine().filter((l) => l.draft || ['ATTENTION', 'AT_RISK', 'URGENT_REVIEW', 'ALTERNATIVE_REVIEW'].includes(l.st));
  return `<h1>Freshness &amp; alternatives</h1><div class="note">Warnings are <b>estimates</b> from your recorded data and configurable rules. They never mean produce is confirmed spoiled.</div>
    ${items.map((l) => {
      const e = ML.evalFresh(l); let body;
      if (l.draft) body = `<p>Draft alternative-use listing. It is <b>not public</b> until you publish it.</p><button class="btn" onclick="ML.act.publish('${l.id}')">Review &amp; publish</button><a class="btn alt" href="#/farmer/edit/${l.id}">Edit draft</a>`;
      else if (l.st === 'ALTERNATIVE_REVIEW') {
        const opts = ML.CATALOGUE[l.type === 'residue' ? l.crop : 'deteriorated produce'] || ML.CATALOGUE['deteriorated produce'];
        body = `<div class="note warn"><b>Safety:</b> do not assume this is safe as food or animal feed. If unsure, ask your county agricultural extension officer.</div>
          <p>Reviewed options (illustrative):</p><ul>${opts.map((o) => `<li><b>${o[0]}</b> – ${o[1]}</li>`).join('')}</ul>
          <button class="btn" onclick="ML.act.draft('${l.id}')">Create draft alternative listing</button>`;
      } else body = `<p><b>Why:</b> ${ML.esc(e ? e.why : '')}</p><p><b>Next step:</b> ${l.st === 'URGENT_REVIEW' ? 'Check the produce and confirm its real condition.' : 'Check your produce and consider selling soon. Matching buyers already see it higher in search.'}</p>
          <button class="btn" onclick="ML.act.good('${l.id}')">Still good for fresh sale</button><button class="btn danger" onclick="ML.act.bad('${l.id}')">Not suitable for fresh sale</button>
          <a class="btn alt" href="#/farmer/ecard/${l.id}">Share e-card</a>`;
      return `<div class="card" style="margin:12px 0"><h3>${ML.esc(l.title)} ${ML.badge(l)}</h3>${body}</div>`;
    }).join('') || '<p class="card muted">Nothing needs attention.</p>'}
    <details class="tools"><summary><b>Demo tools</b> (presentation only – not a production feature)</summary>
      <p>Simulated clock: <b>+${ML.S.clock} days</b>. In production, the checker runs as a scheduled backend job.</p>
      <button class="btn small alt" onclick="ML.act.advance(1)">+1 day</button><button class="btn small alt" onclick="ML.act.advance(3)">+3 days</button><button class="btn small alt" onclick="ML.act.advance(7)">+7 days</button>
      <button class="btn small" onclick="ML.act.check()">Run checker</button><button class="btn small danger" onclick="ML.act.resetAll()">Reset sample data</button></details>`;
};
ML.act.good = (id) => { ML.flow.stillGood(id); ML.toast('Kept on fresh sale; we will re-check in 2 days'); ML.render(); };
ML.act.bad = (id) => { ML.flow.notSuitable(id); ML.toast('Withdrawn from the fresh marketplace'); ML.render(); };
ML.act.draft = (id) => { ML.flow.createDraft(id); ML.toast('Draft created – review before publishing'); ML.render(); };
ML.act.publish = function (id) {
  const d = ML.listing(id);
  if (!confirm(`Publish "${d.title}"? Intended use: ${d.intended}. I confirm this is not offered as food or animal feed.`)) return;
  ML.flow.publish(id); ML.toast('Published'); ML.go('/l/' + id);
};
ML.act.advance = (n) => { ML.S.clock += n; const c = ML.runChecker(); ML.toast(`Clock +${n} days. ${c} alert(s) raised.`); ML.render(); };
ML.act.check = () => { const c = ML.runChecker(); ML.toast(c ? c + ' alert(s) raised' : 'No new alerts'); ML.render(); };
ML.act.resetAll = () => { ML.reset(); ML.S.session = 'u1'; ML.save(); ML.toast('Sample data reset'); ML.render(); };

// ----- Enquiries received -----
ML.pages.farmerEnquiries = function () {
  const ids = mine().map((l) => l.id), list = ML.S.enquiries.filter((e) => ids.includes(e.lid));
  return `<h1>Buyer enquiries</h1>${list.map((e) => { const l = ML.listing(e.lid), b = ML.user(e.buyerId);
    return `<div class="card" style="margin:10px 0"><b>${ML.esc(e.buyerName)}</b> wants ${e.qty} ${ML.esc(l.u)} of <a href="#/l/${l.id}">${ML.esc(l.title)}</a><br>${ML.esc(e.msg)}<br>
    <span class="muted">${ML.ago(e.at)} · ${e.status === 'new' ? 'New' : 'Responded'}${b && b.phone ? ' · Buyer phone: ' + ML.esc(b.phone) : ''}</span><br>
    ${e.status === 'new' ? `<button class="btn small" onclick="ML.act.respond('${e.id}')">Mark as responded</button>` : ''}</div>`; }).join('') || '<p class="card muted">No enquiries yet.</p>'}`;
};
ML.act.respond = (id) => { const e = ML.S.enquiries.find((x) => x.id === id); e.status = 'responded'; ML.notify(e.buyerId, e.lid, 'enquiry', 'Farmer responded to your enquiry', 'Check your enquiries.'); ML.save(); ML.render(); };

// ----- E-card generator -----
ML.pages.ecard = function (id) {
  const m = mine().filter((l) => !l.draft), l = id ? ML.listing(id) : m[0];
  return `<h1>E-card</h1><label>Choose listing</label><select onchange="ML.go('/farmer/ecard/'+this.value)">${m.map((x) => `<option value="${x.id}" ${l && l.id === x.id ? 'selected' : ''}>${ML.esc(x.title)}</option>`).join('')}</select>
    ${l ? `<p><canvas id="cv" width="600" height="800" aria-label="E-card preview"></canvas></p><button class="btn" onclick="ML.act.download('${l.id}')">Download PNG</button><button class="btn alt" onclick="ML.act.copyLink('${l.id}')">Copy public link</button>` : '<p class="card">Create a listing first.</p>'}`;
};
ML.afterRender = function (route) { if (route === 'ecard') { const id = (location.hash.split('/')[3] || '').split('?')[0], l = id ? ML.listing(id) : mine().filter((x) => !x.draft)[0]; if (l) ML.drawCard(l); } };
ML.drawCard = function (l) {
  const c = document.getElementById('cv'), x = c.getContext('2d'), urgent = ['ATTENTION', 'AT_RISK'].includes(l.st), col = l.type === 'residue' ? '#6b4a2b' : urgent ? '#c25b12' : '#2d6a3e';
  x.fillStyle = col; x.fillRect(0, 0, 600, 800); x.fillStyle = '#f6f4ee'; x.fillRect(30, 110, 540, 560); x.fillStyle = '#fff';
  x.font = '700 30px Georgia'; x.fillText('🌾 MavunoLoop', 30, 60); x.font = '20px sans-serif'; x.fillText(urgent ? 'URGENT SALE' : l.type === 'residue' ? 'FARM RESIDUE' : 'FRESH PRODUCE', 30, 92);
  const text = () => { x.fillStyle = '#1f2a21'; x.font = '700 36px Georgia'; x.fillText(l.title.slice(0, 26), 50, 430); x.font = '28px sans-serif';
    x.fillText(`${l.q} ${l.u} · ${ML.money(l.p)}${l.p ? '/' + l.u : ''}`, 50, 485); x.fillText('📍 ' + l.loc, 50, 530); x.font = '22px sans-serif'; x.fillText('Status: ' + ML.STATUS[l.st][0], 50, 575);
    x.fillStyle = col; x.fillRect(50, 600, 500, 50); x.fillStyle = '#fff'; x.font = '700 22px sans-serif'; x.fillText('Enquire on MavunoLoop', 130, 634); x.font = '16px sans-serif'; x.fillText('Freshness status is an estimate, not a guarantee.', 30, 765); };
  if (l.img) { const i = new Image(); i.onload = () => { x.drawImage(i, 50, 130, 500, 260); text(); }; i.src = l.img; } else { x.font = '150px serif'; x.fillText(ML.icon(l), 215, 300); text(); }
};
ML.act.download = () => { const a = document.createElement('a'); a.download = 'mavunoloop-card.png'; a.href = document.getElementById('cv').toDataURL('image/png'); a.click(); };
