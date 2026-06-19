# Enabling Google Sign-In on the Deployed (Railway) App

## Why the button disappears after deploying

The "Continue with Google" button is **feature-gated on environment variables**. It only renders when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present:

```ts
// src/lib/google-oauth.ts
export function isGoogleAuthEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
```

```tsx
// src/components/google-sign-in-button.tsx
export function GoogleAuthSection(...) {
  if (!isGoogleAuthEnabled()) return null;   // <-- silently hides on Railway
  ...
}
```

Locally those two variables live in your `.env`, so the button shows. **On Railway they were never set**, so `isGoogleAuthEnabled()` returns `false` and the whole section renders as `null` — no error, it just vanishes.

There is a second dependency: the OAuth **redirect URI** is built from `NEXT_PUBLIC_APP_URL`:

```ts
// src/lib/google-oauth.ts
export function getGoogleRedirectUri(): string {
  return `${getAppUrl()}/api/auth/google/callback`;   // getAppUrl() = NEXT_PUBLIC_APP_URL
}
```

If `NEXT_PUBLIC_APP_URL` is missing it falls back to `http://localhost:3000`, which would break the callback even if the button appeared. So both must be set in production.

---

## The fix — three things, all required

### 1. Add the production redirect URI in Google Cloud Console

The Google OAuth client you already use locally must be told to trust your Railway URL.

1. Go to **Google Cloud Console → APIs & Services → Credentials**.
2. Open the **OAuth 2.0 Client ID** you're already using (the one whose ID/secret are in your local `.env`).
3. Under **Authorized redirect URIs**, add your production callback (keep the localhost one too):
   - `https://YOUR-PRODUCTION-DOMAIN/api/auth/google/callback`
   - e.g. `https://lessora.app/api/auth/google/callback` (use your real domain — see step 2 about which host)
4. Under **Authorized JavaScript origins**, add `https://YOUR-PRODUCTION-DOMAIN`.
5. **Save.** Changes can take a few minutes to propagate on Google's side.

> The redirect URI must match **exactly** — scheme (`https`), host, and the `/api/auth/google/callback` path. A trailing slash or `http` vs `https` mismatch causes Google's `redirect_uri_mismatch` error.

### 2. Set the environment variables on Railway

In the Railway project → your service → **Variables**, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `GOOGLE_CLIENT_ID` | (same value as your local `.env`) | Makes the button appear |
| `GOOGLE_CLIENT_SECRET` | (same value as your local `.env`) | Makes the button appear |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-PRODUCTION-DOMAIN` | Builds the correct redirect URI; **must match** the URI registered in step 1 |
| `SESSION_SECRET` | a 32+ char random string | Required in production; the OAuth `state` is HMAC-signed with it (`getSessionSecret()` throws if <32 chars in prod) |

Important details:

- **`NEXT_PUBLIC_APP_URL` is a build-time variable.** Anything prefixed `NEXT_PUBLIC_` is inlined when Next.js builds. After setting/changing it on Railway, you must **trigger a fresh deploy/build** — editing the value without rebuilding won't take effect.
- **Use the canonical domain, not the `*.up.railway.app` host**, if you have a custom domain. The app actively redirects non-canonical hosts to `NEXT_PUBLIC_APP_URL` (`shouldRedirectToCanonicalHost` in `src/lib/app-url.ts`). Whatever you put in `NEXT_PUBLIC_APP_URL` is the host that must be registered in Google (step 1).
- If you only use the Railway-generated domain, set `NEXT_PUBLIC_APP_URL` to exactly that `https://...up.railway.app` URL and register the same in Google.

### 3. Redeploy

Trigger a new deployment on Railway so the build picks up `NEXT_PUBLIC_APP_URL` and the runtime picks up the Google credentials. After it's live, the "Continue with Google" section will render on `/sign-in` and `/sign-up`.

---

## Verifying it works

1. Visit `https://YOUR-PRODUCTION-DOMAIN/sign-in` — the **Continue with Google** button + "or" divider should now appear.
2. Click it → you should land on Google's `accounts.google.com` consent screen (with `select_account`).
3. Pick an account → you should be redirected back to `…/api/auth/google/callback` and end up signed in at `/dashboard`.

### If the button still doesn't show
- The env vars didn't take — confirm `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set on the **correct service** and the deploy that's live was built **after** you added them.

### If you get `redirect_uri_mismatch` from Google
- The URI in Google Console doesn't exactly match `NEXT_PUBLIC_APP_URL + /api/auth/google/callback`. Recheck scheme/host/path and that you saved in Console.

### If sign-in starts but fails at the callback
- `SESSION_SECRET` missing or shorter than 32 chars in production → the OAuth state can't be verified. Set a proper 32+ char secret and redeploy.
- `NEXT_PUBLIC_APP_URL` still pointing at localhost (stale build) → redeploy after setting it.

---

## Checklist

- [ ] Production callback URL added to the OAuth client in Google Cloud Console
- [ ] Production origin added to Authorized JavaScript origins
- [ ] `GOOGLE_CLIENT_ID` set on Railway
- [ ] `GOOGLE_CLIENT_SECRET` set on Railway
- [ ] `NEXT_PUBLIC_APP_URL` set to the canonical production URL on Railway
- [ ] `SESSION_SECRET` set (32+ chars) on Railway
- [ ] Re-deployed so the build inlined `NEXT_PUBLIC_APP_URL`
- [ ] Button appears at `/sign-in` and full round-trip sign-in works
