# MeepSheep company website

A dependency-free, responsive static company site for MeepSheep.

## Local preview

From this directory:

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## Current Cloudflare Pages deployment

- Project: meepsheep-company-site
- Repository: LILSYNNOFFICIAL/MeepSheep
- Production branch: main
- Build command: none
- Build output directory: WEBSITE
- Production URL: https://meepsheep-company-site.pages.dev
- Custom domain: not attached

The deployment API reported a successful production deployment, and the live homepage, stylesheet, and JavaScript were fetched successfully.

## Custom-domain cutover

The meepsheep.com Cloudflare zone already contains proxied apex and www A/AAAA records pointing to an existing origin. Do not replace those records or attach the custom domain until the current origin is identified, the existing site is reviewed, and a cutover/rollback plan is agreed.

The existing meepsheep and synear Workers are separate services and must remain untouched by the website deployment.
