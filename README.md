
## Stack

- Next.js 16 App Router for frontend and backend route handlers
- PostgreSQL with Prisma ORM
- JWT cookie authentication with `bcrypt` password hashing
- Tailwind CSS for responsive UI
- YouTube Data API v3 for unlisted video uploads
- Web Speech API for speaking practice
- Optional Groq API integration for grammar improvement

## Main Modules

- Authentication with protected routes via `proxy.ts`
- Dashboard with six core learning modules
- Video recording studio using `MediaRecorder`
- Social feed with post creation, likes, and comments
- Friend requests and social graph utilities
- Debate room management with browser-local media controls and provider token API scaffolding
- Dictionary search and personal saved vocabulary
- Speaking practice with transcript comparison and scoring

## Environment Setup

Configure `.env` with at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `TOKEN_ENCRYPTION_SECRET`

Add these when you want the external integrations live:

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI`
- `YOUTUBE_REFRESH_TOKEN` or connect an account through the in-app OAuth flow
- `GROQ_API_KEY`
- `GROQ_MODEL`
- `NEXT_PUBLIC_ROOM_PROVIDER`
- `ROOM_PROVIDER_API_KEY`
- `ROOM_PROVIDER_API_SECRET`

## Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

Then open `http://localhost:3000`.

## Mobile App

This repository now includes a React Native client in [`mobile`](./mobile) built with Expo.

- Uses the SpeakUp logo for splash/loading
- Opens into a mobile side-menu layout
- Connects to live backend routes under `/api/mobile`
- Uses real login/register tokens instead of demo data

Basic mobile flow:

```bash
cd mobile
npm install
npm run start
```

Set `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env` to your backend origin, for example:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

Use your LAN IP instead of `10.0.2.2` when testing on a physical phone.

## Database Notes

- Prisma schema: `prisma/schema.prisma`
- Initial SQL migration: `prisma/migrations/20260318000000_init/migration.sql`
- Seed data: `prisma/seed.ts`

The checked-in SQL migration was generated from the Prisma schema. You still need a real PostgreSQL database configured in `DATABASE_URL` to apply it with `prisma migrate dev` or `prisma migrate deploy`.



## Integration Notes

- YouTube uploads are implemented through OAuth2 and the YouTube Data API v3. Uploads are marked as `unlisted`.
- Debate rooms currently ship with browser-local camera/mic practice mode plus `/api/room/token` scaffolding. To make multi-user real-time media truly live in production, connect your managed room provider credentials and extend that token route.
- Groq powers the grammar helper through its hosted API. Add `GROQ_API_KEY` to `.env`, and optionally override `GROQ_MODEL` if you want a different Groq-supported model.
- If Groq is unavailable or not configured yet, SpeakUp falls back to lightweight local text cleanup.
