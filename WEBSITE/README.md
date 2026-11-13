# MeepSheep company website

A dependency-free, responsive static company site for MeepSheep.

## Local preview

From this directory:

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## Cloudflare Pages

The connected Cloudflare account currently has no Pages projects. The `meepsheep.com` zone is active and already has proxied apex and `www` A/AAAA records. Do not replace those records until their current origin and the intended cutover are confirmed.

Recommended first Pages configuration after repository review:

- Repository: `LILSYNNOFFICIAL/MeepSheep`
- Production branch: `main`
- Root directory: repository root
- Build command: none
- Build output directory: `WEBSITE`

This site is plain HTML, CSS, and JavaScript, so it has no package install or build step. Configure Pages only after confirming the GitHub integration and current DNS origin. Keep the existing `meepsheep` and `synear` Workers intact.

## Content accuracy

The shared account section describes the accepted architecture direction. It does not claim that cross-product account provisioning is already live. Product services remain independent.
