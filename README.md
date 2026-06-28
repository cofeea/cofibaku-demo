# CofiBakuPromo — AI Analytics Demo for Baku Coffee Shops

A sales demo dashboard showing AI-powered analytics for coffee shop chains.
Built on Next.js 14 with Google OAuth, per-user isolation, and pre-loaded sample data.

## Features

- **Pre-loaded sample data** — Opens instantly with 3 Baku coffee shop branches (Kapi Coffee)
- **All analytics tabs** — Pulse, Growth, Cards, Deep, Playbook, Simulator, AI Coach
- **Google OAuth** — Each client gets their own isolated dashboard space
- **Import your own data** — Upload iiko P&L + bank POS files; results in ~2 minutes
- **Context Intelligence** — Working-day modeling, F1/events forecast, live weather
- **Trilingual** — AZ / RU / EN

## Setup

### 1. Environment Variables

Create `.env.local`:

```
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret-here           # openssl rand -base64 32

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

OPENAI_API_KEY=sk-...

UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google+ API" or "People API"
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized redirect URIs: `https://your-domain.vercel.app/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env.local`

### 3. Deploy to Vercel

```bash
npm install
vercel --prod
```

Add all environment variables in Vercel dashboard under **Settings → Environment Variables**.

## Sample Data

On first login, the dashboard auto-populates with fictional "Kapi Coffee" data:
- **İçərişəhər** — Tourist area, excellent performance (score 88)
- **Nizami** — City centre, improving (score 72)
- **Binəqədi** — Residential, needs attention (score 41) ← story branch

The Binəqədi branch tells a compelling story: high labour costs + low avg ticket.
The Playbook tab shows exactly how to fix it (+₼8,100 net profit potential).

## Tech Stack

- Next.js 14 (App Router)
- NextAuth.js (Google OAuth)
- OpenAI GPT-4o (data processing + AI coach)
- Upstash Redis (per-user storage, gzip compressed)
- Recharts (charts)
- SheetJS / xlsx (file parsing)
- pako (gzip)
