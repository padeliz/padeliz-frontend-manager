# Deploy (DigitalOcean App Platform)

## Pipeline

| Trigger | Action |
|---|---|
| Pull request | CI tests only |
| Push to `main` | Test → build/push DOCR → deploy **staging** (image digests only) → smoke web |
| GitHub Release published | Build/push DOCR → deploy **production** (image digests only; approval required) → smoke web |

Post-deploy smoke (`scripts/ci/smoke-web.sh`) checks HTTP 200, rejects the default nginx welcome page, and requires the `Padeliz Manager` marker. Failure fails the workflow only (no automatic App Platform rollback).

Image: `registry.digitalocean.com/padeliz/padeliz-frontend-manager`

CI builds `linux/amd64` only with provenance/SBOM attestations disabled on the DOCR push so the tag points at a single image manifest. App Platform pins that digest via `IMAGE_DIGEST_WEB` from `build-push-action` (attestation indexes / nested manifests are not pullable by App Platform).

Router origin follows `EXPO_PUBLIC_BASE_URL` via `app.config.js` (staging/production set as Docker build-args).

`app/` is Expo Router routes only. Route and API tests live under `__tests__/app/` (not colocated under `app/`), so production `expo export` never treats tests as routes.

Daily deploys do **not** push [`.do/app.*.yaml`](../.do/). They only update the `web` component image digest on the existing App Platform app so encrypted secrets in the DigitalOcean UI are never wiped.

## App identity

| Env | App name | App ID |
|---|---|---|
| Staging | `padeliz-frontend-manager-staging` | `ae0a03e7-5aae-4081-bc08-e5df306ccbd9` |
| Production | `padeliz-frontend-manager-prod` | `6b411809-5b9a-4baf-9c24-8d5e56ed6f1a` |

## Role of `.do/app.*.yaml`

Checked-in **bootstrap / contract** only (domains, plain `EXPO_PUBLIC_*` defaults, secret key names). Secret **values** live in the App Platform UI. Structural or plain-env changes in YAML require a **manual** DO update (or rare one-off spec sync), not the normal GitHub deploy.

## App Platform runtime secrets

Set these as **encrypted runtime secrets** on the Manager App Platform app (staging and production). They are read by the Expo server `/api/auth/*` BFF routes — not baked into the image. Paste real non-empty values; rotate in the UI only, then redeploy.

- `GOOGLE_CLIENT_ID` — Manager Google OAuth **Web** client ID (must equal backend `GOOGLE_MANAGER_CLIENT_ID`)
- `GOOGLE_CLIENT_SECRET` — Manager Google OAuth client secret
- `JWT_SECRET` — secret used to sign BFF session JWTs (generate a long random string per environment)

Google Console authorized redirect URIs for the Manager client (BFF path `/api/auth/callback`, not `/auth/callback`):

- `https://manager.staging.padeliz.ro/api/auth/callback`
- `https://manager.padeliz.ro/api/auth/callback`
- Local: `http://localhost:8083/api/auth/callback`

## Rollback

Redeploy a previous image digest from App Platform history or re-run the workflow on an older release tag.
