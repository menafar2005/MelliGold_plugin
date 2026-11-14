import { DurableObject, env } from 'cloudflare:workers';

const RUNTIME_TOKEN_URL = 'https://marketplace.didar.me/api/v1/runtime/token';
// How long a successful exchange is reused for repeat loads of the same launchCode.
const REUSE_MS = 2 * 60 * 1000;

export class LaunchExpiredError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/**
 * One call to the marketplace. Never throws: returns a plain object so it can
 * cross the Durable Object RPC boundary (custom error classes don't survive it).
 */
async function callMarketplace(launchCode) {
  if (!process.env.DIDAR_CLIENT_ID || !process.env.DIDAR_CLIENT_SECRET) {
    return { ok: false, expired: false, reason: 'DIDAR_CLIENT_ID / DIDAR_CLIENT_SECRET are not set' };
  }
  let res;
  try {
    res = await fetch(RUNTIME_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        launchCode,
        clientId: process.env.DIDAR_CLIENT_ID,
        clientSecret: process.env.DIDAR_CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { ok: false, expired: false, reason: 'network error' };
  }
  const json = await res.json().catch(() => null);
  const code = (json && json.error && json.error.code) || `HTTP_${res.status}`;
  const trace = json && json.meta && json.meta.traceId;
  if (!res.ok || !(json && json.succeeded)) {
    // 401 INVALID_CLIENT_CREDENTIALS is a plugin misconfig (client id/secret), not an expired code.
    console.warn('runtime exchange failed:', res.status, code, trace);
    const expired = [409, 410].includes(res.status) || code.startsWith('LAUNCH_CODE_');
    return { ok: false, expired, code, reason: `status ${res.status} ${code}` };
  }
  const ctx = json.data && json.data.context;
  if (!ctx) return { ok: false, expired: false, reason: 'no context in response' };
  // Only the context is kept; the accessToken is discarded (data is read via API Key).
  return {
    ok: true,
    context: {
      location: Number(ctx.location),
      entityType: ctx.entityType,
      entityId: Array.isArray(ctx.entityIds) ? ctx.entityIds[0] : undefined,
    },
  };
}

/**
 * One instance per launchCode. Didar (or the browser) can load the iframe more than once
 * with the same one-time code; the 2nd marketplace exchange then fails with 409
 * LAUNCH_CODE_ALREADY_USED. This object makes the exchange idempotent for REUSE_MS.
 */
export class LaunchExchange extends DurableObject {
  async exchange(launchCode) {
    if (!this.pending) {
      this.pending = this.run(launchCode);
      // Failures are not cached; a later retry gets a fresh attempt.
      this.pending.then((r) => { if (!r.ok) this.pending = null; }, () => { this.pending = null; });
    }
    return this.pending;
  }

  async run(launchCode) {
    const saved = await this.ctx.storage.get('result');
    if (saved && Date.now() - saved.at < REUSE_MS) return saved.result;
    const result = await callMarketplace(launchCode);
    if (result.ok) {
      await this.ctx.storage.put('result', { at: Date.now(), result });
      await this.ctx.storage.setAlarm(Date.now() + REUSE_MS);
    }
    return result;
  }

  async alarm() {
    this.pending = null;
    await this.ctx.storage.deleteAll();
  }
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** launchCode → { location, entityType, entityId }. Throws LaunchExpiredError or Error. */
export async function exchangeLaunchCode(launchCode) {
  if (!launchCode) throw new LaunchExpiredError('missing launchCode', 'NO_LAUNCH_CODE');
  let result;
  if (env.LAUNCH) {
    const stub = env.LAUNCH.get(env.LAUNCH.idFromName(await sha256(launchCode)));
    result = await stub.exchange(launchCode);
  } else {
    result = await callMarketplace(launchCode);
  }
  if (result.ok) return result.context;
  if (result.expired) throw new LaunchExpiredError(result.reason, result.code);
  const err = new Error(`runtime exchange: ${result.reason}`);
  err.code = result.code;
  throw err;
}
