# Deploy (DigitalOcean App Platform)

## Pipeline

| Trigger | Action |
|---|---|
| Pull request | CI tests only |
| Push to `main` | Test → build/push DOCR → deploy **staging** |
| GitHub Release published | Build/push DOCR → deploy **production** (approval required) |

Image: `registry.digitalocean.com/padeliz/padeliz-frontend-manager`

Router origin follows `EXPO_PUBLIC_BASE_URL` via `app.config.js` (staging/production set as Docker build-args).

## App IDs

| Env | App ID |
|---|---|
| Staging | `ae0a03e7-5aae-4081-bc08-e5df306ccbd9` |
| Production | `6b411809-5b9a-4baf-9c24-8d5e56ed6f1a` |

## App Platform runtime secrets

Set these as **runtime secrets** on the Manager App Platform app (staging and production). They are read by the Expo server `/api/auth/*` BFF routes — not baked into the image.

- `GOOGLE_CLIENT_ID` — Manager Google OAuth **Web** client ID (must equal backend `GOOGLE_MANAGER_CLIENT_ID`)
- `GOOGLE_CLIENT_SECRET` — Manager Google OAuth client secret
- `JWT_SECRET` — secret used to sign BFF session JWTs (generate a long random string per environment)

Google Console authorized redirect URIs for the Manager client (BFF path `/api/auth/callback`, not `/auth/callback`):

- `https://manager.staging.padeliz.ro/api/auth/callback`
- `https://manager.padeliz.ro/api/auth/callback`
- Local: `http://localhost:8083/api/auth/callback`

## Rollback

Redeploy a previous image digest from App Platform history or re-run the workflow on an older release tag.
