# melligold-plugin (demo)

Didar marketplace plugin: a Custom panel on Deal details and Person details showing the contact's Melli Gold balance (grams + Toman value), fed by `melligold-mock`.

## Run

```bash
npm install
cp .env.example .env   # fill in values (use a TEST business API key)
npm start
```

Developer Hub requires HTTPS, so expose the plugin through a tunnel (`cloudflared tunnel --url http://localhost:3000` or ngrok). `melligold-mock` does not need to be exposed.

## Register in Developer Hub

| Field | Value |
|---|---|
| Callback URL | `https://<PLUGIN_HOST>/install/callback` |
| Scopes | `deals`, `contacts` |
| Extension | Custom panel |
| Panel name | موجودی ملی گلد |
| Iframe URL | `https://<PLUGIN_HOST>/panel` |
| JWT secret | any random 32-byte string (unused in demo) |
| Panel locations | Deal details, Person details |

Copy the Client ID / Secret into `.env`, then install the plugin in the test business.

## Flow

1. Didar opens `/panel?launchCode=…`; the plugin exchanges it for context only (the token is never used).
2. Deal page → `getdealdetail` → `PersonId`; Person page → `entityIds[0]`.
3. `GetContactDetail` → mobiles (`src/phone.js`) → `melligold-mock` `/api/v1/users/by-mobile/:mobile`.

Secrets stay server-side. Tests: `npm test`.
