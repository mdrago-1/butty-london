# Butty & Co.

Sandwich & juice bar shop for **Butty & Co.**, 19 Replingham Road, Southfields, SW18 5LT.

Live site: [https://www.butty.london](https://www.butty.london)

## What it is

- Customer menu, click-and-collect, Butty Club (buy 9 sandwiches, 10th free)
- Kitchen display: `/kitchen`
- Back office (menu, loyalty, shop flags): `/office`
- Currently **Opening soon** (renovations) — toggle off from back office → Shop

Stack: TanStack Start, React 19, Tailwind v4, Neon Postgres in production, PGLite in local preview.

## Run locally

```bash
npm ci
npm run dev
```

App listens on port 8080.

## Grok Bot

Clone this repo onto the bot machine and work from the project root:

```bash
git clone https://github.com/mdrago-1/butty-london.git
cd butty-london
npm ci
```

Do not commit `.env` files or production secrets. Staff passwords and `DATABASE_URL` live in Vercel env, not in this repo.
