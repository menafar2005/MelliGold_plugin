# melligold-plugin (demo)

Didar marketplace plugin, running as a Cloudflare Worker: a Custom panel on Deal details and Person details showing the contact's Melli Gold balance (grams + Toman value), fed by `melligold-mock`.

## Deploy (Cloudflare)

Deploy command: `npx wrangler deploy` (config in `wrangler.jsonc`).

Set secrets once (Dashboard → Worker → Settings → Variables and Secrets, or CLI):

```bash
npx wrangler secret put DIDAR_API_KEY
npx wrangler secret put DIDAR_CLIENT_ID
npx wrangler secret put DIDAR_CLIENT_SECRET
npx wrangler secret put MELLIGOLD_BASE_URL
npx wrangler secret put MELLIGOLD_API_KEY
```

`melligold-mock` must be reachable from the internet (HTTPS) since the Worker calls it. Use a TEST business API key.

## Local

Copy `.dev.vars.example` to `.dev.vars`, fill it in, run `npm run dev`. Developer Hub needs HTTPS, so use the deployed URL or a tunnel. Tests: `npm test`.

## Register in Developer Hub

| Field | Value |
|---|---|
| Callback URL | `https://<WORKER_HOST>/install/callback` |
| Scopes | `deals`, `contacts` |
| Extension | Custom panel |
| Panel name | موجودی ملی گلد |
| Iframe URL | `https://<WORKER_HOST>/panel` |
| JWT secret | any random 32-byte string (unused in demo) |
| Panel locations | Deal details, Person details |

## Flow

1. Didar opens `/panel?launchCode=…`; the plugin exchanges it for context only (the token is never used).
2. Deal page → `getdealdetail` → `PersonId`; Person page → `entityIds[0]`.
3. `GetContactDetail` → mobiles (`src/phone.js`) → `melligold-mock` `/api/v1/users/by-mobile/:mobile`.

Secrets stay server-side.
