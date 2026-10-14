/* pages-buyer.js – buyer dashboard and enquiry tracking. */
ML.pages.buyerHome = function () {
  const me = ML.me(), mineEnq = ML.S.enquiries.filter((e) => e.buyerId === me.id);
  const urgent = ML.S.listings.filter(ML.isVisible).filter((l) => ['ATTENTION', 'AT_RISK'].includes(l.st));
  const nearby = ML.S.listings.filter(ML.isVisible).filter((l) => l.loc === me.loc);
  return `<section class="hero slim">${ML.SCENE}<div class="hero-in"><h1>Hello, ${ML.esc(me.name.split(' ')[0])}</h1><p>Find produce and residues near you.</p></div></section>
    <form onsubmit="return ML.act.heroSearch(event)" role="search"><label for="q">Find produce or residues</label>
    <div class="row"><input id="q" placeholder="e.g. 50 kg tomatoes Eldoret" style="flex:3 1 240px"><button class="btn" style="flex:1 1 100px">Search</button></div></form>
    <div class="grid" style="margin-top:14px">${ML.stat(mineEnq.length, 'My enquiries', '/buyer/enquiries')}${ML.stat(urgent.length, 'Urgent listings now', '/market?sort=urgent')}${ML.stat(nearby.length, 'Listings in ' + ML.esc(me.loc), '/market?place=' + encodeURIComponent(me.loc))}</div>
    <h2>Good-value urgent listings</h2><p class="muted">Estimated to need a quick sale. Check quality yourself before buying.</p>${ML.grid(urgent, 'No urgent listings right now.')}
    <h2>Near you (${ML.esc(me.loc)})</h2>${ML.grid(nearby, 'Nothing listed near you yet.')}`;
};
ML.pages.buyerEnquiries = function () {
  const list = ML.S.enquiries.filter((e) => e.buyerId === ML.me().id);
  return `<h1>My enquiries</h1>${list.map((e) => { const l = ML.listing(e.lid); return `<div class="card" style="margin:10px 0"><b><a href="#/l/${l.id}">${ML.esc(l.title)}</a></b> ${ML.badge(l)}<br>
    You asked for ${e.qty} ${ML.esc(l.u)}<br><span class="muted">${ML.ago(e.at)} · ${e.status === 'new' ? 'Waiting for farmer' : 'Farmer responded'}</span></div>`; }).join('') || '<p class="card muted">No enquiries yet. <a href="#/market">Browse the marketplace</a>.</p>'}`;
};
