// Filled in after the one-time setup in docs/composer-setup.md. While either is empty the
// composer hides "Sign in with GitHub" and falls back to pasting a token by hand.
export const AUTH = {
  /** Client ID of the GitHub App (public, safe to commit). */
  clientId: "",
  /** URL of the deployed Cloudflare Worker (worker/github-auth-proxy.js), no trailing slash. */
  proxy: "",
};
