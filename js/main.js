/* main.js – router, role-based navigation and route guards. */
// [path pattern, required role ('any' = any logged-in user, null = public), render function]
ML.routes = [
  ['/', null, () => ML.pages.landing()],
  ['/market', null, (a, q) => ML.pages.market(q)],
  ['/l/:id', null, (a) => ML.pages.listing(a.id)],
  ['/login/:role', null, (a) => ML.pages.login(a.role)],
  ['/register/:role', null, (a) => ML.pages.register(a.role)],
  ['/ussd', null, () => ML.pages.ussd()],
  ['/notifications', 'any', () => ML.pages.notifications()],
  ['/farmer', 'farmer', () => ML.pages.farmerHome()],
  ['/farmer/listings', 'farmer', () => ML.pages.farmerListings()],
  ['/farmer/new', 'farmer', (a, q) => ML.pages.farmerForm(null, q)],
  ['/farmer/edit/:id', 'farmer', (a, q) => ML.pages.farmerForm(a.id, q)],
  ['/farmer/freshness', 'farmer', () => ML.pages.freshness()],
  ['/farmer/enquiries', 'farmer', () => ML.pages.farmerEnquiries()],
  ['/farmer/ecard', 'farmer', () => ML.pages.ecard()],
  ['/farmer/ecard/:id', 'farmer', (a) => ML.pages.ecard(a.id)],
  ['/buyer', 'buyer', () => ML.pages.buyerHome()],
  ['/buyer/enquiries', 'buyer', () => ML.pages.buyerEnquiries()],
  ['/admin', 'admin', () => ML.pages.adminHome()],
  ['/admin/listings', 'admin', () => ML.pages.adminListings()],
  ['/admin/reports', 'admin', () => ML.pages.adminReports()],
  ['/admin/members', 'admin', () => ML.pages.adminMembers()]];

ML.NAV = {
  public: [['/', 'Home'], ['/market', 'Marketplace'], ['/ussd', 'USSD'], ['/login/farmer', 'Farmer login'], ['/login/buyer', 'Buyer login'], ['/login/admin', 'Cooperative login']],
  farmer: [['/farmer', 'Dashboard'], ['/farmer/listings', 'My listings'], ['/farmer/freshness', 'Freshness'], ['/farmer/enquiries', 'Enquiries'], ['/farmer/ecard', 'E-cards'], ['/ussd', 'USSD'], ['/market', 'Marketplace']],
  buyer: [['/buyer', 'Dashboard'], ['/market', 'Marketplace'], ['/buyer/enquiries', 'My enquiries']],
  admin: [['/admin', 'Overview'], ['/admin/listings', 'Listings'], ['/admin/reports', 'Reports'], ['/admin/members', 'Members']] };

function matchRoute(pattern, path) {
  const a = pattern.split('/'), b = path.split('/'); if (a.length !== b.length) return null; const params = {};
  for (let i = 0; i < a.length; i++) { if (a[i][0] === ':') params[a[i].slice(1)] = decodeURIComponent(b[i]); else if (a[i] !== b[i]) return null; }
  return params;
}

function renderNav(path) {
  const me = ML.me(), items = ML.NAV[me ? me.role : 'public'], n = ML.unreadCount();
  document.getElementById('top').innerHTML = `<div class="bar"><a class="logo" href="#${me ? ML.HOME[me.role] : '/'}">🌾 MavunoLoop</a><nav>
    ${items.map(([p, t]) => `<a href="#${p}" class="${path === p ? 'on' : ''}">${t}</a>`).join('')}
    ${me ? `<a href="#/notifications" class="${path === '/notifications' ? 'on' : ''}">Alerts${n ? ' (' + n + ')' : ''}</a>` : ''}</nav>
    ${me ? `<span class="who">${me.role === 'admin' ? 'Board' : ML.esc(me.name.split(' ')[0])}</span><a class="out" href="#/" onclick="ML.act.logout()">Log out</a>` : ''}</div>`;
}
ML.act.logout = () => { ML.logout(); ML.toast('Logged out'); };

ML.render = function () {
  const [path, qs] = (location.hash.slice(1) || '/').split('?'), query = new URLSearchParams(qs || ''), me = ML.me();
  document.title = 'MavunoLoop – Sell before it spoils';
  let html = '<div class="card">Page not found. <a href="#/">Go home</a></div>', routeName = '';
  for (const [pattern, role, fn] of ML.routes) {
    const params = matchRoute(pattern, path); if (!params) continue;
    if (role && !me) { ML.go(role === 'any' ? '/login/farmer' : '/login/' + role); return; }       // not logged in
    if (role && role !== 'any' && me.role !== role) { ML.toast('That page is for ' + role + 's'); ML.go(ML.HOME[me.role]); return; } // wrong role
    if (!role && /^\/(login|register)\//.test(pattern) && me) { ML.go(ML.HOME[me.role]); return; }                                 // already logged in
    html = fn(params, query); routeName = pattern.includes('ecard') ? 'ecard' : ''; break;
  }
  renderNav(path); document.getElementById('app').innerHTML = html; window.scrollTo(0, 0);
  if (ML.afterRender) ML.afterRender(routeName);
};

window.addEventListener('hashchange', ML.render);
ML.runChecker();
ML.render();
ML.chat.init();
ML.floaters();
