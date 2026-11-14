'use strict';

class MelligoldUnavailableError extends Error {}

/** Returns the mock response body, or null on 404. Throws MelligoldUnavailableError otherwise. */
async function findByMobile(mobile) {
  const base = (process.env.MELLIGOLD_BASE_URL || '').replace(/\/$/, '');
  let res;
  try {
    res = await fetch(`${base}/api/v1/users/by-mobile/${encodeURIComponent(mobile)}`, {
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

module.exports = { findByMobile, MelligoldUnavailableError };
