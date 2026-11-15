-- Requests that reached the plugin (Didar iframe, install callback, healthz, anything else).
CREATE TABLE IF NOT EXISTS inbound_requests (
  id               TEXT PRIMARY KEY,              -- UUID; outbound_requests.inbound_id points here
  created_at       TEXT NOT NULL,                 -- ISO-8601 UTC, when the request arrived
  method           TEXT NOT NULL,
  url              TEXT NOT NULL,                 -- full URL incl. query (launchCode etc.)
  request_headers  TEXT NOT NULL,                 -- JSON object, all headers as received
  request_body     TEXT,
  response_status  INTEGER,
  response_headers TEXT,                          -- JSON object
  response_body    TEXT,                          -- full HTML/JSON sent back
  duration_ms      INTEGER,
  error            TEXT                           -- unhandled exception, if any
);
CREATE INDEX IF NOT EXISTS idx_inbound_created ON inbound_requests (created_at);

-- Requests the plugin sent elsewhere (Didar marketplace, Didar OpenAPI, melligold-data-source).
CREATE TABLE IF NOT EXISTS outbound_requests (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  inbound_id       TEXT,                          -- the inbound request that triggered it (no FK: inbound row is written last)
  created_at       TEXT NOT NULL,
  target           TEXT NOT NULL,                 -- didar_marketplace | didar_openapi | melligold | didar_install
  method           TEXT NOT NULL,
  url              TEXT NOT NULL,                 -- full URL incl. query (apikey is NOT masked)
  request_headers  TEXT NOT NULL,                 -- JSON object (X-API-Key is NOT masked)
  request_body     TEXT,                          -- raw body (clientSecret is NOT masked)
  response_status  INTEGER,
  response_headers TEXT,
  response_body    TEXT,
  duration_ms      INTEGER,
  error            TEXT                           -- network error / timeout
);
CREATE INDEX IF NOT EXISTS idx_outbound_created ON outbound_requests (created_at);
CREATE INDEX IF NOT EXISTS idx_outbound_inbound ON outbound_requests (inbound_id);
