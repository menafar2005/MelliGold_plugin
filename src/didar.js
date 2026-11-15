import { loggedFetch } from './log.js';
import { config } from './config.js';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export class DidarError extends Error {}

export async function post(path, body) {
  const base = config.DIDAR_BASE_URL.replace(/\/$/, '');
  let res;
  try {
    // API key goes in the query; the request log stores this URL unmasked by design.
    res = await loggedFetch('didar_openapi', `${base}${path}?apikey=${encodeURIComponent(config.DIDAR_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new DidarError(`${path} network error`);
  }
  if (!res.ok) throw new DidarError(`${path} status ${res.status}`);
  const json = await res.json().catch(() => null);
  if (!json || !json.Response) throw new DidarError(`${path} bad response`);
  return json.Response;
}

/** Returns personId, or null when the deal has no person. */
export async function getPersonIdFromDeal(dealId) {
  const deal = await post('/api/deal/getdealdetail', { Id: dealId });
  const id = deal.PersonId;
  return !id || id === EMPTY_GUID ? null : id;
}

export async function getPerson(personId) {
  const p = await post('/api/contact/GetContactDetail', { Id: personId });
  const others = (p.OtherPhones && Array.isArray(p.OtherPhones.KeyValues) ? p.OtherPhones.KeyValues : []).map((kv) => kv && kv.Value);
  return {
    displayName: p.DisplayName || '',
    phones: [p.MobilePhone, ...others].filter((v) => typeof v === 'string'),
  };
}
