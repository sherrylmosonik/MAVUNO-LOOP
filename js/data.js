/* data.js – constants, reviewed catalogue and sample data. Everything hangs off the global ML object. */
window.ML = { pages: {}, act: {} };

ML.PLACES = ['Eldoret', 'Kitale', 'Nakuru', 'Kericho', 'Nyeri', 'Kisumu', 'Nairobi', 'Thika', 'Meru', 'Bungoma'];

// ILLUSTRATIVE shelf-life estimates in days (ambient storage). Must be validated with agricultural guidance.
ML.SHELF = { tomato: 7, kale: 4, cabbage: 14, mango: 7, banana: 7, avocado: 8, potato: 30, onion: 30, maize: 60, beans: 90 };
ML.STORAGE_FACTOR = { cool: 1.5, ambient: 1, sun: 0.6 };
ML.STORAGE_LABEL = { cool: 'Cool / shaded store', ambient: 'Ambient (room)', sun: 'Open sun' };

ML.ALIAS = { // English + Swahili words recognised in search and the listing assistant
  tomato: ['tomato', 'tomatoes', 'nyanya'], maize: ['maize', 'mahindi', 'corn'], kale: ['kale', 'sukuma'],
  beans: ['beans', 'bean', 'maharagwe'], potato: ['potato', 'potatoes', 'viazi'], onion: ['onion', 'onions', 'vitunguu'],
  cabbage: ['cabbage', 'kabichi'], mango: ['mango', 'mangoes', 'embe'], banana: ['banana', 'bananas', 'ndizi'],
  avocado: ['avocado', 'avocados', 'parachichi'] };
ML.EMOJI = { tomato: '🍅', maize: '🌽', kale: '🥬', beans: '🫘', potato: '🥔', onion: '🧅', cabbage: '🥬', mango: '🥭', banana: '🍌', avocado: '🥑' };

// Listing status -> [label, badge class]
ML.STATUS = {
  FRESH: ['Fresh', 'b-green'], ATTENTION: ['Approaching window (est.)', 'b-yellow'], AT_RISK: ['At risk (est.)', 'b-orange'],
  URGENT_REVIEW: ['Urgent review', 'b-red'], SOLD: ['Sold', ''], WITHDRAWN: ['Withdrawn', ''],
  ALTERNATIVE_REVIEW: ['Alternative review', 'b-blue'], ALTERNATIVE_LISTING: ['Alternative use', 'b-blue'], AVAILABLE: ['Available', 'b-green'] };

// Allowed status transitions
ML.TRANSITIONS = {
  FRESH: ['ATTENTION', 'AT_RISK', 'URGENT_REVIEW', 'SOLD', 'WITHDRAWN'],
  ATTENTION: ['FRESH', 'AT_RISK', 'URGENT_REVIEW', 'SOLD', 'WITHDRAWN'],
  AT_RISK: ['FRESH', 'URGENT_REVIEW', 'SOLD', 'WITHDRAWN'],
  URGENT_REVIEW: ['FRESH', 'SOLD', 'WITHDRAWN', 'ALTERNATIVE_REVIEW'],
  ALTERNATIVE_REVIEW: ['ALTERNATIVE_LISTING', 'WITHDRAWN'],
  ALTERNATIVE_LISTING: ['SOLD', 'WITHDRAWN'], AVAILABLE: ['SOLD', 'WITHDRAWN'], SOLD: [], WITHDRAWN: [] };
ML.RISK_ORDER = { FRESH: 0, ATTENTION: 1, AT_RISK: 2, URGENT_REVIEW: 3 };

// Small reviewed catalogue of alternative uses (illustrative). Deteriorated produce is NEVER suggested for food or feed.
ML.CATALOGUE = {
  'maize stalks': [['Dry roughage for livestock', 'Only if dry, mould-free and chemical-free'], ['Mulch or compost input', 'Low risk'], ['Briquette / fuel feedstock', 'Check local rules']],
  'maize husks': [['Mulch or compost input', 'Low risk'], ['Craft or fuel use', 'Low risk']],
  'bean stalks': [['Compost input', 'Low risk'], ['Dry fodder', 'Only if clean, dry and mould-free']],
  'deteriorated produce': [['Compost input', 'NOT for food or animal feed'], ['Biogas digester feedstock', 'NOT for food or feed; needs a buyer with a digester']] };

// Sample data (illustrative). Demo accounts are NOT secure authentication.
ML.seed = function () {
  const n = Date.now(), ago = (d) => new Date(n - d * 864e5).toISOString();
  const L = (id, sel, type, crop, title, q, u, p, loc, harvestDaysAgo, st, stg, extra) => Object.assign({
    id, sel, type, crop, title, q, u, p, loc, h: harvestDaysAgo == null ? null : ago(harvestDaysAgo), stg, cond: 'good', st,
    avail: 'This week', upd: ago(0.2), created: ago(2), draft: false, hidden: false, reported: false, cc: 0, img: null }, extra || {});
  return {
    clock: 0, session: null,
    users: [
      { id: 'u1', role: 'farmer', name: 'Wanjiku Kiprono', email: 'farmer@mavunoloop.demo', pass: 'farmer123', phone: '0700 000 001', loc: 'Eldoret' },
      { id: 'u2', role: 'farmer', name: 'Otieno Barasa', email: 'otieno@mavunoloop.demo', pass: 'farmer123', phone: '0700 000 002', loc: 'Kitale' },
      { id: 'b1', role: 'buyer', name: 'Amina Chebet', org: 'Chebet Fresh Traders', email: 'buyer@mavunoloop.demo', pass: 'buyer123', phone: '0700 000 003', loc: 'Eldoret' },
      { id: 'a1', role: 'admin', name: 'Uasin Gishu Farmers Cooperative Board', email: 'board@mavunoloop.demo', pass: 'board123', loc: 'Eldoret' } ],
    listings: [
      L('l1', 'u1', 'produce', 'tomato', 'Tomatoes – Eldoret', 120, 'kg', 60, 'Eldoret', 1, 'FRESH', 'ambient'),
      L('l2', 'u1', 'produce', 'tomato', 'Tomatoes – sell soon', 80, 'kg', 45, 'Eldoret', 6, 'AT_RISK', 'ambient'),
      L('l3', 'u1', 'produce', 'maize', 'Dry maize, 90 kg bags', 20, 'bags', 3200, 'Eldoret', 10, 'FRESH', 'cool'),
      L('l4', 'u1', 'residue', 'maize stalks', 'Maize stalks', 3, 'tonnes', 2000, 'Eldoret', null, 'AVAILABLE', 'ambient', { intended: 'Livestock roughage or mulch' }),
      L('l5', 'u2', 'produce', 'kale', 'Sukuma wiki (kale)', 40, 'kg', 50, 'Kitale', 2, 'FRESH', 'ambient'),
      L('l6', 'u2', 'residue', 'bean stalks', 'Bean stalks', 500, 'kg', 4, 'Kitale', null, 'AVAILABLE', 'ambient', { intended: 'Compost' }) ],
    notifs: [], history: [],
    enquiries: [{ id: 'e0', lid: 'l1', buyerId: 'b1', buyerName: 'Amina Chebet', qty: 50, msg: 'Sample: I need 50 kg of tomatoes this week.', status: 'new', at: ago(0.5) }] };
};
