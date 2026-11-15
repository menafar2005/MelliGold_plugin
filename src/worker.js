import { exchangeLaunchCode, LaunchExpiredError } from './runtime.js';
export { LaunchExchange } from './runtime.js';
import { loggedFetch, withInboundLog } from './log.js';
import { getPersonIdFromDeal, getPerson } from './didar.js';
import { findByMobile } from './melligold.js';
import { extractMobiles } from './phone.js';
import { renderState, renderSuccess, renderInstalled } from './render.js';

const LOCATION_DEAL = 2;
const LOCATION_PERSON = 4;

const html = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });

async function install(url) {
  try {
    const r = await loggedFetch('didar_install', 'https://app.didar.me/api/MarketplaceInstall/CompleteInstallation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Code: url.searchParams.get('code'),
        ClientId: process.env.DIDAR_CLIENT_ID,
        ClientSecret: process.env.DIDAR_CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await r.json().catch(() => ({}));
    const ok = !!(json.Response && json.Response.Succeeded === true);
    if (ok) console.log('install complete, BizDomainId:', json.Response.BizDomainId);
    else console.warn('install failed, status', r.status);
    return html(renderInstalled(ok));
  } catch {
    console.warn('install request error');
    return html(renderInstalled(false));
  }
}

async function panel(url) {
  const reply = (state) => html(renderState(state));
  try {
    let ctx;
    try {
      ctx = await exchangeLaunchCode(url.searchParams.get('launchCode'));
    } catch (err) {
      if (err instanceof LaunchExpiredError) {
        console.warn('launch expired:', err.message);
        return html(renderState('launch_expired', err.code));
      }
      console.warn('runtime exchange error:', err.message);
      return html(renderState('didar_error', err.code));
    }

    if (![LOCATION_DEAL, LOCATION_PERSON].includes(ctx.location) || !ctx.entityId) return reply('unsupported');

    let personId = ctx.entityId;
    if (ctx.location === LOCATION_DEAL) {
      try {
        personId = await getPersonIdFromDeal(ctx.entityId);
      } catch (err) {
        console.warn('didar deal error:', err.message);
        return reply('didar_error');
      }
      if (!personId) return reply('no_person');
    }

    let person;
    try {
      person = await getPerson(personId);
    } catch (err) {
      console.warn('didar person error:', err.message);
      return reply('didar_error');
    }

    const mobiles = extractMobiles(person.phones);
    if (!mobiles.length) return reply('no_phone');

    for (const mobile of mobiles) {
      let data;
      try {
        data = await findByMobile(mobile);
      } catch (err) {
        console.warn('melligold error:', err.message);
        return reply('unavailable');
      }
      if (data && data.gold) {
        return html(renderSuccess({ displayName: person.displayName, mobile, gold: data.gold }));
      }
    }
    return reply('not_found');
  } catch (err) {
    console.error('unexpected panel error:', err.message);
    return reply('didar_error');
  }
}

function route(request) {
  const url = new URL(request.url);
  if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
  switch (url.pathname) {
    case '/panel':
      return panel(url);
    case '/install/callback':
      return install(url);
    case '/healthz':
      return Response.json({ ok: true });
    default:
      return new Response('Not Found', { status: 404 });
  }
}

export default {
  // Every request (any path, any method) is recorded in inbound_requests.
  fetch(request, _env, ctx) {
    return withInboundLog(request, ctx, route);
  },
};
