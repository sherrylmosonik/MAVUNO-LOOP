/* store.js – app state, local persistence, demo login, notifications, status changes. */
ML.KEY = 'mavunoloop.v2';
ML.DAY = 864e5;

ML.load = function () { try { return JSON.parse(localStorage.getItem(ML.KEY)) || ML.seed(); } catch (e) { return ML.seed(); } };
ML.save = function () { try { localStorage.setItem(ML.KEY, JSON.stringify(ML.S)); } catch (e) { ML.toast('Could not save locally (storage full?)'); } };
ML.reset = function () { ML.S = ML.seed(); ML.save(); };
ML.S = ML.load();

ML.now = () => Date.now() + ML.S.clock * ML.DAY;           // simulated clock (used by demo tools)
ML.iso = () => new Date(ML.now()).toISOString();
ML.uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
ML.user = (id) => ML.S.users.find((u) => u.id === id);
ML.me = () => ML.user(ML.S.session);
ML.listing = (id) => ML.S.listings.find((l) => l.id === id);

// --- Demo authentication: stored in the browser only. Replace with Supabase Auth in production. ---
ML.login = function (email, pass, role) {
  const u = ML.S.users.find((x) => x.email === email.trim().toLowerCase() && x.pass === pass && x.role === role);
  if (!u) return false;
  ML.S.session = u.id; ML.save(); return true;
};
ML.logout = function () { ML.S.session = null; ML.save(); };
ML.register = function (d) {
  if (ML.S.users.some((u) => u.email === d.email)) return 'That email is already registered.';
  const u = Object.assign({ id: ML.uid('u') }, d); ML.S.users.push(u); ML.S.session = u.id; ML.save(); return null;
};
ML.HOME = { farmer: '/farmer', buyer: '/buyer', admin: '/admin' };

// --- Notifications: in-app only. SMS/email are simulated and labelled as such. `key` prevents duplicates. ---
ML.notify = function (uid, lid, type, title, msg, key, sms) {
  if (key && ML.S.notifs.some((n) => n.key === key)) return;
  ML.S.notifs.unshift({ id: ML.uid('n'), uid, lid, type, title, msg, key, sms: sms || '', channel: 'in-app', delivery: 'delivered in-app · SMS simulated', at: ML.iso(), read: false });
};

// --- Status changes are validated against ML.TRANSITIONS and logged ---
ML.setStatus = function (l, next, reason) {
  if (l.st === next) return true;
  if (!(ML.TRANSITIONS[l.st] || []).includes(next)) { ML.toast('Change from ' + l.st + ' to ' + next + ' is not allowed'); return false; }
  ML.S.history.push({ lid: l.id, from: l.st, to: next, reason, at: ML.iso() });
  l.st = next; l.upd = ML.iso(); return true;
};
