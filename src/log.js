// Full request/response logging into D1 (binding DB). Nothing is masked: URLs, headers,
// bodies and responses are stored exactly as sent/received, secrets included.
import { env } from 'cloudflare:workers';
import { AsyncLocalStorage } from 'node:async_hooks';

/** Per-inbound-request scope: { inboundId, pending: Promise[] }. */
export const requestScope = new AsyncLocalStorage();

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS inbound_requests (
    id TEXT PRIMARY KEY, created_at TEXT NOT NULL, method TEXT NOT NULL, url TEXT NOT NULL,
    request_headers TEXT NOT NULL, request_body TEXT, response_status INTEGER, response_headers TEXT,
    response_body TEXT, duration_ms INTEGER, error TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_inbound_created ON inbound_requests (created_at)`,
  `CREATE TABLE IF NOT EXISTS outbound_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT, inbound_id TEXT, created_at TEXT NOT NULL, target TEXT NOT NULL,
    method TEXT NOT NULL, url TEXT NOT NULL, request_headers TEXT NOT NULL, request_body TEXT,
    response_status INTEGER, response_headers TEXT, response_body TEXT, duration_ms INTEGER, error TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_outbound_created ON outbound_requests (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_outbound_inbound ON outbound_requests (inbound_id)`,
];

let schemaReady = null;
function ensureSchema(db) {
  schemaReady ??= db.batch(SCHEMA.map((s) => db.prepare(s))).catch((e) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

const headersJson = (h) => JSON.stringify(Object.fromEntries(new Headers(h || {}).entries()));

function bodyText(body) {
  if (body == null) return null;
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  return String(body);
}

async function write(sql, params) {
  const db = env.DB;
  if (!db) return;
  try {
    await ensureSchema(db);
    await db.prepare(sql).bind(...params).run();
  } catch (e) {
    console.error('request log write failed:', e.message);
  }
}

/** Inside an inbound request: defer the write (flushed via ctx.waitUntil). Elsewhere (Durable Object): await it. */
function schedule(p) {
  const scope = requestScope.getStore();
  if (scope) {
    scope.pending.push(p);
    return undefined;
  }
  return p;
}

/**
 * Drop-in for fetch(url, init) that records the full exchange in outbound_requests.
 * `fetcher` lets service bindings (env.X.fetch) go through the same path.
 */
export async function loggedFetch(target, url, init = {}, { fetcher, inboundId } = {}) {
  const started = Date.now();
  const createdAt = new Date(started).toISOString();
  const scopeId = inboundId ?? requestScope.getStore()?.inboundId ?? null;
  const method = (init.method || 'GET').toUpperCase();
  const reqHeaders = headersJson(init.headers);
  const reqBody = bodyText(init.body);

  let res;
  let error = null;
  try {
    res = fetcher ? await fetcher(url, init) : await fetch(url, init);
  } catch (e) {
    error = `${e.name}: ${e.message}`;
  }

  let status = null;
  let resHeaders = null;
  let resBody = null;
  if (res) {
    status = res.status;
    resHeaders = headersJson(res.headers);
    try {
      resBody = await res.clone().text();
    } catch (e) {
      error = `response body read failed: ${e.message}`;
    }
  }

  const p = write(
    `INSERT INTO outbound_requests (inbound_id, created_at, target, method, url, request_headers, request_body,
       response_status, response_headers, response_body, duration_ms, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [scopeId, createdAt, target, method, String(url), reqHeaders, reqBody, status, resHeaders, resBody, Date.now() - started, error],
  );
  const wait = schedule(p);
  if (wait) await wait;

  if (!res) throw new Error(error);
  return res;
}

/**
 * Wraps the worker's fetch handler: runs `handler` inside a log scope and records the
 * inbound request + response in inbound_requests. Writes happen after the response is sent.
 */
export async function withInboundLog(request, ctx, handler) {
  const started = Date.now();
  const scope = { inboundId: crypto.randomUUID(), pending: [] };
  const reqBody = ['GET', 'HEAD'].includes(request.method) ? null : await request.clone().text().catch(() => null);

  let response;
  let error = null;
  try {
    response = await requestScope.run(scope, () => handler(request));
  } catch (e) {
    error = `${e.name}: ${e.message}\n${e.stack || ''}`;
    console.error('unhandled error:', e);
    response = new Response('Internal Error', { status: 500 });
  }

  const resBody = await response.clone().text().catch(() => null);
  const inbound = write(
    `INSERT INTO inbound_requests (id, created_at, method, url, request_headers, request_body,
       response_status, response_headers, response_body, duration_ms, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      scope.inboundId, new Date(started).toISOString(), request.method, request.url, headersJson(request.headers), reqBody,
      response.status, headersJson(response.headers), resBody, Date.now() - started, error,
    ],
  );
  ctx.waitUntil(Promise.allSettled([inbound, ...scope.pending]));
  return response;
}
