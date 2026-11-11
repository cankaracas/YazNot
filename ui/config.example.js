/**
 * Local development configuration.
 *
 * Copy this file to `config.js` and fill in the values from your own
 * Supabase project. `npm run setup` does the copy automatically.
 *
 * Only the publishable (anon) key belongs in a client application.
 * Never put a `service_role` key here or in any file committed to git.
 */
window.YAZNOT_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',

  // Optional: where the desktop Google sign-in returns. The default is the
  // public PWA. Add the same URL to Supabase -> Authentication -> URL
  // Configuration -> Redirect URLs.
  oauthRedirect: 'https://yaznot.vercel.app/app/'
};
