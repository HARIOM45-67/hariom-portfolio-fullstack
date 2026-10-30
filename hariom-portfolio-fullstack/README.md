# Hariom Tiwari — Full-stack Developer Portfolio

A recruiter-focused portfolio starter built with React + Vite, Node.js + Express, and MongoDB.

## Features
- React single-page portfolio with responsive styling
- GitHub profile and public repository integration (GitHub REST API)
- Resume download from `client/public/resume.pdf`
- Contact form with server-side validation and MongoDB persistence
- Optional email notifications through SMTP environment variables
- Project cards with live demo and source-code links
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

Place your PDF at:

`client/public/resume.pdf`

The Resume button downloads that file. Use a current, recruiter-ready PDF.

## Profile data

Edit `client/src/data/profile.js` to update the About, Experience, and Education sections. Internship position, responsibilities, projects, and dates are optional fields; add them only when verified.

## 4. Personalize your projects

Edit `client/src/data/projects.js`. Replace the sample project details with your actual project names, descriptions, technologies, repository URLs and deployed demo URLs. Do not claim a demo is live until it is deployed and tested.

## 5. MongoDB

Create a free MongoDB Atlas cluster or run MongoDB locally. Put its connection string in `server/.env` as `MONGODB_URI`.

The contact form stores submissions in the `contacts` collection. Do not commit `.env` files.

## 6. Deploy

- Frontend: Vercel or Netlify; set `VITE_API_URL` and `VITE_GITHUB_USERNAME`.
- Backend: Render, Railway, or another Node host; set `MONGODB_URI`, `CLIENT_ORIGIN`, and optional SMTP variables.
- Database: MongoDB Atlas.
- Add your deployed frontend URL to `CLIENT_ORIGIN` and update the sitemap URL in `client/public/sitemap.xml`.

## Before publishing
1. Replace the placeholder email, GitHub username and LinkedIn URL.
2. Replace sample projects with real work and verified live demo links.
3. Add your actual resume PDF.
4. Configure MongoDB and test a contact submission.
5. Update title, description, canonical URL and sitemap domain to your deployed domain.
