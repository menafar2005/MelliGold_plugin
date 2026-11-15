// All plugin settings live here and are read from this file, NOT from Cloudflare Worker
// variables/secrets. Anything set in the Cloudflare dashboard is ignored by the code.
// NOTE: this file is committed with real keys in it.
export const config = {
  // Didar marketplace (runtime token exchange).
  MARKETPLACE_BASE_URL: 'https://marketplace.didar.me',

  // Didar OpenAPI (deal/contact reads with API Key) and install completion.
  DIDAR_BASE_URL: 'https://app.didar.me',
  DIDAR_API_KEY: 'ex2y2nzmy4y2vrs776drfbu7gg58onwo', // TODO: API Key of the test business

  // From Developer Hub.
  DIDAR_CLIENT_ID: 'be1652e6d6bfecc3d94514be6a43aca9',
  DIDAR_CLIENT_SECRET: 'b38620ba4bb8ccc04a620bb5522218ceb33e27b4', // TODO: Client secret from Developer Hub

  // melligold-data-source. Normally reached via the MELLIGOLD service binding;
  // the base URL is only used if that binding is missing.
  MELLIGOLD_BASE_URL: 'https://melligold-data-source.ehsan2005-ir.workers.dev',
  MELLIGOLD_API_KEY: 'mg_ZhlThctoZ7xAbx9mi_2cn1gw3tmOKJex',
};
