/* pages-ussd.js – USSD menu logic + on-screen phone simulator.
 *
 * ML.ussd.handle(phone, text) is STATELESS, like a real USSD callback (e.g. Africa's Talking):
 *   - `text` = everything typed so far, joined by "*"  (e.g. "3*1*2")
 *   - reply starts with "CON " (menu, session stays open) or "END " (final message)
 *   - "0" = Back one step, "00" = Home (typed at any menu; "0" on the main menu exits)
 * The simulator calls the same function a server endpoint would call, with the SAME data and rules as the web app.
 * SIMULATION ONLY: no live USSD shortcode or SMS provider is connected. */
ML.ussd = {
  MAIN: 'CON MavunoLoop\n1 My listings\n2 Freshness alerts\n3 Confirm condition\n4 Search listings\n5 List residue\n6 Messages (SMS)\n0 Exit',
  userByPhone(phone) { const c = (s) => String(s || '').replace(/\D/g, ''); return ML.S.users.find((u) => u.role === 'farmer' && c(u.phone) === c(phone)); },
  normalize(text) { // apply Back (0) and Home (00) tokens
    const p = []; let exit = false;
    (text ? text.split('*') : []).forEach((t) => { if (t === '00') p.length = 0; else if (t === '0') { if (p.length) p.pop(); else exit = true; } else p.push(t); });
    return { p, exit };
  },
  handle(phone, text) {
    const u = this.userByPhone(phone); if (!u) return 'END Number not registered. Sign up on MavunoLoop first.';
    const n = this.normalize(text); if (n.exit) return 'END Thank you for using MavunoLoop.';
    const r = this.route(u, n.p); return n.p.length && r.startsWith('CON') ? r + '\n0 Back 00 Home' : r;
  },
  route(u, p) {
    const mine = ML.S.listings.filter((l) => l.sel === u.id && !l.draft), short = (l) => `${l.crop} ${l.q}${l.u}`;
    const alerts = mine.filter((l) => ['ATTENTION', 'AT_RISK', 'URGENT_REVIEW'].includes(l.st));
    if (!p.length) return this.MAIN;
    switch (p[0]) {
      case '1': return 'END ' + (mine.map((l, i) => `${i + 1}. ${short(l)} - ${ML.STATUS[l.st][0]}`).join('\n') || 'No listings yet');
      case '2': return 'END ' + (alerts.slice(0, 2).map((l) => ML.smsFor(l, l.st)).join('\n---\n') || 'No alerts. All good.');
      case '3': {
        if (!alerts.length) return 'END Nothing needs confirming.';
        if (p.length === 1) return 'CON Confirm which?\n' + alerts.map((l, i) => `${i + 1} ${short(l)}`).join('\n');
        const l = alerts[+p[1] - 1]; if (!l) return 'END Invalid choice.';
        if (p.length === 2) return `CON ${short(l)}\n1 Still good for sale\n2 Not fit for fresh sale`;
        if (p[2] === '1') { ML.flow.stillGood(l.id); return 'END Kept on sale. We will re-check in 2 days.'; }
        if (p[2] === '2') { ML.flow.notSuitable(l.id); return 'END Withdrawn from sale. Do not sell it as food or feed. Open MavunoLoop to review alternatives.'; }
        return 'END Invalid choice.';
      }
      case '4': {
        if (p.length === 1) return 'CON Enter crop (e.g. tomato):';
        const r = ML.search(Object.assign({ text: p[1] }, ML.parseQuery(p[1]))).slice(0, 3);
        return 'END ' + (r.map((l) => `${short(l)} ${ML.money(l.p)} ${l.loc}`).join('\n') || 'No matching listings.');
      }
      case '5': {
        if (p.length === 1) return 'CON Residue type (e.g. maize stalks):';
        if (p.length === 2) return 'CON Quantity in kg:';
        const q = +p[2]; if (!(q > 0)) return 'END Invalid quantity.';
        ML.S.listings.unshift({ id: ML.uid('l'), sel: u.id, type: 'residue', crop: p[1].toLowerCase(), title: p[1] + ' (via USSD)', q, u: 'kg', p: null, loc: u.loc, stg: 'ambient', cond: 'good', st: 'AVAILABLE',
          avail: 'Contact seller', upd: ML.iso(), created: ML.iso(), draft: false, hidden: false, reported: false, cc: 0, intended: '' });
        ML.save(); return 'END Residue listed. Buyers can now find it.';
      }
      case '6': { const m = ML.S.notifs.filter((n) => n.uid === u.id && n.sms).slice(0, 3); return 'END SMS inbox (simulated)\n' + (m.map((n) => n.sms).join('\n---\n') || 'No messages yet.'); }
      default: return 'END Invalid choice.';
    }
  } };

// ----- Simulator page -----
ML.ussdSession = { tokens: [], fwd: [], open: false };
ML.pages.ussd = function () {
  const farmers = ML.S.users.filter((u) => u.role === 'farmer'), cur = ML.ussdSession.phone || farmers[0].phone, u = ML.ussd.userByPhone(cur);
  const inbox = ML.S.notifs.filter((n) => u && n.uid === u.id && n.sms).slice(0, 3), ex = ML.S.listings.find((l) => l.st === 'AT_RISK') || ML.S.listings.find((l) => l.type === 'produce');
  return `<h1>Use MavunoLoop on any phone (USSD)</h1>
    <div class="note"><b>This is a simulation.</b> No live USSD code or SMS provider is connected yet. Real USSD needs a shortcode from a provider such as Africa's Talking, which calls a server endpoint running this same menu logic.</div>
    <div class="row" style="align-items:flex-start"><div style="flex:1 1 300px"><div class="phone"><div class="screen" id="ussdScreen">Dial *384*88# (simulated)</div>
      <label style="color:#fff">Phone number</label><select id="ussdPhone" onchange="ML.act.ussdPhone(this.value)">${farmers.map((f) => `<option ${f.phone === cur ? 'selected' : ''}>${ML.esc(f.phone)}</option>`).join('')}</select>
      <form onsubmit="return ML.act.ussdSend(event)"><input id="ussdIn" inputmode="numeric" autocomplete="off" aria-label="USSD input" placeholder="Reply" style="display:none"><button class="btn" id="ussdBtn" type="submit">Dial *384*88#</button></form>
      <div class="nav"><button class="btn" id="ussdBack" onclick="ML.act.ussdBack()" disabled>◀ Back</button><button class="btn" id="ussdHome" onclick="ML.act.ussdHome()" disabled>Home</button><button class="btn" id="ussdFwd" onclick="ML.act.ussdFwd()" disabled>Forward ▶</button></div></div></div>
    <div style="flex:1 1 280px"><div class="card"><h3>How to use it</h3><ol><li>Press <b>Dial</b>, then type a number and press <b>Send</b>.</li><li><b>Back</b> (or type <b>0</b>) goes one step back. <b>Forward</b> re-opens the step you left. <b>Home</b> (or type <b>00</b>) returns to the main menu.</li><li>Choose <b>6</b> to read your SMS messages.</li></ol>
      <p class="muted">Tip: on the farmer's Freshness page, use the demo tools to advance the clock, then dial 2 or 3.</p></div>
      <div class="card" style="margin-top:14px"><h3>Alert SMS this farmer receives</h3>${inbox.length ? inbox.map((n) => `<div class="sms">${ML.esc(n.sms)}</div>`).join('') : `<p class="muted">No alerts yet. This is an <b>example</b> of what an alert looks like:</p>${ex ? `<div class="sms">${ML.esc(ML.smsFor(ex, 'AT_RISK'))}</div>` : ''}`}<p class="muted">SMS delivery is simulated.</p></div></div></div>`;
};
ML.act.ussdPhone = (v) => { ML.ussdSession = { tokens: [], fwd: [], open: false, phone: v }; ML.render(); };
ML.act.ussdShow = function () {
  const S = ML.ussdSession, phone = document.getElementById('ussdPhone').value, res = ML.ussd.handle(phone, S.tokens.join('*')), open = res.startsWith('CON'), i = document.getElementById('ussdIn');
  document.getElementById('ussdScreen').textContent = res.slice(4); S.open = open; if (!open) { S.tokens = []; S.fwd = []; }
  i.style.display = open ? 'block' : 'none'; document.getElementById('ussdBtn').textContent = open ? 'Send' : 'Dial *384*88#'; if (open) i.focus();
  document.getElementById('ussdBack').disabled = !(open && S.tokens.length); document.getElementById('ussdHome').disabled = !(open && S.tokens.length); document.getElementById('ussdFwd').disabled = !(open && S.fwd.length);
};
ML.act.ussdSend = function (ev) {
  ev.preventDefault(); const S = ML.ussdSession, i = document.getElementById('ussdIn');
  if (!S.open) { S.tokens = []; S.fwd = []; } else { const v = i.value.trim(); i.value = ''; if (!v) return false; if (v === '0') return ML.act.ussdBack(), false; if (v === '00') return ML.act.ussdHome(), false; S.tokens.push(v); S.fwd = []; }
  ML.act.ussdShow(); return false;
};
ML.act.ussdBack = () => { const S = ML.ussdSession; if (S.tokens.length) S.fwd.push(S.tokens.pop()); ML.act.ussdShow(); };
ML.act.ussdFwd = () => { const S = ML.ussdSession; if (S.fwd.length) S.tokens.push(S.fwd.pop()); ML.act.ussdShow(); };
ML.act.ussdHome = () => { const S = ML.ussdSession; S.tokens = []; S.fwd = []; ML.act.ussdShow(); };
