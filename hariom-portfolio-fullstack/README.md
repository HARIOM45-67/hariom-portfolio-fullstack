# Hariom Tiwari — Full-stack Developer Portfolio

A recruiter-focused portfolio starter built with React + Vite, Node.js + Express, and MongoDB.

## Features
- React single-page portfolio with responsive styling
- GitHub profile, public repositories and language overview (GitHub REST API)
- Persisted MongoDB fallback for GitHub profile and repositories when the GitHub API is temporarily unavailable
- Downloadable default CV at `client/public/resume.pdf`, with optional resume updates managed from the admin dashboard
- Contact form with server-side validation and MongoDB persistence
- Optional email notifications through SMTP environment variables
- Project cards with screenshots, problem summaries, live demos and source links
- Accessible dark/light themes, responsive navigation and reduced-motion support
- Optional anonymous analytics; only visitors who opt in are counted, and IP addresses are never stored
- Basic SEO metadata, Open Graph tags, robots.txt and sitemap.xml

## Requirements
- Node.js 20+
- MongoDB local instance or MongoDB Atlas connection string
- GitHub username (set in the client environment)

## 1. Configure environment variables

Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and `CLIENT_ORIGIN`.

Copy `client/.env.example` to `client/.env` and set `VITE_GITHUB_USERNAME`.

The GitHub integration uses public endpoints and does not need a token for a normal public profile. If you later add private repository access, keep any token on the server only.

## 2. Install dependencies

Open two terminals:

```bash
cd server
npm install
npm run dev
```

```bash
cd client
npm install
npm run dev
```

Client: http://localhost:5173  
API health check: http://localhost:5000/api/health

## 3. Add your resume

The selected CV is served from:

`client/public/resume.pdf`

The Resume button downloads that file. Use a current, recruiter-ready PDF.

## Profile data

Edit `client/src/data/profile.js` to update the About, Experience, and Education sections. Internship position, responsibilities, projects, and dates are optional fields; add them only when verified. The portfolio intentionally leaves unverified certifications, coding-profile links, articles and testimonials unpublished.

## 4. Personalize your projects

Sign in to `/admin/projects` to publish projects, screenshots, problem summaries, technologies, source repositories and live demos. Only publish demo links after they have been deployed and tested.

## 5. MongoDB

Create a free MongoDB Atlas cluster or run MongoDB locally. Put its connection string in `server/.env` as `MONGODB_URI`.

The contact form stores submissions in the `contacts` collection. Do not commit `.env` files.

Opted-in analytics are stored in the `portfolio_views` collection. The database stores a random browser ID, section names or project slugs, and a UTC date—not IP addresses or user-agent strings. Visitors can change their choice from the site's Analytics section or footer.

The admin dashboard displays 30-day unique visitors, section views, popular sections and popular projects, along with resume and contact-form totals.

## 6. Deploy

- Deploy the backend as its own Vercel project using the `server` root directory. Follow [server/DEPLOYMENT.md](./server/DEPLOYMENT.md) for the Vercel settings, MongoDB Atlas setup, and required environment variables.
- Deploy the frontend as a separate Vercel project using the `client` root directory. Set `VITE_API_URL` to the deployed backend origin and set `VITE_GITHUB_USERNAME`.
- Set the frontend's exact deployed origin in the backend's `CLIENT_ORIGIN`. Keep backend secrets only in the backend's Vercel environment.
- Update the sitemap URL in `client/public/sitemap.xml` after choosing the production frontend domain.

## Before publishing
1. Replace the placeholder email, GitHub username and LinkedIn URL.
2. Replace sample projects with real work and verified live demo links.
3. Add your actual resume PDF.
4. Configure MongoDB and test a contact submission.
5. Update title, description, canonical URL and sitemap domain to your deployed domain.
