#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.MEMO_HOST || '0.0.0.0';
const PORT = Number(process.env.MEMO_PORT || 18765);
const MEMO_FILE = process.env.MEMO_FILE || path.join(process.cwd(), 'memo.txt');

let messages = [];
let lastPersistHash = '';
const clients = new Set();

function withCors(req, res) {
  const origin = String(req?.headers?.origin || '').trim();
  // file:// からは Origin: null になる。資格情報を使わないため '*' 許可を固定で返す。
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (origin) res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, Cache-Control, Pragma');
  res.setHeader('Access-Control-Max-Age', '86400');
  // Chrome系の Private Network Access 対策
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

function safeReadMemoFile() {
  try {
    if (!fs.existsSync(MEMO_FILE)) {
      fs.writeFileSync(MEMO_FILE, '', 'utf8');
      return '';
    }
    return fs.readFileSync(MEMO_FILE, 'utf8');
  } catch (_) {
    return '';
  }
}

function parseMemoText(text) {
  const lines = String(text || '').split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (!parsed || typeof parsed !== 'object') continue;
      const ts = parsed.ts || new Date().toISOString();
      const deviceNo = Number(parsed.deviceNo) || 0;
      const actor = String(parsed.actor || 'A').toUpperCase();
      const body = String(parsed.text || '');
      const id = String(parsed.id || `${ts}|${deviceNo}|${actor}|${body}`);
      out.push({ id, ts, deviceNo, actor, text: body });
    } catch (_) {
      continue;
    }
  }
  out.sort((a, b) => {
    const at = new Date(a.ts).getTime() || 0;
    const bt = new Date(b.ts).getTime() || 0;
    return at - bt;
  });
  return out;
}

function serializeMemo(messagesList) {
  return (Array.isArray(messagesList) ? messagesList : [])
    .map((m) => JSON.stringify({
      id: String(m.id || ''),
      ts: m.ts || new Date().toISOString(),
      deviceNo: Number(m.deviceNo) || 0,
      actor: String(m.actor || 'A').toUpperCase(),
      text: String(m.text || '')
    }))
    .join('\n') + ((messagesList && messagesList.length) ? '\n' : '');
}

function refreshFromDiskIfChanged() {
  const text = safeReadMemoFile();
  const hash = `${text.length}:${text.slice(0, 120)}`;
  if (hash === lastPersistHash) return false;
  messages = parseMemoText(text);
  lastPersistHash = hash;
  return true;
}

function persistMessages() {
  const text = serializeMemo(messages);
  fs.writeFileSync(MEMO_FILE, text, 'utf8');
  lastPersistHash = `${text.length}:${text.slice(0, 120)}`;
}

function sendSse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcastMessages() {
  for (const res of clients) {
    sendSse(res, 'messages', { messages });
  }
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function upsertMessage(payload) {
  const ts = payload.ts || new Date().toISOString();
  const deviceNo = Number(payload.deviceNo) || 0;
  const actor = String(payload.actor || 'A').toUpperCase();
  const text = String(payload.text || '');
  const id = String(payload.id || `${Date.now()}-${deviceNo}-${Math.random().toString(36).slice(2, 7)}`);
  const idx = messages.findIndex((m) => String(m.id) === id);
  const next = { id, ts, deviceNo, actor, text };
  if (idx >= 0) {
    messages[idx] = next;
  } else {
    messages.push(next);
  }
  messages.sort((a, b) => {
    const at = new Date(a.ts).getTime() || 0;
    const bt = new Date(b.ts).getTime() || 0;
    return at - bt;
  });
}

function deleteMessageById(id) {
  messages = messages.filter((m) => String(m.id) !== String(id));
}

refreshFromDiskIfChanged();

const server = http.createServer(async (req, res) => {
  withCors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, host: HOST, port: PORT, memoFile: MEMO_FILE }));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/messages') {
    refreshFromDiskIfChanged();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ messages }));
    return;
  }
  if (req.method === 'POST' && url.pathname === '/messages') {
    try {
      const payload = await parseJsonBody(req);
      if (payload && payload.op === 'delete') {
        deleteMessageById(payload.id);
      } else {
        upsertMessage(payload || {});
      }
      persistMessages();
      broadcastMessages();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, messages }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(error && error.message || error) }));
    }
    return;
  }
  if (req.method === 'GET' && url.pathname === '/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });
    res.write('retry: 1000\n\n');
    clients.add(res);
    sendSse(res, 'messages', { messages });
    const keepAlive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (_) {}
    }, 15000);
    req.on('close', () => {
      clearInterval(keepAlive);
      clients.delete(res);
      try { res.end(); } catch (_) {}
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: false, error: 'Not Found' }));
});

server.listen(PORT, HOST, () => {
  console.log(`[memo-local-server] listening on http://${HOST}:${PORT}`);
  console.log(`[memo-local-server] memo file: ${MEMO_FILE}`);
});

setInterval(() => {
  if (refreshFromDiskIfChanged()) {
    broadcastMessages();
  }
}, 1000);
