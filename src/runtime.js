const RUNTIME_TOKEN_URL = 'https://marketplace.didar.me/api/v1/runtime/token';

export class LaunchExpiredError extends Error {}

/**
 * Exchange the one-time launchCode for the runtime context.
 * The accessToken in the response is intentionally discarded: data is read via API Key.
 */
export async function exchangeLaunchCode(launchCode) {
  if (!launchCode) throw new LaunchExpiredError('missing launchCode');
  if (!process.env.DIDAR_CLIENT_ID || !process.env.DIDAR_CLIENT_SECRET) {
    throw new Error('DIDAR_CLIENT_ID / DIDAR_CLIENT_SECRET are not set');
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
  } catch (err) {
    throw new Error('runtime exchange network error');
  }
  const json = await res.json().catch(() => null);
  const code = json && json.error && json.error.code;
  const trace = json && json.meta && json.meta.traceId;
  if (!res.ok || !(json && json.succeeded)) {
    // 401 INVALID_CLIENT_CREDENTIALS is a plugin misconfig (client id/secret), not an expired code.
    console.warn('runtime exchange failed:', res.status, code, trace);
    if ([409, 410].includes(res.status) || code === 'LAUNCH_CODE_INVALID') {
      throw new LaunchExpiredError(`status ${res.status} ${code}`);
    }
    throw new Error(`runtime exchange failed: ${res.status} ${code}`);
  }
  const ctx = json.data && json.data.context;
  if (!ctx) throw new Error('runtime exchange: no context');
  return {
    location: Number(ctx.location),
    entityType: ctx.entityType,
    entityId: Array.isArray(ctx.entityIds) ? ctx.entityIds[0] : undefined,
  };
}
