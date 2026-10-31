# Backend deployment on Vercel

The backend is the existing Express application in this directory. [Vercel's Express framework support](https://vercel.com/docs/frameworks/backend/express) discovers the default-exported app in `src/app.js`. The local-only `src/index.js` continues to start the HTTP server through the existing npm scripts. No second server entry point or catch-all rewrite is needed.

## Vercel project settings

Create a separate Vercel project from the portfolio repository:

| Setting | Value |
| --- | --- |
| Project name | `hariom-portfolio-backend` |
| Root Directory | `server` |
| Framework Preset | Express (or let Vercel detect Express) |
| Build Command | Leave the detected/default command; no compile step is required |
| Output Directory | Leave empty/default |
| Install Command | `npm install` (or Vercel's detected npm install) |

The Express application serves its existing `/api/...` routes directly. Do not add a rewrite that changes those paths. The current structure uses Vercel's zero-configuration Express support, so a separate `vercel.json` is not required.

Configure production variables in the backend project's **Settings → Environment Variables**. Add them to Production, and to Preview/Development only when those environments have their own valid database, origins, and credentials. Do not put backend secrets in the frontend project.

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

1. Create a production database and a dedicated database user with only the permissions the app needs.
2. In Atlas, configure Network Access for the Vercel deployment. Prefer a supported static egress IP or private connection when available. If your Vercel plan has dynamic egress and Atlas requires a broad IP rule, understand the exposure and protect access with a strong database user password and TLS; do not use an unrestricted database user.
3. Copy the Atlas `mongodb+srv://` URI, select the production database name, and enter it as `MONGODB_URI` in Vercel. URL-encode special characters in the database username/password. Never commit the URI.
4. Deploy and verify `GET https://<backend-domain>/api/health` returns HTTP 200 with `"status":"ok"` and `"database":"connected"`.

The app reuses Mongoose's established connection in warm instances and shares concurrent connection attempts. A failed initial connection is not cached permanently; later requests can retry. Database-dependent API requests return HTTP 503 when MongoDB is unavailable.

## Connect the frontend

Deploy the Vercel frontend as a separate project with Root Directory `client`. Add this **frontend-project** environment variable for Production (and the appropriate Preview/Development environments):

```text
VITE_API_URL=https://<backend-domain>
```

Set `VITE_API_URL` to the backend origin only, without an `/api` suffix. The frontend already appends its existing `/api/...` paths and sends credentials for admin cookie authentication. Also set `VITE_GITHUB_USERNAME` and, if the deployed site URL differs from the checked-in value, `VITE_SITE_URL`.

Then set the frontend's exact origin in the backend's `CLIENT_ORIGIN`, redeploy the backend, and redeploy the frontend after setting its Vite variables. CORS and authentication-origin checks use exact origins; do not use `*`. Vercel preview domains should be added explicitly when needed rather than allowing every preview origin.

The two default `*.vercel.app` hostnames are cross-site for browser-cookie purposes. The backend sets secure `SameSite=None` cookies for that deployment arrangement, but browser third-party-cookie restrictions may still affect admin login. For reliable cross-browser admin cookies, use controlled custom domains on the same site (for example `portfolio.example.com` and `api.example.com`) or proxy the API through the frontend's same-site origin, then configure `CLIENT_ORIGIN` and cookie settings accordingly.

## Local development and checks

From the repository root, copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`; set a local MongoDB URI and a private JWT secret. Then run the API and frontend in separate terminals:

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

- Deployment is not performed or verified by these repository changes. Vercel project creation, environment variables, Atlas network access, and the live health check must be completed in your accounts.
- SMTP notifications and Cloudinary resume uploads remain optional and need their respective credentials.
- The in-memory rate-limit store is local to each running function instance; it is not a shared global quota across serverless instances. Keep Vercel's platform protections enabled and consider a shared limiter store if abuse across many instances becomes a concern.
