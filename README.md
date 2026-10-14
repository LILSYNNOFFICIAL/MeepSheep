# MeepSheep

**Your creative world, a little more in sync.**

MeepSheep is a creator workspace concept for planning, tailoring, and managing content across social platforms. The first milestone focuses on the product interface and a local content-planning experience; platform publishing and analytics will be added through approved official APIs.

## Current prototype

- Premium, responsive creator dashboard with separate workspace navigation states
- Content planner with status filters and search
- Post composer with drafts persisted in browser local storage
- Dedicated workspace entry points for channels, settings guides, Studio, analytics, discovery, and hashtags
- Responsive mobile navigation, custom favicon, accessible focus states, and reduced-motion support
- GitHub Actions production-build check on pushes and pull requests

> Social account connections, real publishing, real analytics, AI recommendations, media upload, billing, and server-side persistent storage are not wired up yet. Sample posts are illustrative; no demo metrics are presented as real account data. Browser-stored drafts are local to the current browser and are not synced between devices.

## Stack

- Next.js App Router
- React and TypeScript
- Custom CSS design system
- Lucide icons

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

To create a production build:

```bash
npm run build
npm start
```

## Environment variables

No API keys are required for this UI prototype. When integrations are added, keep provider secrets on the server in your deployment platform's encrypted environment settings. Never put private API secrets in `NEXT_PUBLIC_*` variables or commit them to Git.

## Planned milestones

1. App shell and visual design system
2. Persistent database and authentication
3. OAuth connections and account management
4. Content library, media upload, and per-platform post variants
5. Official publishing APIs and scheduling queue
6. Trend research and creator analytics
7. Billing, plans, legal pages, and production hardening

## Brand direction

Modern creative software, clear typography, thoughtful whitespace, subtle translucency, polished dropdowns and buttons, and restrained indigo accents. No sci-fi or neon-heavy interface.
