# SpeakUp Mobile

React Native client for SpeakUp, built with Expo and connected to the same live Next.js + PostgreSQL backend.

## What It Includes

- Splash/loading experience using the SpeakUp logo
- Mobile side menu button with app sections
- Real authentication against `/api/mobile/auth/*`
- Live dashboard, feed, friends, dictionary, and room data
- No demo cards or hardcoded placeholder datasets

## Run It

1. Start the web/backend app from the repo root:

```bash
npm run dev
```

2. Inside `mobile`, install packages:

```bash
npm install
```

3. Set the backend origin in `.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
```

Use your local LAN IP instead of `10.0.2.2` when testing on a physical device, for example `http://192.168.1.20:3000`.

4. Start Expo:

```bash
npm run start
```

## API Notes

The mobile app talks to the new token-based routes under `/api/mobile`.

- `POST /api/mobile/auth/register`
- `POST /api/mobile/auth/login`
- `GET /api/mobile/auth/me`
- `GET /api/mobile/dashboard`
- `GET /api/mobile/feed`
- `GET /api/mobile/friends`
- `GET /api/mobile/dictionary`
- `GET /api/mobile/rooms`
