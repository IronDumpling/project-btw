# Between Mobile iOS

Expo React Native iOS-first app for Between.

The app uses Supabase Auth for verified email login, a FastAPI backend for AI workflows, and Supabase Postgres for mobile profile/persona storage.

## What Is Included

- Expo React Native + TypeScript
- Expo Router navigation
- Supabase email/password auth with required email verification
- Bottom-tab app shell after login
- Onboarding, import, analysis, reply coach, contacts, and settings screens
- Typed mobile API client
- Test/prod environment examples
- EAS build profiles
- GitHub Actions validation and manual EAS build workflow

## Local Setup

```bash
cd mobile/ios
npm install
cp .env.example .env
npm run start
```

For iOS simulator:

```bash
npm run ios
```

If you only want to inspect the app in Expo tooling:

```bash
npm run start
```

Then press `i` for iOS when Xcode and an iOS simulator are available.

## Backend Setup

The app reads:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8765
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For local development, start the existing backend from the repo root:

```bash
cd backend
python3.12 -m venv .venv312
.venv312/bin/python -m pip install -r requirements.txt
PYTHONDONTWRITEBYTECODE=1 .venv312/bin/python main.py
```

Provider API keys stay in the backend `.env`. Do not put OpenAI, Anthropic, Groq, or other LLM provider secrets in Expo `EXPO_PUBLIC_*` variables.

Supabase setup:

- Run `supabase/migrations/202605140001_mobile_profiles.sql`.
- Enable Supabase Auth email confirmations.
- Add `between-dev://auth/callback`, `between-test://auth/callback`, and `between://auth/callback` to Supabase Auth redirect URLs.

## Useful Commands

```bash
npm run typecheck
npm run doctor
npm run validate
npm run start
npm run ios
```

## Implementation Notes

- `src/lib/supabase.ts` owns Supabase client setup and deep-link redirect configuration.
- `src/api/client.ts` sends the Supabase access token to the FastAPI backend.
- `src/api/types.ts` defines the shared mobile data contracts.
- Screenshot import uses `expo-image-picker`.
