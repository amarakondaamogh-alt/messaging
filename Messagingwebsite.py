"""
LAN Chat - a free messaging website.

Run locally:   python Messagingwebsite.py     (no packages needed - uses a local SQLite file)
Host online:   set DATABASE_URL to a PostgreSQL connection string (see DEPLOY.md)
               and install requirements.txt; the host's PORT variable is respected.
"""

import hashlib
import hmac
import json
import mimetypes
import os
import queue
import re
import secrets
import socket
import sqlite3
import ssl
import threading
import time
import traceback
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, unquote, urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
PAGE_FILES = {"index.html", "style.css", "app.js"}  # the only files the website serves from disk
DB_PATH = os.path.join(BASE_DIR, "chat.db")
PORT = int(os.environ.get("PORT", "8000"))
PUBLIC_URL = (os.environ.get("PUBLIC_URL") or os.environ.get("RENDER_EXTERNAL_URL") or "").rstrip("/")
MAX_UPLOAD = 10 * 1024 * 1024  # 10 MB per file (files are stored in the database)
PAGE_SIZE = 50

COLORS = ["#5b5bf0", "#e5484d", "#f76b15", "#d4a017", "#2fb36b",
          "#12a594", "#0091ff", "#8e4ec6", "#d6409f", "#6b7280"]
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{2,24}$")
COLOR_RE = re.compile(r"^#[0-9a-fA-F]{6}$")
FILE_URL_RE = re.compile(r"^/files/([0-9a-f]{24})$")
MIME_RE = re.compile(r"^[\w.+-]+/[\w.+-]+$")
# File types that are safe to show directly in the browser. Everything else downloads.
INLINE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/avif"}

for _type, _ext in (("application/javascript", ".js"), ("text/css", ".css"),
                    ("image/webp", ".webp"), ("image/avif", ".avif"), ("audio/mp4", ".m4a"),
                    ("audio/ogg", ".ogg"), ("video/webm", ".webm"), ("video/mp4", ".mp4")):
    mimetypes.add_type(_type, _ext)  # Windows' registry often gets these wrong


# --------------------------------------------------------------------------- database

# {pk}, {float} and {blob} are filled in per database engine.
SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
    id {pk},
    username TEXT NOT NULL,
    display_name TEXT,
    pw_hash TEXT,
    salt TEXT,
    color TEXT,
    avatar TEXT DEFAULT '',
    status TEXT DEFAULT '',
    created_at {float},
    last_seen {float}
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(lower(username));
CREATE TABLE IF NOT EXISTS sessions(
    token TEXT PRIMARY KEY,
    user_id INTEGER,
    created_at {float}
);
CREATE TABLE IF NOT EXISTS rooms(
    id {pk},
    name TEXT,
    kind TEXT,
    topic TEXT DEFAULT '',
    created_by INTEGER,
    created_at {float},
    dm_key TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS members(
    room_id INTEGER,
    user_id INTEGER,
    last_read INTEGER DEFAULT 0,
    muted INTEGER DEFAULT 0,
    PRIMARY KEY(room_id, user_id)
);
CREATE TABLE IF NOT EXISTS messages(
    id {pk},
    room_id INTEGER,
    user_id INTEGER,
    body TEXT DEFAULT '',
    reply_to INTEGER,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    file_size INTEGER,
    pinned INTEGER DEFAULT 0,
    is_system INTEGER DEFAULT 0,
    created_at {float},
    edited_at {float},
    deleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, id);
CREATE TABLE IF NOT EXISTS reactions(
    id {pk},
    message_id INTEGER,
    user_id INTEGER,
    emoji TEXT,
    UNIQUE(message_id, user_id, emoji)
);
CREATE TABLE IF NOT EXISTS files(
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    name TEXT,
    type TEXT,
    size INTEGER,
    data {blob},
    created_at {float}
)
"""


class Database:
    """PostgreSQL when DATABASE_URL is set (for hosting online), otherwise a local SQLite file."""

    def __init__(self):
        self.lock = threading.RLock()
        self.url = os.environ.get("DATABASE_URL", "").strip()
        self.pg = self.url.startswith(("postgres://", "postgresql://"))
        self.retry_errors = ()
        self.conn = None
        self.connect()
        if self.pg:
            types = {"pk": "BIGSERIAL PRIMARY KEY", "float": "DOUBLE PRECISION", "blob": "BYTEA"}
        else:
            types = {"pk": "INTEGER PRIMARY KEY", "float": "REAL", "blob": "BLOB"}
        for stmt in SCHEMA.format(**types).split(";"):
            if stmt.strip():
                self.query(stmt, fetch=False)

    def connect(self):
        if self.pg:
            import pg8000.dbapi
            u = urlparse(self.url)
            sslmode = parse_qs(u.query).get("sslmode", ["require"])[0]
            self.conn = pg8000.dbapi.connect(
                user=unquote(u.username or ""), password=unquote(u.password or ""),
                host=u.hostname, port=u.port or 5432,
                database=(u.path or "/").lstrip("/") or "postgres",
                ssl_context=None if sslmode == "disable" else ssl.create_default_context(),
                timeout=30)
            self.conn.autocommit = True
            # Hosted databases drop idle connections; reconnect and retry once when that happens.
            self.retry_errors = (pg8000.dbapi.InterfaceError, OSError)
        else:
            self.conn = sqlite3.connect(DB_PATH, check_same_thread=False, isolation_level=None)
            self.conn.execute("PRAGMA journal_mode=WAL")

    def reconnect(self):
        try:
            self.conn.close()
        except Exception:
            pass
        self.connect()

    def query(self, sql, args=(), fetch=True):
        if self.pg:
            sql = sql.replace("?", "%s")
        with self.lock:
            for attempt in (1, 2):
                try:
                    cur = self.conn.cursor()
                    cur.execute(sql, tuple(args))
                    if not fetch or cur.description is None:
                        return cur
                    cols = [d[0] for d in cur.description]
                    return [dict(zip(cols, row)) for row in cur.fetchall()]
                except self.retry_errors:
                    if attempt == 2:
                        raise
                    self.reconnect()

    def all(self, sql, args=()):
        return self.query(sql, args)

    def one(self, sql, args=()):
        rows = self.query(sql, args)
        return rows[0] if rows else None

    def run(self, sql, args=()):
        self.query(sql, args, fetch=False)

    def insert(self, sql, args=()):
        if self.pg:
            return self.query(sql + " RETURNING id", args)[0]["id"]
        return self.query(sql, args, fetch=False).lastrowid


db = None


def seed():
    if not db.one("SELECT 1 AS x FROM rooms WHERE kind='public'"):
        now = time.time()
        for name, topic in (("general", "Chat with everyone"),
                            ("random", "Off-topic, memes and anything else")):
            db.insert("INSERT INTO rooms(name, kind, topic, created_by, created_at) VALUES(?,?,?,?,?)",
                      (name, "public", topic, None, now))


# --------------------------------------------------------------------------- live connections

class Hub:
    """Keeps one event queue per open browser tab, so we can push events in real time."""

    def __init__(self):
        self.lock = threading.Lock()
        self.clients = {}  # user_id -> set of queues

    def add(self, uid, q):
        with self.lock:
            qs = self.clients.setdefault(uid, set())
            first = not qs
            qs.add(q)
            return first

    def remove(self, uid, q):
        with self.lock:
            qs = self.clients.get(uid)
            if not qs:
                return False
            qs.discard(q)
            if qs:
                return False
            del self.clients[uid]
            return True

    def is_online(self, uid):
        with self.lock:
            return uid in self.clients

    def online_ids(self):
        with self.lock:
            return list(self.clients)

    def push(self, uid, event):
        data = encode_event(event)
        with self.lock:
            targets = list(self.clients.get(uid, ()))
        for q in targets:
            q.put(data)

    def push_all(self, event):
        data = encode_event(event)
        with self.lock:
            targets = [q for qs in self.clients.values() for q in qs]
        for q in targets:
            q.put(data)


hub = Hub()


class RateLimiter:
    """Stops spam and password guessing now that the site is on the open internet."""

    def __init__(self):
        self.lock = threading.Lock()
        self.hits = {}

    def check(self, key, limit, window):
        now = time.time()
        with self.lock:
            if len(self.hits) > 20000:
                self.hits = {k: v for k, v in self.hits.items() if v and now - v[-1] < 600}
            recent = [t for t in self.hits.get(key, []) if now - t < window]
            if len(recent) >= limit:
                self.hits[key] = recent
                raise ApiError(429, "You're doing that too fast - wait a moment and try again")
            recent.append(now)
            self.hits[key] = recent


limiter = RateLimiter()


def encode_event(event):
    return ("data: " + json.dumps(event, separators=(",", ":")) + "\n\n").encode("utf-8")


def member_ids(rid):
    return [r["user_id"] for r in db.all("SELECT user_id FROM members WHERE room_id=?", (rid,))]


def broadcast_room(rid, event, exclude=None):
    for uid in member_ids(rid):
        if uid != exclude:
            hub.push(uid, event)


def push_room_update(rid):
    for uid in member_ids(rid):
        hub.push(uid, {"type": "room", "room": room_dict(rid, uid)})


# --------------------------------------------------------------------------- serializers

def user_dict(u):
    return {
        "id": u["id"], "username": u["username"], "display_name": u["display_name"],
        "color": u["color"], "avatar": u["avatar"] or "", "status": u["status"] or "",
        "last_seen": u["last_seen"], "online": hub.is_online(u["id"]),
    }


def preview_text(m):
    if m["body"]:
        return m["body"][:100]
    if m["file_name"]:
        return "\U0001F4CE " + m["file_name"]
    return ""


def room_dict(rid, uid):
    r = db.one("SELECT * FROM rooms WHERE id=?", (rid,))
    if not r:
        return None
    mem = db.all("SELECT user_id, last_read, muted FROM members WHERE room_id=?", (rid,))
    me = next((m for m in mem if m["user_id"] == uid), None)
    last_read = me["last_read"] if me else 0
    unread = db.one("SELECT COUNT(*) AS c FROM messages WHERE room_id=? AND id>? AND user_id<>? "
                    "AND deleted=0 AND is_system=0", (rid, last_read, uid))["c"]
    last = db.one("SELECT * FROM messages WHERE room_id=? AND deleted=0 ORDER BY id DESC LIMIT 1", (rid,))
    return {
        "id": r["id"], "name": r["name"], "kind": r["kind"], "topic": r["topic"] or "",
        "created_by": r["created_by"], "created_at": r["created_at"],
        "members": [m["user_id"] for m in mem],
        "reads": {} if r["kind"] == "public" else {str(m["user_id"]): m["last_read"] for m in mem},
        "last_read": last_read, "unread": unread, "muted": bool(me and me["muted"]),
        "last_message": None if not last else {
            "id": last["id"], "user_id": last["user_id"], "text": preview_text(last),
            "created_at": last["created_at"], "system": bool(last["is_system"]),
        },
    }


def messages_to_dicts(rows):
    if not rows:
        return []
    ids = [r["id"] for r in rows]
    reactions = {}
    for x in db.all(f"SELECT message_id, emoji, user_id FROM reactions WHERE message_id IN "
                    f"({','.join('?' * len(ids))}) ORDER BY id", ids):
        reactions.setdefault(x["message_id"], {}).setdefault(x["emoji"], []).append(x["user_id"])
    reply_ids = list({r["reply_to"] for r in rows if r["reply_to"]})
    replies = {}
    if reply_ids:
        for x in db.all(f"SELECT * FROM messages WHERE id IN ({','.join('?' * len(reply_ids))})", reply_ids):
            replies[x["id"]] = {"id": x["id"], "user_id": x["user_id"], "deleted": bool(x["deleted"]),
                                "text": "" if x["deleted"] else preview_text(x)}
    out = []
    for r in rows:
        deleted = bool(r["deleted"])
        out.append({
            "id": r["id"], "room_id": r["room_id"], "user_id": r["user_id"],
            "body": "" if deleted else (r["body"] or ""),
            "reply": replies.get(r["reply_to"]) if r["reply_to"] else None,
            "file": None if deleted or not r["file_url"] else {
                "url": r["file_url"], "name": r["file_name"], "type": r["file_type"], "size": r["file_size"]},
            "pinned": bool(r["pinned"]) and not deleted, "system": bool(r["is_system"]),
            "created_at": r["created_at"], "edited_at": r["edited_at"], "deleted": deleted,
            "reactions": {} if deleted else reactions.get(r["id"], {}),
        })
    return out


def message_dict(mid):
    return messages_to_dicts(db.all("SELECT * FROM messages WHERE id=?", (mid,)))[0]


# --------------------------------------------------------------------------- helpers

class ApiError(Exception):
    def __init__(self, status, msg):
        super().__init__(msg)
        self.status = status
        self.msg = msg


def to_int(value, default=None):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def clean(value, limit):
    return re.sub(r"\s+", " ", str(value or "")).strip()[:limit]


def hash_password(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000).hex()


def require_member(rid, uid):
    if not rid or not db.one("SELECT 1 AS x FROM members WHERE room_id=? AND user_id=?", (rid, uid)):
        raise ApiError(403, "You are not in this conversation")
    return db.one("SELECT * FROM rooms WHERE id=?", (rid,))


def own_message(mid, uid):
    m = db.one("SELECT * FROM messages WHERE id=?", (mid,)) if mid else None
    if not m or m["deleted"] or m["is_system"]:
        raise ApiError(404, "Message not found")
    require_member(m["room_id"], uid)
    if m["user_id"] != uid:
        raise ApiError(403, "You can only change your own messages")
    return m


def can_edit_room(room, uid):
    if room["kind"] == "group":
        return True
    return room["kind"] == "public" and room["created_by"] in (None, uid)


def post_system(rid, uid, text):
    mid = db.insert("INSERT INTO messages(room_id, user_id, body, is_system, created_at) VALUES(?,?,?,1,?)",
                    (rid, uid, text, time.time()))
    broadcast_room(rid, {"type": "message", "message": message_dict(mid)})


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))  # no packet is sent; this just picks the LAN interface
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


LAN_URL = ""

# --------------------------------------------------------------------------- routes

ROUTES = {}


def route(method, path, auth=True):
    def deco(fn):
        ROUTES[(method, path)] = (fn, auth)
        return fn
    return deco


def start_session(h, uid):
    token = secrets.token_urlsafe(32)
    db.run("INSERT INTO sessions(token, user_id, created_at) VALUES(?,?,?)", (token, uid, time.time()))
    secure = "; Secure" if h.is_https() else ""
    h.send_json({"ok": True}, headers={
        "Set-Cookie": f"session={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={365 * 86400}{secure}"})


@route("POST", "/api/register", auth=False)
def register(h, user, d):
    limiter.check("auth:" + h.client_ip(), 10, 60)
    username = str(d.get("username") or "").strip()
    password = str(d.get("password") or "")
    name = clean(d.get("display_name"), 40) or username
    if not USERNAME_RE.match(username):
        raise ApiError(400, "Username must be 2-24 characters: letters, numbers, _ . or -")
    if len(password) < 6:
        raise ApiError(400, "Password must be at least 6 characters")
    salt = secrets.token_hex(16)
    now = time.time()
    with db.lock:
        if db.one("SELECT 1 AS x FROM users WHERE lower(username)=lower(CAST(? AS TEXT))", (username,)):
            raise ApiError(409, "That username is already taken")
        count = db.one("SELECT COUNT(*) AS c FROM users")["c"]
        uid = db.insert("INSERT INTO users(username, display_name, pw_hash, salt, color, created_at, last_seen) "
                        "VALUES(?,?,?,?,?,?,?)",
                        (username, name, hash_password(password, salt), salt, COLORS[count % len(COLORS)], now, now))
        for r in db.all("SELECT id FROM rooms WHERE kind='public'"):
            db.run("INSERT INTO members(room_id, user_id) VALUES(?,?) ON CONFLICT DO NOTHING", (r["id"], uid))
    hub.push_all({"type": "user", "user": user_dict(db.one("SELECT * FROM users WHERE id=?", (uid,)))})
    start_session(h, uid)


@route("POST", "/api/login", auth=False)
def login(h, user, d):
    limiter.check("auth:" + h.client_ip(), 10, 60)
    u = db.one("SELECT * FROM users WHERE lower(username)=lower(CAST(? AS TEXT))",(str(d.get("username") or "").strip(),))
    if not u or not hmac.compare_digest(u["pw_hash"], hash_password(str(d.get("password") or ""), u["salt"])):
        raise ApiError(401, "Wrong username or password")
    start_session(h, u["id"])


@route("POST", "/api/logout")
def logout(h, user, d):
    db.run("DELETE FROM sessions WHERE token=?", (h.session_token,))
    h.send_json({"ok": True}, headers={"Set-Cookie": "session=; Path=/; Max-Age=0"})


@route("GET", "/api/bootstrap")
def bootstrap(h, user, p):
    uid = user["id"]
    rooms = [room_dict(r["room_id"], uid) for r in db.all("SELECT room_id FROM members WHERE user_id=?", (uid,))]
    return {
        "me": user_dict(user),
        "users": [user_dict(u) for u in db.all("SELECT * FROM users ORDER BY lower(display_name)")],
        "rooms": [r for r in rooms if r],
        "invite_url": h.invite_url(),
        "max_upload": MAX_UPLOAD,
    }


@route("GET", "/api/stream")
def stream(h, user, p):
    """Server-Sent Events: the browser keeps this open and receives live events."""
    uid = user["id"]
    h.send_response(200)
    h.send_header("Content-Type", "text/event-stream")
    h.send_header("Cache-Control", "no-cache")
    h.send_header("X-Accel-Buffering", "no")
    h.end_headers()
    q = queue.Queue()
    if hub.add(uid, q):
        hub.push_all({"type": "presence", "user_id": uid, "online": True})
    try:
        h.wfile.write(b"retry: 2000\n\n")
        h.wfile.write(encode_event({"type": "hello", "online": hub.online_ids()}))
        h.wfile.flush()
        while True:
            try:
                data = q.get(timeout=20)
            except queue.Empty:
                data = b": ping\n\n"  # keep-alive so proxies and phones don't drop us
            h.wfile.write(data)
            h.wfile.flush()
    except OSError:
        pass  # browser tab closed
    finally:
        if hub.remove(uid, q):
            now = time.time()
            db.run("UPDATE users SET last_seen=? WHERE id=?", (now, uid))
            hub.push_all({"type": "presence", "user_id": uid, "online": False, "last_seen": now})


@route("GET", "/api/messages")
def get_messages(h, user, p):
    rid = to_int(p.get("room"))
    require_member(rid, user["id"])
    before = to_int(p.get("before"), 0) or 2 ** 62
    rows = db.all("SELECT * FROM messages WHERE room_id=? AND id<? ORDER BY id DESC LIMIT ?",
                  (rid, before, PAGE_SIZE))
    rows = list(reversed(rows))
    return {"messages": messages_to_dicts(rows), "has_more": len(rows) == PAGE_SIZE}


@route("POST", "/api/messages")
def send_message(h, user, d):
    uid = user["id"]
    limiter.check(f"msg:{uid}", 20, 10)
    rid = to_int(d.get("room_id"))
    require_member(rid, uid)
    body = str(d.get("body") or "").strip()[:4000]
    f = d.get("file") if isinstance(d.get("file"), dict) else None
    file_url = file_name = file_type = None
    file_size = None
    if f:
        m = FILE_URL_RE.match(str(f.get("url") or ""))
        info = db.one("SELECT name, type, size FROM files WHERE id=?", (m.group(1),)) if m else None
        if not info:
            raise ApiError(400, "Invalid attachment")
        file_url, file_name, file_type, file_size = m.group(0), info["name"], info["type"], info["size"]
    if not body and not file_url:
        raise ApiError(400, "Message is empty")
    reply_to = to_int(d.get("reply_to"))
    if reply_to and not db.one("SELECT 1 AS x FROM messages WHERE id=? AND room_id=?", (reply_to, rid)):
        reply_to = None
    mid = db.insert("INSERT INTO messages(room_id, user_id, body, reply_to, file_url, file_name, file_type, "
                    "file_size, created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                    (rid, uid, body, reply_to, file_url, file_name, file_type, file_size, time.time()))
    db.run("UPDATE members SET last_read=? WHERE room_id=? AND user_id=?", (mid, rid, uid))
    msg = message_dict(mid)
    broadcast_room(rid, {"type": "message", "message": msg})
    return {"message": msg}


@route("POST", "/api/messages/edit")
def edit_message(h, user, d):
    m = own_message(to_int(d.get("id")), user["id"])
    body = str(d.get("body") or "").strip()[:4000]
    if not body and not m["file_url"]:
        raise ApiError(400, "Message is empty")
    db.run("UPDATE messages SET body=?, edited_at=? WHERE id=?", (body, time.time(), m["id"]))
    msg = message_dict(m["id"])
    broadcast_room(m["room_id"], {"type": "message_update", "message": msg})
    return {"message": msg}


@route("POST", "/api/messages/delete")
def delete_message(h, user, d):
    m = own_message(to_int(d.get("id")), user["id"])
    db.run("UPDATE messages SET deleted=1, body='', pinned=0 WHERE id=?", (m["id"],))
    db.run("DELETE FROM reactions WHERE message_id=?", (m["id"],))
    broadcast_room(m["room_id"], {"type": "message_update", "message": message_dict(m["id"])})
    push_room_update(m["room_id"])  # the chat-list preview may have changed
    return {"ok": True}


@route("POST", "/api/messages/react")
def react(h, user, d):
    uid = user["id"]
    mid = to_int(d.get("id"))
    m = db.one("SELECT * FROM messages WHERE id=?", (mid,)) if mid else None
    emoji = str(d.get("emoji") or "").strip()
    if not m or m["deleted"] or not emoji or len(emoji) > 16:
        raise ApiError(400, "Can't react to that")
    require_member(m["room_id"], uid)
    with db.lock:
        if db.one("SELECT 1 AS x FROM reactions WHERE message_id=? AND user_id=? AND emoji=?", (m["id"], uid, emoji)):
            db.run("DELETE FROM reactions WHERE message_id=? AND user_id=? AND emoji=?", (m["id"], uid, emoji))
        else:
            db.run("INSERT INTO reactions(message_id, user_id, emoji) VALUES(?,?,?)", (m["id"], uid, emoji))
    broadcast_room(m["room_id"], {"type": "message_update", "message": message_dict(m["id"])})
    return {"ok": True}


@route("POST", "/api/messages/pin")
def pin(h, user, d):
    mid = to_int(d.get("id"))
    m = db.one("SELECT * FROM messages WHERE id=?", (mid,)) if mid else None
    if not m or m["deleted"] or m["is_system"]:
        raise ApiError(404, "Message not found")
    require_member(m["room_id"], user["id"])
    pinned = 0 if m["pinned"] else 1
    db.run("UPDATE messages SET pinned=? WHERE id=?", (pinned, m["id"]))
    broadcast_room(m["room_id"], {"type": "message_update", "message": message_dict(m["id"])})
    post_system(m["room_id"], user["id"], f"{user['display_name']} {'pinned' if pinned else 'unpinned'} a message")
    return {"ok": True}


@route("GET", "/api/pins")
def pins(h, user, p):
    rid = to_int(p.get("room"))
    require_member(rid, user["id"])
    rows = db.all("SELECT * FROM messages WHERE room_id=? AND pinned=1 AND deleted=0 ORDER BY id DESC", (rid,))
    return {"messages": messages_to_dicts(rows)}


@route("POST", "/api/upload")
def upload(h, user, _):
    limiter.check(f"upload:{user['id']}", 15, 60)
    size = to_int(h.headers.get("Content-Length"), 0)
    if size <= 0:
        raise ApiError(400, "No file received")
    if size > MAX_UPLOAD:
        raise ApiError(413, f"Files can be at most {MAX_UPLOAD // (1024 * 1024)} MB")
    chunks, remaining = [], size
    while remaining > 0:
        chunk = h.rfile.read(min(65536, remaining))
        if not chunk:
            raise ApiError(400, "Upload was interrupted")
        chunks.append(chunk)
        remaining -= len(chunk)
    name = os.path.basename(unquote(h.headers.get("X-Filename") or "file").replace("\\", "/"))
    name = clean(name, 200) or "file"
    ftype = (h.headers.get("X-File-Type") or "").split(";")[0].strip().lower()
    if not MIME_RE.match(ftype):
        ftype = mimetypes.guess_type(name)[0] or "application/octet-stream"
    fid = secrets.token_hex(12)
    db.run("INSERT INTO files(id, user_id, name, type, size, data, created_at) VALUES(?,?,?,?,?,?,?)",
           (fid, user["id"], name, ftype, size, b"".join(chunks), time.time()))
    return {"url": "/files/" + fid, "name": name, "type": ftype, "size": size}


@route("POST", "/api/rooms")
def create_room(h, user, d):
    uid = user["id"]
    limiter.check(f"room:{uid}", 10, 60)
    name = clean(d.get("name"), 40)
    if not name:
        raise ApiError(400, "Give it a name")
    kind = "public" if d.get("kind") == "public" else "group"
    rid = db.insert("INSERT INTO rooms(name, kind, topic, created_by, created_at) VALUES(?,?,?,?,?)",
                    (name, kind, clean(d.get("topic"), 200), uid, time.time()))
    all_ids = {r["id"] for r in db.all("SELECT id FROM users")}
    if kind == "public":
        ids = all_ids
    else:
        ids = all_ids & {to_int(x) for x in (d.get("members") or []) if to_int(x)}
        ids.add(uid)
    for mid in ids:
        db.run("INSERT INTO members(room_id, user_id) VALUES(?,?) ON CONFLICT DO NOTHING", (rid, mid))
    push_room_update(rid)  # members must know the room before its first message arrives
    post_system(rid, uid, f"{user['display_name']} created {'#' if kind == 'public' else ''}{name}")
    return {"room": room_dict(rid, uid)}


@route("POST", "/api/rooms/update")
def update_room(h, user, d):
    rid = to_int(d.get("id"))
    room = require_member(rid, user["id"])
    if not can_edit_room(room, user["id"]):
        raise ApiError(403, "Only the creator can edit this channel")
    name = clean(d.get("name"), 40) or room["name"]
    topic = clean(d.get("topic"), 200)
    db.run("UPDATE rooms SET name=?, topic=? WHERE id=?", (name, topic, rid))
    if name != room["name"]:
        post_system(rid, user["id"], f"{user['display_name']} renamed the conversation to {name}")
    elif topic != (room["topic"] or ""):
        post_system(rid, user["id"], f"{user['display_name']} changed the topic")
    push_room_update(rid)
    return {"room": room_dict(rid, user["id"])}


@route("POST", "/api/rooms/add")
def add_members(h, user, d):
    rid = to_int(d.get("id"))
    room = require_member(rid, user["id"])
    if room["kind"] != "group":
        raise ApiError(400, "You can only add people to groups")
    current = set(member_ids(rid))
    added = []
    for x in d.get("user_ids") or []:
        uid = to_int(x)
        u = db.one("SELECT * FROM users WHERE id=?", (uid,)) if uid else None
        if u and u["id"] not in current:
            db.run("INSERT INTO members(room_id, user_id) VALUES(?,?) ON CONFLICT DO NOTHING", (rid, u["id"]))
            added.append(u["display_name"])
    if added:
        push_room_update(rid)
        post_system(rid, user["id"], f"{user['display_name']} added {', '.join(added)}")
    return {"room": room_dict(rid, user["id"])}


@route("POST", "/api/rooms/leave")
def leave_room(h, user, d):
    rid = to_int(d.get("id"))
    room = require_member(rid, user["id"])
    if room["kind"] != "group":
        raise ApiError(400, "You can only leave groups")
    post_system(rid, user["id"], f"{user['display_name']} left")
    db.run("DELETE FROM members WHERE room_id=? AND user_id=?", (rid, user["id"]))
    hub.push(user["id"], {"type": "room_removed", "room_id": rid})
    push_room_update(rid)
    return {"ok": True}


@route("POST", "/api/rooms/mute")
def mute_room(h, user, d):
    rid = to_int(d.get("id"))
    require_member(rid, user["id"])
    db.run("UPDATE members SET muted = 1 - muted WHERE room_id=? AND user_id=?", (rid, user["id"]))
    room = room_dict(rid, user["id"])
    hub.push(user["id"], {"type": "room", "room": room})
    return {"room": room}


@route("POST", "/api/dm")
def open_dm(h, user, d):
    uid = user["id"]
    other_id = to_int(d.get("user_id"))
    other = db.one("SELECT id FROM users WHERE id=?", (other_id,)) if other_id else None
    if not other:
        raise ApiError(404, "User not found")
    a, b = sorted((uid, other["id"]))
    key = f"{a}:{b}"
    created = False
    with db.lock:
        r = db.one("SELECT id FROM rooms WHERE dm_key=?", (key,))
        if r:
            rid = r["id"]
        else:
            rid = db.insert("INSERT INTO rooms(name, kind, created_by, created_at, dm_key) VALUES('', 'dm', ?, ?, ?)",
                            (uid, time.time(), key))
            for mid in {a, b}:
                db.run("INSERT INTO members(room_id, user_id) VALUES(?,?) ON CONFLICT DO NOTHING", (rid, mid))
            created = True
    if created:
        push_room_update(rid)
    return {"room": room_dict(rid, uid)}


@route("POST", "/api/typing")
def typing(h, user, d):
    rid = to_int(d.get("room_id"))
    require_member(rid, user["id"])
    broadcast_room(rid, {"type": "typing", "room_id": rid, "user_id": user["id"]}, exclude=user["id"])
    return {"ok": True}


@route("POST", "/api/read")
def mark_read(h, user, d):
    uid = user["id"]
    rid = to_int(d.get("room_id"))
    room = require_member(rid, uid)
    newest = db.one("SELECT MAX(id) AS m FROM messages WHERE room_id=?", (rid,))["m"] or 0
    mid = min(to_int(d.get("message_id"), 0), newest)
    db.run("UPDATE members SET last_read = CASE WHEN last_read > ? THEN last_read ELSE ? END "
           "WHERE room_id=? AND user_id=?", (mid, mid, rid, uid))
    event = {"type": "read", "room_id": rid, "user_id": uid, "message_id": mid}
    if room["kind"] == "public":
        hub.push(uid, event)  # only syncs your other tabs/devices
    else:
        broadcast_room(rid, event)  # read receipts for everyone in the chat
    return {"ok": True}


@route("POST", "/api/profile")
def update_profile(h, user, d):
    name = clean(d.get("display_name"), 40) or user["display_name"]
    status = clean(d.get("status"), 100)
    color = d.get("color") if COLOR_RE.match(str(d.get("color") or "")) else user["color"]
    avatar = str(d.get("avatar") or "")
    if avatar and not FILE_URL_RE.match(avatar):
        avatar = user["avatar"] or ""
    db.run("UPDATE users SET display_name=?, status=?, color=?, avatar=? WHERE id=?",
           (name, status, color, avatar, user["id"]))
    u = user_dict(db.one("SELECT * FROM users WHERE id=?", (user["id"],)))
    hub.push_all({"type": "user", "user": u})
    return {"user": u}


@route("GET", "/api/search")
def search(h, user, p):
    text = (p.get("q") or "").strip()
    if len(text) < 2:
        return {"results": []}
    like = "%" + text.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%"
    sql = ("SELECT m.* FROM messages m JOIN members mb ON mb.room_id=m.room_id AND mb.user_id=? "
           "WHERE m.deleted=0 AND m.is_system=0 "
           "AND (lower(m.body) LIKE lower(CAST(? AS TEXT)) ESCAPE '!' "
           "OR lower(m.file_name) LIKE lower(CAST(? AS TEXT)) ESCAPE '!')")
    args = [user["id"], like, like]
    rid = to_int(p.get("room"))
    if rid:
        sql += " AND m.room_id=?"
        args.append(rid)
    sql += " ORDER BY m.id DESC LIMIT 60"
    return {"results": messages_to_dicts(db.all(sql, args))}


# --------------------------------------------------------------------------- HTTP handler

class Handler(BaseHTTPRequestHandler):
    server_version = "LANChat/1.0"
    session_token = None

    def log_message(self, fmt, *args):
        pass  # keep the console quiet

    def do_GET(self):
        self.dispatch("GET")

    def do_HEAD(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        self.dispatch("POST")

    def client_ip(self):
        forwarded = self.headers.get("X-Forwarded-For")
        return forwarded.split(",")[0].strip() if forwarded else self.client_address[0]

    def is_https(self):
        return self.headers.get("X-Forwarded-Proto", "").lower() == "https"

    def invite_url(self):
        if PUBLIC_URL:
            return PUBLIC_URL
        host = self.headers.get("Host", "")
        if host and not host.startswith(("localhost", "127.")):
            return f"{'https' if self.is_https() else 'http'}://{host}"
        return LAN_URL

    def send_json(self, obj, status=200, headers=None):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def read_json(self):
        size = to_int(self.headers.get("Content-Length"), 0)
        if size > 1_000_000:
            raise ApiError(413, "Request too large")
        raw = self.rfile.read(size) if size > 0 else b""
        try:
            data = json.loads(raw or b"{}")
        except ValueError:
            raise ApiError(400, "Bad request")
        if not isinstance(data, dict):
            raise ApiError(400, "Bad request")
        return data

    def current_user(self):
        try:
            jar = cookies.SimpleCookie(self.headers.get("Cookie", ""))
        except cookies.CookieError:
            return None
        if "session" not in jar:
            return None
        self.session_token = jar["session"].value
        return db.one("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?",
                      (self.session_token,))

    def dispatch(self, method):
        url = urlparse(self.path)
        if not url.path.startswith("/api/"):
            if method == "GET":
                try:
                    return self.serve_file(url.path)
                except OSError:
                    return  # client went away
                except Exception:
                    traceback.print_exc()
                    return self.send_json({"error": "Server error"}, 500)
            return self.send_json({"error": "Not found"}, 404)
        entry = ROUTES.get((method, url.path))
        if not entry:
            return self.send_json({"error": "Not found"}, 404)
        fn, needs_auth = entry
        try:
            user = self.current_user()
            if needs_auth and not user:
                raise ApiError(401, "Please sign in")
            if method == "GET":
                arg = {k: v[0] for k, v in parse_qs(url.query).items()}
            elif url.path == "/api/upload":
                arg = None  # the upload route reads the raw body itself
            else:
                arg = self.read_json()
            result = fn(self, user, arg)
            if result is not None:
                self.send_json(result)
        except ApiError as e:
            self.send_json({"error": e.msg}, e.status)
        except OSError:
            pass  # client went away
        except Exception:
            traceback.print_exc()
            try:
                self.send_json({"error": "Something went wrong on the server"}, 500)
            except OSError:
                pass

    def serve_file(self, path):
        m = FILE_URL_RE.match(path)
        if m:
            f = db.one("SELECT name, type, data FROM files WHERE id=?", (m.group(1),))
            if not f:
                return self.send_json({"error": "Not found"}, 404)
            ctype = f["type"] or "application/octet-stream"
            headers = [("X-Content-Type-Options", "nosniff"), ("Content-Security-Policy", "sandbox"),
                       ("Cache-Control", "private, max-age=31536000, immutable")]
            if not (ctype in INLINE_TYPES or ctype.startswith(("video/", "audio/"))):
                ctype = "application/octet-stream"
                headers.append(("Content-Disposition", f"attachment; filename*=UTF-8''{quote(f['name'] or 'file')}"))
            return self.send_bytes(bytes(f["data"]), ctype, headers)
        name = "index.html" if path in ("", "/") else unquote(path).lstrip("/")
        if name not in PAGE_FILES:
            return self.send_json({"error": "Not found"}, 404)
        # The page files may sit in static/ or right next to this script.
        full = next((p for p in (os.path.join(STATIC_DIR, name), os.path.join(BASE_DIR, name))
                     if os.path.isfile(p)), None)
        if not full:
            return self.send_json({"error": "Not found"}, 404)
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype == "application/javascript":
            ctype += "; charset=utf-8"
        with open(full, "rb") as fh:
            self.send_bytes(fh.read(), ctype, [("Cache-Control", "no-cache")])

    def send_bytes(self, data, ctype, headers):
        size = len(data)
        start, end, status = 0, size - 1, 200
        rng = re.match(r"bytes=(\d*)-(\d*)$", (self.headers.get("Range") or "").strip())
        if rng and (rng.group(1) or rng.group(2)):  # video/audio seeking (needed by iPhones)
            if rng.group(1):
                start = int(rng.group(1))
                end = min(int(rng.group(2)), size - 1) if rng.group(2) else size - 1
            else:
                start = max(0, size - int(rng.group(2)))
            if start > end:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            status = 206
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Accept-Ranges", "bytes")
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        for k, v in headers:
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data[start:end + 1])


# --------------------------------------------------------------------------- main

def main():
    global db, LAN_URL
    db = Database()
    seed()
    LAN_URL = f"http://{lan_ip()}:{PORT}"
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    server.daemon_threads = True
    print(f"\n  LAN Chat is running on port {PORT} ({'PostgreSQL' if db.pg else 'local SQLite'} database)\n")
    if PUBLIC_URL:
        print(f"  Public address:         {PUBLIC_URL}\n")
    else:
        print(f"  On this computer:       http://localhost:{PORT}")
        print(f"  For people around you:  {LAN_URL}   (same Wi-Fi / network)\n")
    print("  Press Ctrl+C to stop.\n", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
