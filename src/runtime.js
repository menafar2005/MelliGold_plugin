const RUNTIME_TOKEN_URL = 'https://marketplace.didar.me/api/v1/runtime/token';

export class LaunchExpiredError extends Error {}

/**
 * Exchange the one-time launchCode for the runtime context.
 * The accessToken in the response is intentionally discarded: data is read via API Key.
 */
export async function exchangeLaunchCode(launchCode) {
  if (!launchCode) throw new LaunchExpiredError('missing launchCode');
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
  if ([401, 409, 410].includes(res.status)) throw new LaunchExpiredError(`status ${res.status}`);
  if (!res.ok) throw new Error(`runtime exchange failed: ${res.status}`);
  const json = await res.json();
  const ctx = json && json.data && json.data.context;
  if (!ctx) throw new Error('runtime exchange: no context');
  return {
    location: Number(ctx.location),
    entityType: ctx.entityType,
    entityId: Array.isArray(ctx.entityIds) ? ctx.entityIds[0] : undefined,
  };
}
