# Backend deployment on Vercel

The backend is the existing Express application in this directory. [Vercel's Express framework support](https://vercel.com/docs/frameworks/backend/express) discovers the default-exported app in `src/app.js`. The local-only `src/index.js` continues to start the HTTP server through the existing npm scripts. No second server entry point or catch-all rewrite is needed.

## Vercel project settings

The Git repository root contains the application in the nested `hariom-portfolio-fullstack` directory. Vercel's **Root Directory** values below are relative to the Git repository root.

Create a separate Vercel project from the portfolio repository:

| Setting | Value |
| --- | --- |
| Project name | `hariom-potofolio-backend` |
| Root Directory | `hariom-portfolio-fullstack/server` |
| Framework Preset | Express (or let Vercel detect Express) |
| Build Command | Leave the detected/default command; no compile step is required |
| Output Directory | Leave empty/default |
| Install Command | `npm install` (or Vercel's detected npm install) |

The Express application serves its existing `/api/...` routes directly. Do not add a rewrite that changes those paths. The current structure uses Vercel's zero-configuration Express support, so a separate `vercel.json` is not required.

Configure production variables in the backend project's **Settings → Environment Variables**. Add them to Production, and to Preview/Development only when those environments have their own valid database, origins, and credentials. Do not put backend secrets in the frontend project. Keep the two Vercel projects pointed at this repository, with their respective `server` and `client` root directories.

## Required backend environment variables

| Variable | Required | Value |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string for the production database. |
| `JWT_SECRET` | Yes | A randomly generated secret with at least 32 UTF-8 bytes. Keep it private. |
| `CLIENT_ORIGIN` | Yes | Exact frontend origin(s), comma-separated when necessary; for example `https://your-portfolio.vercel.app`. Do not add a trailing slash or use a wildcard. |

Vercel sets `NODE_ENV=production` for production deployments. For the separate Vercel frontend/backend origins, the backend defaults to `COOKIE_SAME_SITE=none` and secure HTTPS-only cookies. Do not disable `secure`. `COOKIE_DOMAIN` is optional; leave it unset for separate `*.vercel.app` domains. `COOKIE_SAME_SITE` may be set to `lax` when the frontend and API are deployed on same-site custom domains and cookie behavior has been verified.

## Optional backend environment variables

| Variable(s) | Purpose |
| --- | --- |
| `GITHUB_USERNAME` | Enables the GitHub profile/repository API. |
| `GITHUB_TOKEN` | Optional server-only GitHub token to increase API rate limits. Never expose it as a `VITE_` variable. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `CONTACT_RECEIVER` | Optional contact-form email notifications. Submissions are still saved in MongoDB when email is not configured. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Required together to enable admin resume uploads to Cloudinary. |
| `COOKIE_SAME_SITE`, `COOKIE_DOMAIN` | Optional cookie policy overrides; keep production cookies secure and use a cookie domain only for a domain you control. |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | One-time admin creation inputs only. Run the setup command in a trusted environment, then remove both variables. Do not leave them configured in Vercel. |
| `PORT` | Local server port only; Vercel supplies the request runtime. |

## MongoDB Atlas

1. Create a production cluster and a dedicated database user. Grant that user only `readWrite` on the portfolio database; do not use an Atlas project owner account as the application user.
2. In Atlas, configure Network Access for the Vercel deployment. Prefer a supported static egress IP or private connection when available. Avoid `0.0.0.0/0`; if the selected hosting plan requires broader egress access, limit database-user privileges and use a unique strong password and TLS.
3. Copy the Atlas `mongodb+srv://` URI, select the production database name, and enter it as `MONGODB_URI` in Vercel. URL-encode special characters in the database username/password. Never commit the URI.
4. Deploy and verify `GET https://<backend-domain>/api/health` returns HTTP 200 with `"status":"ok"` and `"database":"connected"`.

The app reuses Mongoose's established connection in warm instances and shares concurrent connection attempts. A failed initial connection is not cached permanently; later requests can retry. Database-dependent API requests return HTTP 503 when MongoDB is unavailable.

## Frontend Vercel settings

Create a second Vercel project from the same repository:

| Setting | Value |
| --- | --- |
| Project name | Choose a unique portfolio frontend name. |
| Root Directory | `hariom-portfolio-fullstack/client` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

`client/vercel.json` sends SPA deep links such as `/admin/login` and `/admin/dashboard` to `index.html`. Keep this rewrite in place so refreshing a React Router route does not return Vercel's 404.

## Connect the frontend

Add these **frontend-project** environment variables for Production (and appropriate Preview/Development environments):

```text
VITE_API_URL=https://<backend-domain>
VITE_SITE_URL=https://<frontend-domain>
VITE_GITHUB_USERNAME=HARIOM45-67
```

Set `VITE_API_URL` to the backend origin only, without an `/api` suffix. The frontend already appends its existing `/api/...` paths and sends credentials for admin cookie authentication. `VITE_SITE_URL` must be the frontend origin without a trailing slash; Vite uses it for the canonical and Open Graph URLs. Update `client/public/robots.txt` and `client/public/sitemap.xml` to the final frontend domain before deployment. `VITE_GITHUB_USERNAME` is public profile configuration, not a secret.

Then set the frontend's exact origin in the backend's `CLIENT_ORIGIN`, redeploy the backend, and redeploy the frontend after setting its Vite variables. CORS and authentication-origin checks use exact origins; do not use `*`. Vercel preview domains should be added explicitly when needed rather than allowing every preview origin. The production API deliberately fails closed for browser requests if `CLIENT_ORIGIN` is absent or does not exactly match the frontend origin.

The two default `*.vercel.app` hostnames are cross-site for browser-cookie purposes. The backend sets secure `SameSite=None` cookies for that deployment arrangement, but browser third-party-cookie restrictions may still affect admin login. For reliable cross-browser admin cookies, use controlled custom domains on the same site (for example `portfolio.example.com` and `api.example.com`) and set `COOKIE_SAME_SITE=lax`, or proxy the API through the frontend's same-site origin. Verify cookie behavior in supported browsers before launch. Set `CLIENT_ORIGIN` to the exact frontend origin either way.

## Initial production admin

The local admin account is in the local MongoDB database and is **not** copied to Atlas automatically. Before provisioning against production, verify the Atlas database has no admin accounts using a read-only count. Then, from a trusted local machine, run the existing one-time `npm run create:admin` script with the production `MONGODB_URI`, `INITIAL_ADMIN_EMAIL`, and `INITIAL_ADMIN_PASSWORD` supplied only in that process's environment. The script refuses to create an account if any admin already exists and stores the password as a bcrypt hash. Never commit or leave the initial-admin variables configured in Vercel; remove them immediately after creation. Do not rerun creation if an account already exists.

## Production environment safety

- Keep `MONGODB_URI`, `JWT_SECRET`, SMTP credentials, Cloudinary credentials, and any GitHub token only in backend environment settings.
- Generate a new production `JWT_SECRET` with at least 32 cryptographically random bytes; do not reuse the local development secret.
- Keep secrets out of all `VITE_*` variables, frontend builds, Git, screenshots, and deployment logs. `VITE_*` values are shipped to browsers and are public.
- Use a separate production Atlas database. Never point production at the local development database or run test suites against production.
- Production CORS requires exact HTTPS origins. Never use `*`; add only known preview origins to their matching non-production environments.
- The project currently has no shared distributed rate-limit store; the in-memory limiter is per function instance and is not a global production abuse quota.

## Go-live checklist

- [ ] Choose the final frontend and backend domains. Configure DNS and HTTPS in Vercel.
- [ ] Create a dedicated MongoDB Atlas production cluster/database and least-privilege app user; configure the supported Vercel network path.
- [ ] Create the backend Vercel project with Root Directory `hariom-portfolio-fullstack/server`; deploy with backend-only environment variables.
- [ ] Create the frontend Vercel project with Root Directory `hariom-portfolio-fullstack/client`; deploy with `VITE_API_URL`, `VITE_SITE_URL`, and `VITE_GITHUB_USERNAME`.
- [ ] Set backend `CLIENT_ORIGIN` to the exact production frontend origin; redeploy the backend after environment changes.
- [ ] Update robots.txt and sitemap.xml to the final frontend domain; verify the generated canonical/Open Graph URL.
- [ ] Provision the production admin only after confirming the Atlas admin count is zero; clear one-time credentials immediately.
- [ ] Test live API health (`/api/health` must return HTTP 200 and `database: connected`), frontend root and deep links, CORS preflight, admin login/session/logout, protected dashboard routes, contact persistence, and project CRUD.
- [ ] Confirm the resume endpoint and download behavior. Configure Cloudinary before expecting admin resume uploads; verify any published resume before launch.
- [ ] Verify GitHub integration against the configured public username and review Vercel runtime logs for errors.
- [ ] Submit a real contact form only after confirming the production recipient and mail configuration; otherwise verify a controlled test submission and remove it.
- [ ] Confirm no environment secrets appear in Git, frontend assets, or logs. Record live URLs and smoke-test results before announcing deployment.

## Local development and checks

From the application directory (`hariom-portfolio-fullstack` inside the repository), copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`; set a local MongoDB URI and a private JWT secret. Then run the API and frontend in separate terminals:

```powershell
cd server
npm install
npm run dev
```

Use `npm start` instead of `npm run dev` for the non-watch local server.

```powershell
cd client
npm install
npm run dev
```

The local API listens on `http://localhost:5000`; check `http://localhost:5000/api/health`. For a production frontend build, configure `VITE_API_URL` to the deployed HTTPS backend origin before running `npm run build`. The API tests run with `cd server; npm test`.

## Current limitations

- Deployment is not performed or verified by these repository changes. Vercel project creation, final production domains, environment variables, Atlas network access, and live health checks must be completed in your accounts.
- SMTP notifications and Cloudinary resume uploads remain optional and need their respective credentials.
- The in-memory rate-limit store is local to each running function instance; it is not a shared global quota across serverless instances. Keep Vercel's platform protections enabled and consider a shared limiter store if abuse across many instances becomes a concern.
