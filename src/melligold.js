import { env } from 'cloudflare:workers';

export class MelligoldUnavailableError extends Error {}

/**
 * Prefer the service binding to melligold-data-source (worker-to-worker on the same
 * account; avoids Cloudflare's 1042 error and needs no public URL). Falls back to
 * MELLIGOLD_BASE_URL over HTTP, e.g. for a real Melli Gold API later.
 */
function request(path, init) {
  if (env.MELLIGOLD) return env.MELLIGOLD.fetch(new Request(`https://melligold.internal${path}`, init));
  const base = (process.env.MELLIGOLD_BASE_URL || '').replace(/\/$/, '');
  return fetch(`${base}${path}`, init);
}

/** Returns the data-source response body, or null on 404. Throws MelligoldUnavailableError otherwise. */
export async function findByMobile(mobile) {
  let res;
  try {
    res = await request(`/api/v1/users/by-mobile/${encodeURIComponent(mobile)}`, {
      headers: { 'X-API-Key': process.env.MELLIGOLD_API_KEY || '' },
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    throw new MelligoldUnavailableError('network/timeout');
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new MelligoldUnavailableError(`status ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new MelligoldUnavailableError('bad json');
  }
}
