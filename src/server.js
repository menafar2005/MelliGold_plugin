'use strict';

const express = require('express');
const { exchangeLaunchCode, LaunchExpiredError } = require('./runtime');
const { getPersonIdFromDeal, getPerson } = require('./didar');
const { findByMobile } = require('./melligold');
const { extractMobiles } = require('./phone');
const { renderState, renderSuccess, renderInstalled } = require('./render');

const app = express();
app.disable('x-powered-by');

const LOCATION_DEAL = 2;
const LOCATION_PERSON = 4;

function sendHtml(res, html) {
  res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }).send(html);
}

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.get('/install/callback', async (req, res) => {
  const code = req.query.code;
  try {
    const r = await fetch('https://app.didar.me/api/MarketplaceInstall/CompleteInstallation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Code: code,
        ClientId: process.env.DIDAR_CLIENT_ID,
        ClientSecret: process.env.DIDAR_CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await r.json().catch(() => ({}));
    const ok = json.Response && json.Response.Succeeded === true;
    if (ok) console.log('install complete, BizDomainId:', json.Response.BizDomainId);
    else console.warn('install failed, status', r.status);
    sendHtml(res, renderInstalled(ok));
  } catch {
    console.warn('install request error');
    sendHtml(res, renderInstalled(false));
  }
});

app.get('/panel', async (req, res) => {
  const reply = (state) => sendHtml(res, renderState(state));
  try {
    let ctx;
    try {
      ctx = await exchangeLaunchCode(req.query.launchCode);
    } catch (err) {
      if (err instanceof LaunchExpiredError) return reply('launch_expired');
      console.warn('runtime exchange error:', err.message);
      return reply('didar_error');
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
        return sendHtml(res, renderSuccess({ displayName: person.displayName, mobile, gold: data.gold }));
      }
    }
    return reply('not_found');
  } catch (err) {
    console.error('unexpected panel error:', err.message);
    return reply('didar_error');
  }
});

const port = Number(process.env.PORT) || 3000;
if (require.main === module) {
  app.listen(port, () => console.log(`melligold-plugin listening on :${port}`));
}

module.exports = app;
