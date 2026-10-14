/* pages-admin.js – cooperative board: overview, listings, reports, members. */
ML.pages.adminHome = function () {
  const L = ML.S.listings.filter((l) => !l.draft), farmers = ML.S.users.filter((u) => u.role === 'farmer').length;
  return `<h1>Cooperative overview</h1><div class="grid">${ML.stat(farmers, 'Farmer members', '/admin/members')}${ML.stat(L.filter(ML.isVisible).length, 'Active listings', '/admin/listings')}
    ${ML.stat(L.filter((l) => ['ATTENTION', 'AT_RISK', 'URGENT_REVIEW'].includes(l.st)).length, 'Listings at risk (est.)', '/admin/listings')}${ML.stat(L.filter((l) => l.reported).length, 'Reported listings', '/admin/reports')}${ML.stat(ML.S.enquiries.length, 'Buyer enquiries', '/admin/listings')}</div>
    <h2>Recent status changes</h2>${ML.S.history.slice(-6).reverse().map((h) => { const l = ML.listing(h.lid); return `<div class="card" style="margin-bottom:8px"><b>${l ? ML.esc(l.title) : h.lid}</b>: ${h.from} → ${h.to}<br><span class="muted">${ML.ago(h.at)}</span></div>`; }).join('') || '<p class="muted">No status changes yet.</p>'}`;
};
ML.pages.adminListings = function () {
  return `<h1>All listings</h1><div class="scroll"><table><tr><th>Listing</th><th>Seller</th><th>Type</th><th>Status</th><th></th></tr>${ML.S.listings.map((l) => `<tr>
    <td><a href="#/l/${l.id}">${ML.esc(l.title)}</a></td><td>${ML.esc((ML.user(l.sel) || {}).name)}</td><td>${l.type}</td><td>${ML.STATUS[l.st][0]}${l.draft ? ' (draft)' : ''}</td>
    <td>${['SOLD', 'WITHDRAWN'].includes(l.st) ? '' : `<button class="btn small danger" onclick="ML.act.takedown('${l.id}')">Withdraw</button>`}</td></tr>`).join('')}</table></div>`;
};
ML.pages.adminReports = function () {
  const r = ML.S.listings.filter((l) => l.reported);
  return `<h1>Reported listings</h1>${r.map((l) => `<div class="card" style="margin:10px 0"><b><a href="#/l/${l.id}">${ML.esc(l.title)}</a></b> ${ML.badge(l)}<br>
    <button class="btn small danger" onclick="ML.act.takedown('${l.id}')">Withdraw listing</button><button class="btn small alt" onclick="ML.act.dismiss('${l.id}')">Dismiss report</button></div>`).join('') || '<p class="card muted">No reports.</p>'}`;
};
ML.pages.adminMembers = function () {
  return `<h1>Members</h1><div class="scroll"><table><tr><th>Name</th><th>Role</th><th>Location</th></tr>${ML.S.users.map((u) => `<tr><td>${ML.esc(u.name)}</td><td>${u.role === 'admin' ? 'Cooperative board' : u.role}</td><td>${ML.esc(u.loc)}</td></tr>`).join('')}</table></div>`;
};
ML.act.takedown = (id) => { const l = ML.listing(id); ML.setStatus(l, 'WITHDRAWN', 'Withdrawn by cooperative board'); ML.notify(l.sel, id, 'status', 'Listing withdrawn by the board', l.title + ' was withdrawn. Contact the cooperative for details.'); ML.save(); ML.toast('Listing withdrawn'); ML.render(); };
ML.act.dismiss = (id) => { ML.listing(id).reported = false; ML.save(); ML.render(); };
