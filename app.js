'use strict';

/* =========================================================================
   LAN Chat - browser app
   ========================================================================= */

const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

const ICONS = {
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  clip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  mic: '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  reply: '<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>',
  edit: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  hash: '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
  bellOff: '<path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
};
const icon = (name, size = 18) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const EMOJIS = ('😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😛 😜 🤪 😎 🤩 🥳 😏 😒 😞 😔 😕 🙁 😣 😫 😩 🥺 😢 😭 😤 😠 😡 🤯 😳 🥵 🥶 😱 😨 🤔 🤭 🤫 🙄 😬 😴 🤤 😷 🤒 🤢 🤮 🤧 😵 🤠 🤡 👻 💀 👽 🤖 💩 😺 ' +
  '👍 👎 👌 ✌️ 🤞 🤟 🤘 👏 🙌 🙏 💪 👋 🤝 👀 🧠 🫶 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💯 ✨ 🔥 ⭐ 🎉 🎊 🎁 🎂 🍕 🍔 🍟 🌮 🍩 🍪 ☕ 🍺 🍻 ⚽ 🏀 🎮 🎵 🎶 📷 💻 📱 💡 📌 ✅ ❌ ⚠️ ❓ ❗ 💤 🚀 🌈 ☀️ 🌙 ❄️ 🐶 🐱 🦊 🐼 🦄').split(' ');
const QUICK_REACTIONS = ['👍', '❤️', '😂'];
const COLORS = ['#5b5bf0', '#e5484d', '#f76b15', '#d4a017', '#2fb36b', '#12a594', '#0091ff', '#8e4ec6', '#d6409f', '#6b7280'];

/* ---------------- state ---------------- */
const S = {
  me: null, users: {}, rooms: {}, online: new Set(), inviteUrl: '', maxUpload: 10 * 1024 * 1024,
  current: null, msgs: {}, nodes: new Map(), typing: {}, divider: {}, drafts: {},
  replyTo: null, editing: null, stick: true, newBelow: 0,
  panel: null, panelArg: '', searchAll: false, mention: null, emojiCb: null,
  es: null, connectedOnce: false, rec: null, modalResolve: null,
};
const prefs = (() => { try { return JSON.parse(localStorage.getItem('lanchat-prefs')) || {}; } catch { return {}; } })();
const savePrefs = () => { try { localStorage.setItem('lanchat-prefs', JSON.stringify(prefs)); } catch { /* private mode */ } };

const input = $('#input');
const box = $('#messages');

/* ---------------- helpers ---------------- */
async function api(path, data) {
  const opts = { method: data === undefined ? 'GET' : 'POST', headers: {}, credentials: 'same-origin' };
  if (data !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(data); }
  let res;
  try { res = await fetch(path, opts); } catch { throw Object.assign(new Error("Can't reach the server"), { status: 0 }); }
  let body = {};
  try { body = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw Object.assign(new Error(body.error || `Request failed (${res.status})`), { status: res.status });
  return body;
}

const isMobile = () => matchMedia('(max-width: 760px)').matches;
const userName = id => (S.users[id] || {}).display_name || 'Unknown';
const firstName = id => userName(id).split(' ')[0];
const initials = name => (String(name || '?').trim().split(/\s+/).map(w => [...w][0] || '').join('').slice(0, 2) || '?').toUpperCase();
const colorFor = str => COLORS[[...String(str)].reduce((a, c) => a + c.codePointAt(0), 0) % COLORS.length];
const otherId = r => r.members.find(id => id !== S.me.id) ?? S.me.id;
const roomName = r => r.kind === 'dm' ? (otherId(r) === S.me.id ? `${S.me.display_name} (you)` : userName(otherId(r))) : r.name;
const lastActivity = r => (r.last_message ? r.last_message.created_at : r.created_at) || 0;
const fmtSize = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
const fmtTime = t => new Date(t * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const fmtFull = t => new Date(t * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

function dayLabel(t) {
  const d = new Date(t * 1000), now = new Date(), y = new Date();
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}
function shortTime(t) {
  const d = new Date(t * 1000), now = new Date();
  if (d.toDateString() === now.toDateString()) return fmtTime(t);
  if (now - d < 6 * 864e5) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
function ago(t) {
  if (!t) return 'a while ago';
  const s = Date.now() / 1000 - t;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t * 1000).toLocaleDateString();
}

function avatar(uid, size = 36, dot = false) {
  const u = S.users[uid] || { display_name: '?', color: '#888' };
  const inner = u.avatar ? `<img src="${esc(u.avatar)}" alt="">` : esc(initials(u.display_name));
  const online = dot && S.online.has(uid) ? '<i class="dot"></i>' : '';
  return `<span class="avatar" style="--s:${size}px;--c:${esc(u.color || '#888')}">${inner}${online}</span>`;
}
function roomAvatar(r, size = 36) {
  if (r.kind === 'dm') return avatar(otherId(r), size, true);
  if (r.kind === 'public') return `<span class="avatar room" style="--s:${size}px">${icon('hash', Math.round(size * .5))}</span>`;
  return `<span class="avatar group" style="--s:${size}px;--c:${colorFor(r.name)}">${esc(initials(r.name))}</span>`;
}

function toast(msg) {
  const t = h(`<div class="toast">${esc(msg)}</div>`);
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3000);
}
function progressToast(label) {
  const t = h(`<div class="toast"><div>${esc(label)}</div><div class="progress"><i></i></div></div>`);
  $('#toasts').append(t);
  return { set: p => { t.querySelector('i').style.width = `${Math.round(p * 100)}%`; }, done: () => t.remove() };
}
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const ta = h('<textarea style="position:fixed;opacity:0"></textarea>');
  ta.value = text; document.body.append(ta); ta.select();
  try { document.execCommand('copy'); } finally { ta.remove(); }
}

/* ---------------- message formatting ---------------- */
const URL_RE = /\bhttps?:\/\/[^\s<]+[^\s<.,:;"')\]!?]/g;
const usersByName = () => Object.fromEntries(Object.values(S.users).map(u => [u.username.toLowerCase(), u]));

function formatInline(text, names) {
  return text.split(/(`[^`\n]+`)/).map(seg => {
    if (/^`[^`\n]+`$/.test(seg)) return `<code>${esc(seg.slice(1, -1))}</code>`;
    let s = esc(seg);
    s = s.replace(URL_RE, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
    s = s.replace(/\*\*(?=\S)(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*(?=\S)([^*\n]+?)\*(?=$|[\s).,!?:;])/g, '$1<em>$2</em>')
      .replace(/~~(?=\S)(.+?)~~/g, '<del>$1</del>');
    s = s.replace(/(^|\s)@([A-Za-z0-9_.-]{2,24})/g, (m, pre, name) => {
      const u = names[name.toLowerCase()];
      return u ? `${pre}<span class="mention${u.id === S.me.id ? ' me' : ''}">@${esc(u.username)}</span>` : m;
    });
    return s.replace(/\n/g, '<br>');
  }).join('');
}
function formatBody(text) {
  const names = usersByName();
  const parts = String(text).split('```');
  if (parts.length % 2 === 0) { const last = parts.pop(); parts[parts.length - 1] += '```' + last; }
  return parts.map((p, i) => i % 2
    ? `<pre><code>${esc(p.replace(/^[\w+#-]*\n/, '').replace(/\n$/, ''))}</code></pre>`
    : formatInline(p, names)).join('');
}
const isBigEmoji = text => text.length <= 24 && /\p{Extended_Pictographic}/u.test(text) && !/[0-9#*]/.test(text)
  && /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\s|‍|️)+$/u.test(text);
const mentionsMe = text => !!text && new RegExp(`(^|\\s)@${S.me.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.-])`, 'i').test(text);

/* ---------------- auth ---------------- */
let authMode = 'login';
$('#auth-tabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  authMode = b.dataset.tab;
  $('#auth-tabs').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
  $('#auth-form').classList.toggle('register', authMode === 'register');
  $('#auth-submit').textContent = authMode === 'login' ? 'Sign in' : 'Create account';
  $('#auth-form [name=password]').autocomplete = authMode === 'login' ? 'current-password' : 'new-password';
  $('#auth-error').textContent = '';
});
$('#auth-form').addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const btn = $('#auth-submit'); btn.disabled = true;
  try {
    await api(authMode === 'login' ? '/api/login' : '/api/register', data);
    await loadBootstrap();
    showApp();
    connect();
  } catch (err) {
    $('#auth-error').textContent = err.message;
  } finally { btn.disabled = false; }
});
function showAuth() {
  $('#app').classList.add('hidden');
  $('#auth').classList.remove('hidden');
  setTimeout(() => $('#auth-form [name=username]').focus(), 50);
}

/* ---------------- bootstrap & live connection ---------------- */
async function loadBootstrap() {
  const d = await api('/api/bootstrap');
  S.me = d.me; S.inviteUrl = d.invite_url; S.maxUpload = d.max_upload;
  S.users = {}; d.users.forEach(u => { S.users[u.id] = u; });
  S.rooms = {}; d.rooms.forEach(r => { S.rooms[r.id] = r; });
  S.online = new Set(d.users.filter(u => u.online).map(u => u.id));
}

function showApp() {
  $('#auth').classList.add('hidden');
  $('#app').classList.remove('hidden');
  renderMe(); renderSidebar(); renderEmpty(); updateTitle();
  const last = S.rooms[prefs.lastRoom] ? prefs.lastRoom : Object.values(S.rooms).find(r => r.kind === 'public')?.id;
  if (!isMobile() && last) openRoom(last);
}

function connect() {
  if (S.es) S.es.close();
  const es = new EventSource('/api/stream');
  S.es = es;
  es.onmessage = e => { try { handleEvent(JSON.parse(e.data)); } catch (err) { console.error(err); } };
  es.onerror = () => {
    $('#conn').classList.remove('hidden');
    if (es.readyState === EventSource.CLOSED) setTimeout(() => { if (S.es === es) connect(); }, 3000);
    checkSession();
  };
}
let checkingSession = false;
async function checkSession() {
  if (checkingSession) return;
  checkingSession = true;
  try { await api('/api/bootstrap'); } catch (e) { if (e.status === 401) { S.es?.close(); S.es = null; showAuth(); } }
  setTimeout(() => { checkingSession = false; }, 5000);
}

async function resync() {
  try { await loadBootstrap(); } catch { return; }
  S.msgs = {}; S.nodes.clear();
  renderMe(); renderSidebar(); updateTitle();
  if (S.current && S.rooms[S.current]) {
    try { await loadMessages(S.current); } catch { /* ignore */ }
    renderHeader(); renderMessages('bottom');
  } else if (S.current) closeRoom();
}

function handleEvent(ev) {
  switch (ev.type) {
    case 'hello':
      $('#conn').classList.add('hidden');
      S.online = new Set(ev.online);
      if (S.connectedOnce) resync();
      S.connectedOnce = true;
      renderSidebar(); renderHeader();
      break;
    case 'message': onMessage(ev.message); break;
    case 'message_update': onMessageUpdate(ev.message); break;
    case 'room': onRoom(ev.room); break;
    case 'room_removed': onRoomRemoved(ev.room_id); break;
    case 'typing': onTyping(ev); break;
    case 'read': onRead(ev); break;
    case 'presence': onPresence(ev); break;
    case 'user': onUser(ev.user); break;
  }
}

function addToCache(c, m) {
  const i = c.list.findIndex(x => x.id === m.id);
  if (i >= 0) { c.list[i] = m; return; }
  if (!c.list.length || m.id > c.list[c.list.length - 1].id) c.list.push(m);
  else { c.list.push(m); c.list.sort((a, b) => a.id - b.id); }
}

function onMessage(m) {
  const r = S.rooms[m.room_id];
  if (!r) { resync(); return; }
  const c = S.msgs[m.room_id];
  if (c) addToCache(c, m);
  r.last_message = { id: m.id, user_id: m.user_id, text: m.body || (m.file ? `📎 ${m.file.name}` : ''), created_at: m.created_at, system: m.system };
  if (S.typing[m.room_id]) delete S.typing[m.room_id][m.user_id];
  const mine = m.user_id === S.me.id;
  const here = S.current === m.room_id && !document.hidden;
  if (mine && !m.system) {
    r.last_read = Math.max(r.last_read, m.id); r.unread = 0;
    (r.reads ||= {})[S.me.id] = m.id;
  } else if (!mine && !m.system) {
    if (!(here && S.stick)) r.unread = (r.unread || 0) + 1;
    if (!here && (!r.muted || mentionsMe(m.body))) notify(m, r);
    if (S.current === m.room_id && !S.stick) { S.newBelow++; updateJump(); }
  }
  if (S.current === m.room_id) {
    renderMessages(mine && !m.system ? 'bottom' : undefined);
    renderTyping();
    markRead();
  }
  renderSidebar(); updateTitle();
}

function onMessageUpdate(m) {
  const c = S.msgs[m.room_id];
  if (c) {
    addToCache(c, m);
    c.list.forEach(x => { if (x.reply && x.reply.id === m.id) x.reply = { ...x.reply, deleted: m.deleted, text: m.body || (m.file ? `📎 ${m.file.name}` : '') }; });
  }
  if (S.current === m.room_id) {
    renderMessages();
    if (S.panel === 'pins') renderPanel();
  }
}

function onRoom(r) {
  S.rooms[r.id] = r;
  renderSidebar(); updateTitle();
  if (S.current === r.id) { renderHeader(); if (S.panel === 'info') renderPanel(); renderMessages(); }
}
function onRoomRemoved(id) {
  delete S.rooms[id]; delete S.msgs[id];
  if (S.current === id) closeRoom();
  renderSidebar(); updateTitle();
}
function onTyping(ev) {
  (S.typing[ev.room_id] ||= {})[ev.user_id] = Date.now() + 4000;
  renderTyping(); renderSidebar();
  setTimeout(() => { renderTyping(); renderSidebar(); }, 4100);
}
function onRead(ev) {
  const r = S.rooms[ev.room_id]; if (!r) return;
  r.reads ||= {};
  r.reads[ev.user_id] = Math.max(r.reads[ev.user_id] || 0, ev.message_id);
  if (ev.user_id === S.me.id) {
    r.last_read = Math.max(r.last_read, ev.message_id);
    if (!r.last_message || ev.message_id >= r.last_message.id) r.unread = 0;
    renderSidebar(); updateTitle();
  }
  if (ev.room_id === S.current) renderMessages();
}
function onPresence(ev) {
  if (ev.online) S.online.add(ev.user_id); else S.online.delete(ev.user_id);
  if (S.users[ev.user_id] && ev.last_seen) S.users[ev.user_id].last_seen = ev.last_seen;
  renderSidebar(); renderHeader();
  if (S.panel === 'info') renderPanel();
}
function onUser(u) {
  S.users[u.id] = u;
  if (u.online) S.online.add(u.id);
  if (u.id === S.me.id) { S.me = u; renderMe(); }
  // public channels include everyone, so a new account joins them
  Object.values(S.rooms).forEach(r => { if (r.kind === 'public' && !r.members.includes(u.id)) r.members.push(u.id); });
  renderSidebar(); renderHeader();
  if (S.current) renderMessages();
}

/* ---------------- notifications ---------------- */
let audioCtx = null, lastBeep = 0;
function beep() {
  if (prefs.sound === false || Date.now() - lastBeep < 800) return;
  lastBeep = Date.now();
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(740, t);
    o.frequency.exponentialRampToValueAtTime(1180, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.32);
  } catch { /* audio not available */ }
}
function notify(m, r) {
  beep();
  if (prefs.notify === false || !('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
  const who = r.kind === 'dm' ? '' : `${userName(m.user_id)}: `;
  const n = new Notification(r.kind === 'public' ? `#${r.name}` : roomName(r), {
    body: who + (m.body || `📎 ${m.file ? m.file.name : 'Attachment'}`), tag: `room-${r.id}`,
  });
  n.onclick = () => { window.focus(); openRoom(r.id); n.close(); };
}
function updateTitle() {
  const n = Object.values(S.rooms).reduce((a, r) => a + (r.muted ? 0 : r.unread || 0), 0);
  document.title = n ? `(${n}) LAN Chat` : 'LAN Chat';
}

/* ---------------- sidebar ---------------- */
function renderMe() {
  if (!S.me) return;
  $('#me-btn').innerHTML = `${avatar(S.me.id, 38, true)}<span style="min-width:0"><b>${esc(S.me.display_name)}</b><small>${esc(S.me.status || '@' + S.me.username)}</small></span>`;
}
function typers(rid) {
  const t = S.typing[rid] || {}, now = Date.now();
  return Object.keys(t).filter(id => t[id] > now).map(Number);
}
function previewText(r) {
  if (typers(r.id).length) return '<em>typing…</em>';
  const lm = r.last_message;
  if (!lm) return r.kind === 'public' ? esc(r.topic || 'No messages yet') : 'No messages yet';
  if (lm.system) return esc(lm.text);
  const who = lm.user_id === S.me.id ? 'You: ' : r.kind !== 'dm' ? `${firstName(lm.user_id)}: ` : '';
  return esc(who + lm.text);
}
function roomItem(r) {
  const badge = r.unread ? `<span class="badge${r.muted ? ' muted' : ''}">${r.unread > 99 ? '99+' : r.unread}</span>` : '';
  const label = r.kind === 'public' ? r.name : roomName(r);
  return `<button class="side-item${r.id === S.current ? ' active' : ''}${r.unread && !r.muted ? ' unread' : ''}" data-room="${r.id}">
    ${roomAvatar(r, 40)}
    <span class="si-main"><span class="si-top"><span class="si-name">${esc(label)}</span><time>${r.last_message ? shortTime(r.last_message.created_at) : ''}</time></span>
    <span class="si-sub">${previewText(r)}</span></span>
    ${r.muted ? `<span class="mute-ico">${icon('bellOff', 14)}</span>` : ''}${badge}</button>`;
}
function personItem(u) {
  const sub = u.id === S.me.id ? 'Notes to yourself' : S.online.has(u.id) ? '<span class="online-text">online</span>' : `last seen ${ago(u.last_seen)}`;
  return `<button class="side-item" data-user="${u.id}">${avatar(u.id, 40, true)}
    <span class="si-main"><span class="si-top"><span class="si-name">${esc(u.id === S.me.id ? 'You' : u.display_name)}</span></span>
    <span class="si-sub">${sub}${u.status && u.id !== S.me.id ? ' · ' + esc(u.status) : ''}</span></span></button>`;
}
function section(title, body, action) {
  return `<div class="side-section"><div class="side-section-head"><span>${title}</span>${action ? `<button class="icon-btn" data-action="${action}" title="New">${icon('plus', 15)}</button>` : ''}</div>${body}</div>`;
}
function renderSidebar() {
  if (!S.me) return;
  const qv = $('#side-search').value.trim().toLowerCase();
  const rooms = Object.values(S.rooms);
  const match = r => !qv || roomName(r).toLowerCase().includes(qv) || (r.topic || '').toLowerCase().includes(qv);
  const channels = rooms.filter(r => r.kind === 'public' && match(r)).sort((a, b) => a.name.localeCompare(b.name));
  const chats = rooms.filter(r => r.kind !== 'public' && match(r)).sort((a, b) => lastActivity(b) - lastActivity(a));
  const withDm = new Set(rooms.filter(r => r.kind === 'dm').map(otherId));
  const people = Object.values(S.users)
    .filter(u => !withDm.has(u.id) && (!qv || `${u.display_name} ${u.username}`.toLowerCase().includes(qv)))
    .sort((a, b) => (a.id === S.me.id) - (b.id === S.me.id) || S.online.has(b.id) - S.online.has(a.id) || a.display_name.localeCompare(b.display_name));
  const none = text => `<div class="side-empty">${text}</div>`;
  let html = '';
  if (qv.length >= 2) html += `<button class="side-item search-all" data-action="search-messages">${icon('search', 18)}<span>Search messages for “${esc(qv)}”</span></button>`;
  html += section('Channels', channels.map(roomItem).join('') || none(qv ? 'No matches' : 'No channels'), 'new-channel');
  html += section('Chats', chats.map(roomItem).join('') || none(qv ? 'No matches' : 'Tap someone below to start chatting'), 'new-group');
  html += section('People', people.map(personItem).join('') || none(qv ? 'No matches' : 'Everyone is already in your chats'));
  $('#side-list').innerHTML = html;
}
$('#side-list').addEventListener('click', e => {
  const t = e.target.closest('[data-room],[data-user],[data-action]'); if (!t) return;
  if (t.dataset.room) openRoom(+t.dataset.room);
  else if (t.dataset.user) openDM(+t.dataset.user);
  else if (t.dataset.action === 'new-channel') newRoomModal('public');
  else if (t.dataset.action === 'new-group') newRoomModal('group');
  else if (t.dataset.action === 'search-messages') { S.searchAll = true; openPanel('search', $('#side-search').value.trim()); }
});
$('#side-search').addEventListener('input', renderSidebar);
$('#side-search').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value.trim().length >= 2) { S.searchAll = true; openPanel('search', e.target.value.trim()); }
  if (e.key === 'Escape') { e.target.value = ''; renderSidebar(); }
});

async function openDM(uid) {
  const existing = Object.values(S.rooms).find(r => r.kind === 'dm' && otherId(r) === uid);
  if (existing) return openRoom(existing.id);
  try {
    const d = await api('/api/dm', { user_id: uid });
    S.rooms[d.room.id] = d.room;
    $('#side-search').value = '';
    openRoom(d.room.id);
  } catch (e) { toast(e.message); }
}

/* ---------------- opening a conversation ---------------- */
function renderEmpty() {
  $('#empty-state').innerHTML = `<div><div class="big">💬</div><h2>Welcome, ${esc(S.me.display_name.split(' ')[0])}!</h2>
    <p>Pick a channel or a person on the left to start chatting.</p>
    <div class="invite"><span>Invite friends - anyone with this link can join</span><code>${esc(S.inviteUrl)}</code>
    <button class="btn small" id="copy-invite">${icon('copy', 15)} Copy link</button></div></div>`;
  $('#copy-invite').onclick = () => { copyText(S.inviteUrl); toast('Link copied'); };
}

async function loadMessages(rid, before) {
  const d = await api(`/api/messages?room=${rid}${before ? `&before=${before}` : ''}`);
  let c = S.msgs[rid];
  if (!c) c = S.msgs[rid] = { list: [], hasMore: false, loading: false };
  d.messages.forEach(m => addToCache(c, m));
  if (before || !c.loaded) c.hasMore = d.has_more;
  c.loaded = true;
  return c;
}

async function openRoom(rid, opts = {}) {
  const r = S.rooms[rid]; if (!r) return;
  if (S.current === rid && S.msgs[rid]?.loaded && !opts.jumpTo) {
    document.body.classList.add('chat-open');
    if (!isMobile()) input.focus();
    return;
  }
  if (S.current && S.current !== rid) S.drafts[S.current] = input.value;
  if (S.current !== rid) {
    cancelCompose();
    S.divider[rid] = r.unread > 0 ? r.last_read : null;
  }
  S.current = rid; S.newBelow = 0; S.stick = true;
  prefs.lastRoom = rid; savePrefs();
  document.body.classList.add('chat-open');
  $('#empty-state').classList.add('hidden');
  $('#chat-view').classList.remove('hidden');
  input.value = S.drafts[rid] || ''; autosize();
  input.placeholder = `Message ${r.kind === 'public' ? '#' + r.name : roomName(r)}`;
  hideMention(); updateJump();
  renderHeader(); renderSidebar(); renderTyping();
  if (S.panel) renderPanel();
  if (!S.msgs[rid]?.loaded) {
    box.replaceChildren(h('<div class="msgs-loading">Loading messages…</div>'));
    try { await loadMessages(rid); } catch (e) { toast(e.message); return; }
  }
  if (S.current !== rid) return;
  renderMessages('bottom');
  if (opts.jumpTo) jumpTo(opts.jumpTo);
  markRead();
  if (!isMobile()) input.focus();
}

function closeRoom() {
  if (S.current) S.drafts[S.current] = input.value;
  S.current = null;
  document.body.classList.remove('chat-open');
  $('#chat-view').classList.add('hidden');
  $('#empty-state').classList.remove('hidden');
  closePanel(); renderSidebar();
}
$('#back-btn').onclick = closeRoom;

function renderHeader() {
  const r = S.rooms[S.current]; if (!r) return;
  let sub;
  if (r.kind === 'dm') {
    const o = otherId(r), u = S.users[o] || {};
    sub = o === S.me.id ? 'Notes to yourself' : S.online.has(o) ? '<span class="online-text">online</span>' : `last seen ${ago(u.last_seen)}`;
    if (u.status && o !== S.me.id) sub += ` · ${esc(u.status)}`;
  } else {
    const on = r.members.filter(id => S.online.has(id)).length;
    sub = `${r.topic ? esc(r.topic) + ' · ' : ''}${r.members.length} member${r.members.length === 1 ? '' : 's'}, ${on} online`;
  }
  const name = r.kind === 'public' ? r.name : roomName(r);
  $('#chat-title').innerHTML = `${roomAvatar(r, 38)}<div><h2>${esc(name)}${r.muted ? icon('bellOff', 14) : ''}</h2><p>${sub}</p></div>`;
  document.querySelectorAll('.chat-actions [data-panel]').forEach(b => b.classList.toggle('active', b.dataset.panel === S.panel));
}

/* ---------------- message list ---------------- */
function computeReceipts(r, list) {
  const out = {};
  if (r.kind === 'public' || !list.length) return out;
  for (const [key, lr] of Object.entries(r.reads || {})) {
    const uid = +key;
    if (uid === S.me.id || !lr) continue;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].id <= lr) { if (!list[i].system) (out[list[i].id] ||= []).push(uid); break; }
    }
  }
  return out;
}

function introNode(r) {
  let title, text;
  if (r.kind === 'public') { title = `Welcome to #${r.name}`; text = r.topic || 'This is the very beginning of this channel.'; }
  else if (r.kind === 'dm') {
    const o = otherId(r);
    title = o === S.me.id ? 'Your notes' : userName(o);
    text = o === S.me.id ? 'Jot down notes, links and files for yourself here.' : `This is the beginning of your conversation with ${userName(o)}.`;
  } else { title = r.name; text = 'This is the beginning of the group.'; }
  return h(`<div class="intro">${roomAvatar(r, 64)}<h3>${esc(title)}</h3><p>${esc(text)}</p></div>`);
}

function fileHTML(f) {
  const url = esc(f.url), name = esc(f.name || 'file'), type = f.type || '';
  if (/^image\/(png|jpe?g|gif|webp|bmp|avif)$/.test(type)) return `<div class="msg-file"><img class="msg-img" src="${url}" alt="${name}" loading="lazy" data-action="lightbox"></div>`;
  if (type.startsWith('video/')) return `<div class="msg-file"><video src="${url}" controls preload="metadata" playsinline></video></div>`;
  if (type.startsWith('audio/')) return `<div class="msg-file"><audio src="${url}" controls preload="metadata"></audio></div>`;
  return `<a class="file-card" href="${url}" download="${name}">${icon('file', 24)}<span><b>${name}</b><small>${fmtSize(f.size || 0)} · Download</small></span></a>`;
}

function msgHTML(m, grouped, readers) {
  if (m.system) return `<div class="msg system" data-id="${m.id}"><span>${esc(m.body)}</span><span>·</span><time title="${esc(fmtFull(m.created_at))}">${fmtTime(m.created_at)}</time></div>`;
  const u = S.users[m.user_id] || { display_name: 'Unknown', color: '#888' };
  const mine = m.user_id === S.me.id;
  const mentioned = !mine && !m.deleted && mentionsMe(m.body);
  let content = '';
  if (m.deleted) content = `<div class="msg-body deleted">${icon('trash', 14)} This message was deleted</div>`;
  else {
    if (m.reply) content += `<div class="msg-reply" data-action="jump" data-target="${m.reply.id}"><span class="bar"></span>${icon('reply', 13)}<b style="color:${esc((S.users[m.reply.user_id] || {}).color || 'inherit')}">${esc(userName(m.reply.user_id))}</b><span>${m.reply.deleted ? '<i>deleted message</i>' : esc(m.reply.text)}</span></div>`;
    if (m.body) content += `<div class="msg-body${isBigEmoji(m.body) ? ' big' : ''}">${formatBody(m.body)}${m.edited_at ? '<span class="edited" title="' + esc(fmtFull(m.edited_at)) + '">(edited)</span>' : ''}</div>`;
    if (m.file) content += fileHTML(m.file);
    const rx = Object.entries(m.reactions || {});
    if (rx.length) {
      content += `<div class="reactions">${rx.map(([e, ids]) => `<button class="rx${ids.includes(S.me.id) ? ' mine' : ''}" data-action="react" data-emoji="${esc(e)}" title="${esc(ids.map(userName).join(', '))}">${esc(e)}<span>${ids.length}</span></button>`).join('')}
        <button class="rx" data-action="react-more" title="Add reaction">${icon('smile', 14)}</button></div>`;
    }
  }
  if (readers && readers.length) {
    const r = S.rooms[m.room_id];
    const label = r && r.kind === 'dm' ? 'Seen' : '';
    content += `<div class="receipts" title="Seen by ${esc(readers.map(userName).join(', '))}">${label}${readers.slice(0, 8).map(id => avatar(id, 16)).join('')}${readers.length > 8 ? `+${readers.length - 8}` : ''}</div>`;
  }
  const head = grouped ? '' : `<div class="msg-head"><span class="msg-author" style="color:${esc(u.color)}">${esc(u.display_name)}</span><time class="msg-time" title="${esc(fmtFull(m.created_at))}">${fmtTime(m.created_at)}</time>${m.pinned ? `<span class="msg-pin">${icon('pin', 12)} pinned</span>` : ''}</div>`;
  const pinNote = grouped && m.pinned ? `<span class="msg-pin">${icon('pin', 12)} pinned</span>` : '';
  const actions = m.deleted ? '' : `<div class="msg-actions">
      ${QUICK_REACTIONS.map(e => `<button data-action="react" data-emoji="${e}" title="React ${e}">${e}</button>`).join('')}
      <button data-action="react-more" title="More reactions">${icon('smile', 16)}</button>
      <button data-action="reply" title="Reply">${icon('reply', 16)}</button>
      ${mine && m.body !== undefined ? `<button data-action="edit" title="Edit">${icon('edit', 15)}</button>` : ''}
      <button data-action="pin" title="${m.pinned ? 'Unpin' : 'Pin'}">${icon('pin', 15)}</button>
      ${m.body ? `<button data-action="copy" title="Copy text">${icon('copy', 15)}</button>` : ''}
      ${mine ? `<button data-action="delete" class="danger" title="Delete">${icon('trash', 15)}</button>` : ''}
    </div>`;
  return `<div class="msg${grouped ? ' grouped' : ''}${mentioned ? ' mentioned' : ''}" data-id="${m.id}">
    <div class="msg-gutter">${grouped ? `<div class="hover-time">${fmtTime(m.created_at)}</div>` : avatar(m.user_id, 38)}</div>
    <div class="msg-main">${head}${pinNote}${content}</div>${actions}</div>`;
}

function msgNode(m, grouped, readers) {
  const u = S.users[m.user_id];
  const sig = JSON.stringify([m, grouped, readers || 0, u && [u.display_name, u.color, u.avatar], m.reply && userName(m.reply.user_id)]);
  const hit = S.nodes.get(m.id);
  if (hit && hit.sig === sig) return hit.el;
  const el = h(msgHTML(m, grouped, readers));
  S.nodes.set(m.id, { sig, el });
  return el;
}

function renderMessages(mode) {
  const rid = S.current, r = S.rooms[rid], c = S.msgs[rid];
  if (!r || !c || !c.loaded) return;
  const prevH = box.scrollHeight, prevTop = box.scrollTop, wasAtBottom = S.stick;
  const nodes = [c.hasMore
    ? h(`<div class="msgs-top"><button class="btn small ghost" data-action="load-older">${c.loading ? 'Loading…' : 'Load older messages'}</button></div>`)
    : introNode(r)];
  const receipts = computeReceipts(r, c.list);
  const dv = S.divider[rid];
  let prev = null, lastDay = null, dividerShown = false;
  for (const m of c.list) {
    const day = new Date(m.created_at * 1000).toDateString();
    let broke = false;
    if (day !== lastDay) { nodes.push(h(`<div class="day-sep"><span>${esc(dayLabel(m.created_at))}</span></div>`)); lastDay = day; broke = true; }
    if (dv != null && !dividerShown && m.id > dv && m.user_id !== S.me.id && !m.system) {
      nodes.push(h('<div class="new-sep"><span>New messages</span></div>')); dividerShown = true; broke = true;
    }
    const grouped = !broke && prev && !prev.system && !m.system && !prev.deleted && prev.user_id === m.user_id
      && m.created_at - prev.created_at < 300 && !m.reply;
    nodes.push(msgNode(m, grouped, receipts[m.id]));
    prev = m;
  }
  box.replaceChildren(...nodes);
  if (mode === 'bottom' || (mode !== 'prepend' && wasAtBottom)) { box.scrollTop = box.scrollHeight; S.stick = true; }
  else if (mode === 'prepend') box.scrollTop = box.scrollHeight - prevH + prevTop;
  else box.scrollTop = prevTop;
}

const nearBottom = () => box.scrollHeight - box.scrollTop - box.clientHeight < 80;
box.addEventListener('scroll', () => {
  S.stick = nearBottom();
  if (S.stick && S.newBelow) { S.newBelow = 0; }
  updateJump();
  if (S.stick) markRead();
  if (box.scrollTop < 120) loadOlder();
});
// images load after layout; keep the view pinned to the newest message while they do
box.addEventListener('load', () => { if (S.stick) box.scrollTop = box.scrollHeight; }, true);

function updateJump() {
  const btn = $('#jump-bottom');
  btn.classList.toggle('hidden', S.stick);
  btn.innerHTML = `${S.newBelow ? `${S.newBelow} new ` : ''}${icon('down', 18)}`;
}
$('#jump-bottom').onclick = () => { box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' }); S.newBelow = 0; };

async function loadOlder() {
  const rid = S.current, c = S.msgs[rid];
  if (!c || c.loading || !c.hasMore) return;
  c.loading = true;
  try { await loadMessages(rid, c.list[0]?.id); } catch (e) { toast(e.message); }
  c.loading = false;
  if (S.current === rid) renderMessages('prepend');
}

async function jumpTo(id) {
  const rid = S.current;
  let c = S.msgs[rid];
  for (let i = 0; i < 40 && c && !c.list.some(m => m.id === id) && c.hasMore; i++) {
    await loadMessages(rid, c.list[0]?.id);
    c = S.msgs[rid];
  }
  if (S.current !== rid) return;
  renderMessages('prepend');
  const el = box.querySelector(`.msg[data-id="${id}"]`);
  if (!el) { toast('That message is no longer available'); return; }
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

function markRead() {
  const rid = S.current, r = S.rooms[rid], c = S.msgs[rid];
  if (!r || !c || document.hidden || !S.stick) return;
  const last = c.list[c.list.length - 1];
  if (!last) return;
  if (r.unread || last.id > r.last_read) {
    r.unread = 0;
    r.last_read = Math.max(r.last_read, last.id);
    api('/api/read', { room_id: rid, message_id: last.id }).catch(() => {});
    renderSidebar(); updateTitle();
  }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) markRead(); });

const findMsg = id => (S.msgs[S.current]?.list || []).find(m => m.id === id);

box.addEventListener('click', e => {
  const a = e.target.closest('[data-action]');
  if (a && a.dataset.action === 'load-older') return loadOlder();
  const row = e.target.closest('.msg');
  if (!a) {
    if (row && matchMedia('(hover: none)').matches && !e.target.closest('a,video,audio')) {
      box.querySelectorAll('.msg.active').forEach(x => x !== row && x.classList.remove('active'));
      row.classList.toggle('active');
    }
    return;
  }
  if (!row) return;
  const id = +row.dataset.id, m = findMsg(id);
  if (!m) return;
  switch (a.dataset.action) {
    case 'react': react(id, a.dataset.emoji); break;
    case 'react-more': openEmoji(a, emoji => react(id, emoji)); break;
    case 'reply': startReply(m); break;
    case 'edit': startEdit(m); break;
    case 'delete': deleteMessage(m); break;
    case 'pin': api('/api/messages/pin', { id }).catch(err => toast(err.message)); break;
    case 'copy': Promise.resolve(copyText(m.body)).then(() => toast('Copied')); break;
    case 'jump': jumpTo(+a.dataset.target); break;
    case 'lightbox': openLightbox(a.src); break;
  }
  row.classList.remove('active');
});

const react = (id, emoji) => api('/api/messages/react', { id, emoji }).catch(err => toast(err.message));

async function deleteMessage(m) {
  if (!await confirmDialog('Delete message?', 'This removes the message for everyone. You can\'t undo this.', 'Delete')) return;
  api('/api/messages/delete', { id: m.id }).catch(err => toast(err.message));
}

/* ---------------- typing indicator ---------------- */
function renderTyping() {
  const el = $('#typing');
  const ids = S.current ? typers(S.current) : [];
  if (!ids.length) { el.innerHTML = ''; return; }
  const names = ids.map(firstName);
  const text = names.length === 1 ? `${names[0]} is typing` : names.length === 2 ? `${names[0]} and ${names[1]} are typing` : 'Several people are typing';
  el.innerHTML = `<span class="typing-dots"><i></i><i></i><i></i></span><span>${esc(text)}…</span>`;
}

/* ---------------- composer ---------------- */
function autosize() {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
}
function renderComposeBar() {
  const bar = $('#compose-bar');
  if (S.editing) {
    bar.innerHTML = `${icon('edit', 15)}<div><b>Editing message</b> · Esc to cancel</div><button class="icon-btn" data-cancel>${icon('x', 16)}</button>`;
  } else if (S.replyTo) {
    const m = S.replyTo;
    bar.innerHTML = `${icon('reply', 15)}<div>Replying to <b>${esc(userName(m.user_id))}</b> · ${esc(m.body || (m.file ? m.file.name : ''))}</div><button class="icon-btn" data-cancel>${icon('x', 16)}</button>`;
  }
  bar.classList.toggle('hidden', !S.editing && !S.replyTo);
}
$('#compose-bar').addEventListener('click', e => { if (e.target.closest('[data-cancel]')) cancelCompose(); });

function startReply(m) {
  if (S.editing) cancelCompose();
  S.replyTo = m; renderComposeBar(); input.focus();
}
function startEdit(m) {
  if (!S.editing) S.drafts[S.current] = input.value;
  S.replyTo = null; S.editing = m.id;
  input.value = m.body; autosize(); renderComposeBar();
  input.focus(); input.setSelectionRange(input.value.length, input.value.length);
}
function cancelCompose() {
  if (S.editing) { input.value = S.drafts[S.current] || ''; autosize(); }
  S.editing = null; S.replyTo = null; renderComposeBar();
}

async function send() {
  const rid = S.current; if (!rid) return;
  const text = input.value.trim();
  if (S.editing) {
    const id = S.editing;
    const m = findMsg(id);
    if (!text && !(m && m.file)) return;
    cancelCompose();
    input.value = ''; S.drafts[rid] = ''; autosize();
    api('/api/messages/edit', { id, body: text }).catch(err => toast(err.message));
    return;
  }
  if (!text) return;
  const reply = S.replyTo ? S.replyTo.id : null;
  input.value = ''; S.drafts[rid] = ''; autosize(); hideMention();
  S.replyTo = null; renderComposeBar();
  try {
    const d = await api('/api/messages', { room_id: rid, body: text, reply_to: reply });
    if (S.msgs[rid]) { addToCache(S.msgs[rid], d.message); if (S.current === rid) renderMessages('bottom'); }
  } catch (err) {
    toast(err.message);
    if (!input.value) { input.value = text; autosize(); }
  }
}

let lastTypingSent = 0;
input.addEventListener('input', () => {
  autosize();
  if (!S.editing) S.drafts[S.current] = input.value;
  checkMention();
  if (input.value.trim() && !S.editing && Date.now() - lastTypingSent > 2500) {
    lastTypingSent = Date.now();
    api('/api/typing', { room_id: S.current }).catch(() => {});
  }
});
input.addEventListener('keydown', e => {
  if (S.mention) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      S.mention.idx = (S.mention.idx + (e.key === 'ArrowDown' ? 1 : -1) + S.mention.list.length) % S.mention.list.length;
      renderMention(); return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(S.mention.list[S.mention.idx]); return; }
    if (e.key === 'Escape') { e.preventDefault(); hideMention(); return; }
  }
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !(isMobile() && matchMedia('(hover: none)').matches)) {
    e.preventDefault(); send();
  } else if (e.key === 'Escape' && (S.editing || S.replyTo)) {
    e.preventDefault(); cancelCompose();
  } else if (e.key === 'ArrowUp' && !input.value && !S.editing) {
    const mine = (S.msgs[S.current]?.list || []).filter(m => m.user_id === S.me.id && !m.deleted && !m.system && m.body).pop();
    if (mine) { e.preventDefault(); startEdit(mine); }
  }
});
$('#send-btn').onclick = () => { send(); input.focus(); };
input.addEventListener('blur', () => setTimeout(hideMention, 150));

/* mentions */
function checkMention() {
  const r = S.rooms[S.current]; if (!r) return hideMention();
  const before = input.value.slice(0, input.selectionStart);
  const m = before.match(/(?:^|\s)@([\w.-]{0,24})$/);
  if (!m) return hideMention();
  const q = m[1].toLowerCase();
  const pool = (r.kind === 'public' ? Object.values(S.users) : r.members.map(id => S.users[id]).filter(Boolean)).filter(u => u.id !== S.me.id);
  const list = pool.filter(u => u.username.toLowerCase().startsWith(q) || u.display_name.toLowerCase().includes(q)).slice(0, 6);
  if (!list.length) return hideMention();
  S.mention = { start: input.selectionStart - m[1].length - 1, list, idx: 0 };
  renderMention();
}
function renderMention() {
  const pop = $('#mention-pop');
  pop.innerHTML = S.mention.list.map((u, i) => `<button type="button" class="${i === S.mention.idx ? 'sel' : ''}" data-i="${i}">${avatar(u.id, 26, true)}<b>${esc(u.display_name)}</b><small>@${esc(u.username)}</small></button>`).join('');
  pop.classList.remove('hidden');
}
function pickMention(u) {
  const { start } = S.mention, end = input.selectionStart;
  input.value = `${input.value.slice(0, start)}@${u.username} ${input.value.slice(end)}`;
  const pos = start + u.username.length + 2;
  input.setSelectionRange(pos, pos);
  hideMention(); input.focus();
  S.drafts[S.current] = input.value;
}
function hideMention() { S.mention = null; $('#mention-pop').classList.add('hidden'); }
$('#mention-pop').addEventListener('mousedown', e => {
  const b = e.target.closest('[data-i]'); if (!b) return;
  e.preventDefault(); pickMention(S.mention.list[+b.dataset.i]);
});

/* ---------------- emoji picker ---------------- */
function openEmoji(anchor, onPick) {
  const pop = $('#emoji-pop');
  pop.innerHTML = EMOJIS.map(e => `<button type="button" data-e="${e}">${e}</button>`).join('');
  pop.classList.remove('hidden');
  const rect = anchor.getBoundingClientRect(), w = Math.min(316, innerWidth - 16), ht = Math.min(280, pop.scrollHeight);
  pop.style.width = `${w}px`;
  pop.style.left = `${Math.max(8, Math.min(rect.right - w, innerWidth - w - 8))}px`;
  pop.style.top = `${rect.top - ht - 8 > 8 ? rect.top - ht - 8 : Math.min(rect.bottom + 8, innerHeight - ht - 8)}px`;
  S.emojiCb = onPick;
}
const closeEmoji = () => { $('#emoji-pop').classList.add('hidden'); S.emojiCb = null; };
$('#emoji-pop').addEventListener('click', e => {
  const b = e.target.closest('[data-e]'); if (!b || !S.emojiCb) return;
  const cb = S.emojiCb; closeEmoji(); cb(b.dataset.e);
});
document.addEventListener('mousedown', e => {
  if (!$('#emoji-pop').classList.contains('hidden') && !e.target.closest('#emoji-pop,#emoji-btn,[data-action="react-more"]')) closeEmoji();
});
$('#emoji-btn').onclick = e => {
  if (!$('#emoji-pop').classList.contains('hidden')) return closeEmoji();
  openEmoji(e.currentTarget, emoji => {
    const s = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? s;
    input.value = input.value.slice(0, s) + emoji + input.value.slice(end);
    input.setSelectionRange(s + emoji.length, s + emoji.length);
    input.focus(); autosize();
    if (!S.editing) S.drafts[S.current] = input.value;
  });
};

/* ---------------- files, paste, drag & drop, voice ---------------- */
function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('X-Filename', encodeURIComponent(file.name || 'file'));
    xhr.setRequestHeader('X-File-Type', file.type || '');
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => {
      let b = {}; try { b = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(b); else reject(new Error(b.error || 'Upload failed'));
    };
    xhr.onerror = () => reject(new Error('Upload failed - check your connection'));
    xhr.send(file);
  });
}
async function sendFiles(files) {
  const rid = S.current; if (!rid) return;
  for (const f of files) {
    if (f.size > S.maxUpload) { toast(`${f.name} is bigger than ${Math.round(S.maxUpload / 1048576)} MB`); continue; }
    if (!f.size) continue;
    const t = progressToast(`Sending ${f.name}`);
    try {
      const info = await uploadFile(f, t.set);
      const reply = S.replyTo ? S.replyTo.id : null;
      S.replyTo = null; renderComposeBar();
      const d = await api('/api/messages', { room_id: rid, body: '', file: info, reply_to: reply });
      if (S.msgs[rid]) { addToCache(S.msgs[rid], d.message); if (S.current === rid) renderMessages('bottom'); }
    } catch (e) { toast(e.message); } finally { t.done(); }
  }
}
$('#attach-btn').onclick = () => $('#file-input').click();
$('#file-input').onchange = e => { sendFiles([...e.target.files]); e.target.value = ''; };
input.addEventListener('paste', e => {
  const files = [...(e.clipboardData?.files || [])];
  if (files.length) { e.preventDefault(); sendFiles(files); }
});
let dragDepth = 0;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
window.addEventListener('dragenter', e => { if (!hasFiles(e) || !S.current) return; dragDepth++; $('#drop-overlay').classList.remove('hidden'); });
window.addEventListener('dragleave', e => { if (!hasFiles(e)) return; if (--dragDepth <= 0) { dragDepth = 0; $('#drop-overlay').classList.add('hidden'); } });
window.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
window.addEventListener('drop', e => {
  if (!hasFiles(e)) return;
  e.preventDefault(); dragDepth = 0; $('#drop-overlay').classList.add('hidden');
  if (S.current) sendFiles([...e.dataTransfer.files]);
});

// Browsers only allow the microphone on https or localhost, so the button only shows where it works.
const canRecord = !!(window.isSecureContext && navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
$('#mic-btn').classList.toggle('hidden', !canRecord);
$('#mic-btn').onclick = async () => {
  if (S.rec) { S.rec.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream), chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      S.rec = null;
      $('#mic-btn').classList.remove('recording'); $('#mic-btn').innerHTML = icon('mic', 20);
      const type = (rec.mimeType || 'audio/webm').split(';')[0];
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
      const blob = new Blob(chunks, { type });
      if (blob.size > 1000) sendFiles([new File([blob], `Voice message.${ext}`, { type: type.replace('video/', 'audio/') })]);
    };
    rec.start();
    S.rec = rec;
    $('#mic-btn').classList.add('recording'); $('#mic-btn').innerHTML = icon('stop', 18);
    toast('Recording… tap again to send');
  } catch { toast('Microphone is not available'); }
};

/* ---------------- side panel: info, pins, search ---------------- */
function openPanel(kind, arg = '') {
  if (S.panel === kind && !arg) return closePanel();
  S.panel = kind; S.panelArg = arg;
  $('#panel').classList.remove('hidden');
  renderPanel(); renderHeader();
}
function closePanel() {
  S.panel = null;
  $('#panel').classList.add('hidden');
  renderHeader();
}
$('#panel-close').onclick = closePanel;
document.querySelectorAll('.chat-actions [data-panel]').forEach(b => {
  b.onclick = () => { if (b.dataset.panel === 'search') S.searchAll = false; openPanel(b.dataset.panel); };
});
$('#chat-title').onclick = () => openPanel('info');

function renderPanel() {
  const body = $('#panel-body'), r = S.rooms[S.current];
  if (S.panel === 'search') { $('#panel-title').textContent = 'Search messages'; return renderSearch(body); }
  if (!r) return closePanel();
  if (S.panel === 'pins') { $('#panel-title').textContent = 'Pinned messages'; return renderPins(body, r); }
  $('#panel-title').textContent = r.kind === 'dm' ? 'Profile' : r.kind === 'public' ? 'Channel info' : 'Group info';
  renderInfo(body, r);
}

function memberRow(uid) {
  const u = S.users[uid]; if (!u) return '';
  const sub = S.online.has(uid) ? '<span class="online-text">online</span>' : `last seen ${ago(u.last_seen)}`;
  return `<button class="member" data-user="${uid}">${avatar(uid, 36, true)}<span><b>${esc(u.display_name)}${uid === S.me.id ? ' (you)' : ''}</b><small>@${esc(u.username)} · ${sub}</small></span></button>`;
}

function renderInfo(body, r) {
  const muteBtn = `<button class="btn small" id="pi-mute">${icon(r.muted ? 'bell' : 'bellOff', 15)} ${r.muted ? 'Unmute' : 'Mute'} notifications</button>`;
  if (r.kind === 'dm') {
    const uid = otherId(r), u = S.users[uid] || {};
    body.innerHTML = `<div class="profile-card">${avatar(uid, 96, true)}<h2>${esc(u.display_name)}</h2><p>@${esc(u.username)}</p>
      ${u.status ? `<p>${esc(u.status)}</p>` : ''}<p>${S.online.has(uid) ? '<span class="online-text">online</span>' : 'last seen ' + ago(u.last_seen)}</p></div>
      <div class="panel-section">${muteBtn}</div>`;
  } else {
    const editable = r.kind === 'group' || r.created_by == null || r.created_by === S.me.id;
    const members = [...r.members].sort((a, b) => S.online.has(b) - S.online.has(a) || userName(a).localeCompare(userName(b)));
    body.innerHTML = `<div class="profile-card">${roomAvatar(r, 80)}<h2>${esc(r.kind === 'public' ? '#' + r.name : r.name)}</h2>
        ${r.topic ? `<p>${esc(r.topic)}</p>` : ''}<p><small>Created ${esc(new Date(r.created_at * 1000).toLocaleDateString())}</small></p></div>
      ${editable ? `<div class="panel-section"><h4>Edit</h4>
        <label class="field"><span>Name</span><input id="pi-name" maxlength="40" value="${esc(r.name)}"></label>
        <label class="field"><span>Topic</span><input id="pi-topic" maxlength="200" value="${esc(r.topic)}" placeholder="What's this about?"></label>
        <button class="btn small primary" id="pi-save">Save changes</button></div>` : ''}
      <div class="panel-section">${muteBtn}</div>
      <div class="panel-section"><h4>${r.members.length} members</h4>
        ${r.kind === 'group' ? `<button class="btn small" id="pi-add" style="margin-bottom:8px">${icon('plus', 15)} Add people</button>` : ''}
        ${members.map(memberRow).join('')}</div>
      ${r.kind === 'group' ? '<div class="panel-section"><button class="btn small danger ghost" id="pi-leave">Leave group</button></div>' : ''}`;
    $('#pi-save', body)?.addEventListener('click', async () => {
      try { const d = await api('/api/rooms/update', { id: r.id, name: $('#pi-name', body).value, topic: $('#pi-topic', body).value }); onRoom(d.room); toast('Saved'); }
      catch (e) { toast(e.message); }
    });
    $('#pi-add', body)?.addEventListener('click', () => addMembersModal(r));
    $('#pi-leave', body)?.addEventListener('click', async () => {
      if (!await confirmDialog('Leave group?', `You'll stop getting messages from ${r.name}.`, 'Leave')) return;
      try { await api('/api/rooms/leave', { id: r.id }); onRoomRemoved(r.id); } catch (e) { toast(e.message); }
    });
  }
  $('#pi-mute', body).onclick = async () => { try { onRoom((await api('/api/rooms/mute', { id: r.id })).room); } catch (e) { toast(e.message); } };
  body.querySelectorAll('.member[data-user]').forEach(b => { b.onclick = () => openDM(+b.dataset.user); });
}

function resultHTML(m, q) {
  const r = S.rooms[m.room_id];
  let text = esc(m.body || (m.file ? `📎 ${m.file.name}` : ''));
  if (q) text = text.replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), x => `<mark>${x}</mark>`);
  const where = r ? (r.kind === 'public' ? '#' + r.name : roomName(r)) : '';
  return `<button class="result" data-room="${m.room_id}" data-id="${m.id}"><div class="meta"><b>${esc(userName(m.user_id))}</b>${where ? `<span>in ${esc(where)}</span>` : ''}<span>${esc(shortTime(m.created_at))}</span></div><p>${text}</p></button>`;
}
function wireResults(el) {
  el.querySelectorAll('.result').forEach(b => {
    b.onclick = () => { if (isMobile()) closePanel(); openRoom(+b.dataset.room, { jumpTo: +b.dataset.id }); };
  });
}

async function renderPins(body, r) {
  body.innerHTML = '<div class="panel-empty">Loading…</div>';
  try {
    const d = await api(`/api/pins?room=${r.id}`);
    if (S.panel !== 'pins' || S.current !== r.id) return;
    body.innerHTML = d.messages.length ? d.messages.map(m => resultHTML(m, '')).join('')
      : `<div class="panel-empty">${icon('pin', 28)}<p>No pinned messages yet.<br>Hover a message and press the pin to keep it here.</p></div>`;
    wireResults(body);
  } catch (e) { body.innerHTML = `<div class="panel-empty">${esc(e.message)}</div>`; }
}

let searchTimer = null, searchSeq = 0;
function renderSearch(body) {
  const scoped = S.current && !S.searchAll;
  body.innerHTML = `<div class="search-box"><input id="ps-q" placeholder="Type at least 2 letters" value="${esc(S.panelArg)}" autocomplete="off">
    ${S.current ? `<label class="toggle"><input type="checkbox" id="ps-all" ${scoped ? '' : 'checked'}> Search all chats</label>` : ''}</div><div id="ps-results"></div>`;
  const qEl = $('#ps-q', body);
  const run = async () => {
    const q = qEl.value.trim(); S.panelArg = q;
    const out = $('#ps-results', body), seq = ++searchSeq;
    if (q.length < 2) { out.innerHTML = '<div class="panel-empty">Search across messages and file names.</div>'; return; }
    const params = new URLSearchParams({ q });
    if (S.current && !S.searchAll) params.set('room', S.current);
    try {
      const d = await api(`/api/search?${params}`);
      if (seq !== searchSeq) return;
      out.innerHTML = d.results.length ? d.results.map(m => resultHTML(m, q)).join('') : '<div class="panel-empty">No messages found.</div>';
      wireResults(out);
    } catch (e) { out.innerHTML = `<div class="panel-empty">${esc(e.message)}</div>`; }
  };
  qEl.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(run, 250); });
  $('#ps-all', body)?.addEventListener('change', e => { S.searchAll = e.target.checked; run(); });
  run();
  setTimeout(() => qEl.focus(), 30);
}

/* ---------------- modals ---------------- */
function openModal(html, onMount) {
  const boxEl = $('#modal-box');
  boxEl.innerHTML = html;
  $('#modal').classList.remove('hidden');
  if (onMount) onMount(boxEl);
  const first = boxEl.querySelector('input:not([type=checkbox]):not([type=file]),textarea');
  if (first && !isMobile()) setTimeout(() => first.focus(), 40);
}
function closeModal() {
  $('#modal').classList.add('hidden');
  $('#modal-box').innerHTML = '';
  const res = S.modalResolve; S.modalResolve = null;
  if (res) res(false);
}
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
$('#modal').addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });

function confirmDialog(title, text, ok) {
  return new Promise(resolve => {
    openModal(`<h3>${esc(title)}</h3><p class="muted">${esc(text)}</p>
      <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn danger" id="confirm-ok">${esc(ok)}</button></div>`,
    el => { $('#confirm-ok', el).onclick = () => { S.modalResolve = null; closeModal(); resolve(true); }; });
    S.modalResolve = resolve;
  });
}

const pickItem = u => `<label class="pick" data-name="${esc(`${u.display_name} ${u.username}`.toLowerCase())}"><input type="checkbox" value="${u.id}">${avatar(u.id, 30, true)}<span><b>${esc(u.display_name)}</b><small>@${esc(u.username)}</small></span></label>`;
function wirePickFilter(el) {
  $('.pick-filter', el)?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    el.querySelectorAll('.pick').forEach(p => { p.hidden = q && !p.dataset.name.includes(q); });
  });
}
const sortedUsers = () => Object.values(S.users).sort((a, b) => S.online.has(b.id) - S.online.has(a.id) || a.display_name.localeCompare(b.display_name));

function newRoomModal(kind) {
  const users = sortedUsers().filter(u => u.id !== S.me.id);
  openModal(`<h3>New conversation</h3>
    <div class="seg"><button type="button" data-k="group">${icon('users', 15)} Private group</button><button type="button" data-k="public">${icon('hash', 15)} Public channel</button></div>
    <p class="muted" id="nr-hint" style="margin-top:-6px"></p>
    <label class="field"><span>Name</span><input id="nr-name" maxlength="40" placeholder="e.g. weekend-plans"></label>
    <label class="field"><span>Topic (optional)</span><input id="nr-topic" maxlength="200" placeholder="What's it about?"></label>
    <div class="field" id="nr-members"><span>Add people</span><input class="pick-filter" placeholder="Filter people">
      <div class="pick-list">${users.map(pickItem).join('') || '<div class="side-empty">No one else has joined yet. Share the link!</div>'}</div></div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="nr-create">Create</button></div>`,
  el => {
    let k = kind;
    const setKind = v => {
      k = v;
      el.querySelectorAll('.seg button').forEach(b => b.classList.toggle('active', b.dataset.k === v));
      $('#nr-members', el).hidden = v === 'public';
      $('#nr-hint', el).textContent = v === 'public' ? 'Everyone on the network is a member and can read it.' : 'Only the people you add can see it.';
    };
    setKind(kind);
    el.querySelector('.seg').onclick = e => { const b = e.target.closest('[data-k]'); if (b) setKind(b.dataset.k); };
    wirePickFilter(el);
    const create = async () => {
      const name = $('#nr-name', el).value.trim();
      if (!name) { $('#nr-name', el).focus(); return toast('Give it a name'); }
      const members = [...el.querySelectorAll('.pick input:checked')].map(i => +i.value);
      try {
        const d = await api('/api/rooms', { kind: k, name, topic: $('#nr-topic', el).value, members });
        S.rooms[d.room.id] = d.room;
        closeModal(); openRoom(d.room.id);
      } catch (e) { toast(e.message); }
    };
    $('#nr-create', el).onclick = create;
    $('#nr-name', el).onkeydown = e => { if (e.key === 'Enter') create(); };
  });
}

function addMembersModal(r) {
  const users = sortedUsers().filter(u => !r.members.includes(u.id));
  openModal(`<h3>Add people to ${esc(r.name)}</h3>
    <input class="pick-filter field" placeholder="Filter people" style="height:40px;width:100%;padding:0 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2)">
    <div class="pick-list">${users.map(pickItem).join('') || '<div class="side-empty">Everyone is already here.</div>'}</div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="am-add">Add</button></div>`,
  el => {
    wirePickFilter(el);
    $('#am-add', el).onclick = async () => {
      const ids = [...el.querySelectorAll('.pick input:checked')].map(i => +i.value);
      if (!ids.length) return closeModal();
      try { onRoom((await api('/api/rooms/add', { id: r.id, user_ids: ids })).room); closeModal(); } catch (e) { toast(e.message); }
    };
  });
}

function settingsModal() {
  const me = S.me;
  let avatarUrl = me.avatar || '', color = me.color;
  const preview = () => `<span class="avatar" style="--s:72px;--c:${esc(color)}">${avatarUrl ? `<img src="${esc(avatarUrl)}" alt="">` : esc(initials($('#set-name')?.value || me.display_name))}</span>`;
  const notifSupported = 'Notification' in window && window.isSecureContext;
  openModal(`<h3>Profile & settings</h3>
    <div class="profile-row"><div id="set-avatar">${preview()}</div>
      <div><button class="btn small" id="set-up">Upload photo</button><button class="btn small ghost" id="set-rm">Remove</button>
      <input type="file" id="set-file" accept="image/png,image/jpeg,image/gif,image/webp" hidden></div></div>
    <label class="field"><span>Display name</span><input id="set-name" maxlength="40" value="${esc(me.display_name)}"></label>
    <label class="field"><span>Status</span><input id="set-status" maxlength="100" placeholder="What's on your mind?" value="${esc(me.status || '')}"></label>
    <div class="field"><span>Name color</span><div class="swatches">${COLORS.map(c => `<button type="button" class="swatch${c === color ? ' sel' : ''}" data-c="${c}" style="--c:${c}" title="${c}"></button>`).join('')}</div></div>
    <div class="field"><span>Preferences</span>
      <label class="toggle"><input type="checkbox" id="set-sound" ${prefs.sound !== false ? 'checked' : ''}> Play a sound for new messages</label>
      <label class="toggle"><input type="checkbox" id="set-notify" ${prefs.notify !== false ? 'checked' : ''} ${notifSupported ? '' : 'disabled'}> Desktop notifications</label>
      ${notifSupported ? '' : '<p class="note">Desktop notifications only work when opened as localhost or over https. You still get sounds and unread badges.</p>'}
    </div>
    <div class="invite"><span>Invite friends</span><code>${esc(S.inviteUrl)}</code><button class="btn small" id="set-copy">${icon('copy', 15)} Copy link</button></div>
    <div class="modal-actions spread"><button class="btn danger ghost" id="set-logout">Sign out</button>
      <div><button class="btn" data-close>Cancel</button><button class="btn primary" id="set-save">Save</button></div></div>`,
  el => {
    const refresh = () => { $('#set-avatar', el).innerHTML = preview(); };
    $('#set-up', el).onclick = () => $('#set-file', el).click();
    $('#set-rm', el).onclick = () => { avatarUrl = ''; refresh(); };
    $('#set-file', el).onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      const t = progressToast('Uploading photo');
      try { avatarUrl = (await uploadFile(f, t.set)).url; refresh(); } catch (err) { toast(err.message); } finally { t.done(); }
    };
    el.querySelector('.swatches').onclick = e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      color = b.dataset.c;
      el.querySelectorAll('.swatch').forEach(s => s.classList.toggle('sel', s === b));
      refresh();
    };
    $('#set-name', el).oninput = refresh;
    $('#set-notify', el).onchange = async e => {
      if (e.target.checked && Notification.permission === 'default') {
        if (await Notification.requestPermission() !== 'granted') { e.target.checked = false; toast('Notifications were blocked by the browser'); }
      }
    };
    $('#set-copy', el).onclick = () => { copyText(S.inviteUrl); toast('Link copied'); };
    $('#set-logout', el).onclick = async () => {
      try { await api('/api/logout', {}); } catch { /* ignore */ }
      S.es?.close();
      location.reload();
    };
    $('#set-save', el).onclick = async () => {
      prefs.sound = $('#set-sound', el).checked;
      prefs.notify = $('#set-notify', el).checked;
      savePrefs();
      try {
        const d = await api('/api/profile', { display_name: $('#set-name', el).value, status: $('#set-status', el).value, color, avatar: avatarUrl });
        onUser(d.user); closeModal(); toast('Profile saved');
      } catch (err) { toast(err.message); }
    };
  });
}
$('#me-btn').onclick = settingsModal;
$('#new-btn').onclick = () => newRoomModal('group');

/* ---------------- lightbox, theme, keyboard ---------------- */
function openLightbox(src) { $('#lightbox-img').src = src; $('#lightbox').classList.remove('hidden'); }
$('#lightbox').onclick = () => $('#lightbox').classList.add('hidden');

function applyTheme() {
  const t = prefs.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = t;
  $('#theme-btn').innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
  document.querySelector('meta[name=theme-color]').content = t === 'dark' ? '#17181f' : '#ffffff';
}
$('#theme-btn').onclick = () => { prefs.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; savePrefs(); applyTheme(); };

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('#lightbox').classList.contains('hidden')) $('#lightbox').classList.add('hidden');
    else if (!$('#modal').classList.contains('hidden')) closeModal();
    else if (!$('#emoji-pop').classList.contains('hidden')) closeEmoji();
    else if (S.panel && document.activeElement !== input) closePanel();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#side-search').focus(); $('#side-search').select(); }
});
// first tap anywhere unlocks audio on phones
document.addEventListener('pointerdown', () => { try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume?.(); } catch { /* ignore */ } }, { once: true });
// refresh "last seen 5 min ago" labels
setInterval(() => { if (S.me) { renderSidebar(); renderHeader(); } }, 60000);

/* ---------------- static icons & start ---------------- */
$('#side-search-icon').innerHTML = icon('search', 17);
$('#new-btn').innerHTML = icon('plus');
$('#back-btn').innerHTML = icon('back');
$('#panel-close').innerHTML = icon('x');
$('#attach-btn').innerHTML = icon('clip', 20);
$('#emoji-btn').innerHTML = icon('smile', 20);
$('#mic-btn').innerHTML = icon('mic', 20);
$('#send-btn').innerHTML = icon('send', 18);
document.querySelector('[data-panel=search]').innerHTML = icon('search');
document.querySelector('[data-panel=pins]').innerHTML = icon('pin');
document.querySelector('[data-panel=info]').innerHTML = icon('info');
applyTheme();

(async function boot() {
  try {
    await loadBootstrap();
    showApp();
    connect();
  } catch (e) {
    showAuth();
    if (e.status !== 401) $('#auth-error').textContent = e.message;
  }
})();
