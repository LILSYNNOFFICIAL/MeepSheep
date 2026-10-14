# MeepSheep

**Your creative world, a little more in sync.**

MeepSheep is a creator workspace concept for planning, tailoring, and managing content across social platforms. The first milestone focuses on the product interface and a local content-planning experience; platform publishing and analytics will be added through approved official APIs.

## Current prototype

- Premium, responsive creator dashboard
- Workspace and navigation interactions
- Content planner with status filters and search
- Post composer that saves local draft state
- Platform connection entry points
- Responsive mobile navigation
- Accessible focus states and reduced-motion support

> Social account connections, real publishing, analytics, AI suggestions, billing, and persistent storage are not wired up yet. The prototype uses sample data and local in-memory state. Do not treat the sample metrics or platform statuses as real account data.

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
