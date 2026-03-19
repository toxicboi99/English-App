
## Stack

- Next.js 16 App Router for frontend and backend route handlers
- PostgreSQL with Prisma ORM
- JWT cookie authentication with `bcrypt` password hashing
- Tailwind CSS for responsive UI
- YouTube Data API v3 for unlisted video uploads
- Web Speech API for speaking practice
- Optional Ollama integration for free local grammar improvement

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

Copy `.env.example` to `.env` and configure at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `TOKEN_ENCRYPTION_SECRET`

Add these when you want the external integrations live:

- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_CLIENT_SECRET`
- `YOUTUBE_REDIRECT_URI`
- `YOUTUBE_REFRESH_TOKEN` or connect an account through the in-app OAuth flow
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`
- `NEXT_PUBLIC_ROOM_PROVIDER`
- `ROOM_PROVIDER_API_KEY`
- `ROOM_PROVIDER_API_SECRET`

## Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
ollama pull qwen3:4b
npm run dev
```

Then open `http://localhost:3000`.

## Database Notes

- Prisma schema: `prisma/schema.prisma`
- Initial SQL migration: `prisma/migrations/20260318000000_init/migration.sql`
- Seed data: `prisma/seed.ts`

The checked-in SQL migration was generated from the Prisma schema. You still need a real PostgreSQL database configured in `DATABASE_URL` to apply it with `prisma migrate dev` or `prisma migrate deploy`.



## Integration Notes

- YouTube uploads are implemented through OAuth2 and the YouTube Data API v3. Uploads are marked as `unlisted`.
- Debate rooms currently ship with browser-local camera/mic practice mode plus `/api/room/token` scaffolding. To make multi-user real-time media truly live in production, connect your managed room provider credentials and extend that token route.
- Ollama is the default free AI path. Start the local Ollama server and pull a model such as `qwen3:4b`. If Ollama is unavailable, SpeakUp falls back to lightweight local text cleanup.
- If your machine is resource-constrained, try a smaller Ollama model such as `llama3.2:1b` or `gemma3:1b`.
