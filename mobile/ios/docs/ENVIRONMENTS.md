# Mobile Environment Setup

Expo exposes only variables prefixed with `EXPO_PUBLIC_` to the JavaScript bundle. Treat every `EXPO_PUBLIC_*` value as public.

Do not store provider API keys, database service-role keys, or private credentials in the mobile app. LLM provider keys belong in the FastAPI backend environment.

## Local Development

Create `mobile/ios/.env`:

```bash
cp mobile/ios/.env.example mobile/ios/.env
```

Recommended values:

```env
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8765
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use `http://127.0.0.1:8765` for simulator-based testing when the backend runs on the same Mac.

## Test Environment

Create `mobile/ios/.env.test` from the example:

```env
EXPO_PUBLIC_APP_ENV=test
EXPO_PUBLIC_API_BASE_URL=https://api-test.between.app
EXPO_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_test_supabase_anon_key
```

For EAS preview builds, configure public app variables in the Expo/EAS project:

```bash
cd mobile/ios
npx eas env:create --environment preview --name EXPO_PUBLIC_APP_ENV --value test
npx eas env:create --environment preview --name EXPO_PUBLIC_API_BASE_URL --value https://api-test.between.app
npx eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://your-test-project.supabase.co
npx eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your_test_supabase_anon_key
```

The preview iOS bundle id is:

```text
com.between.relationship.test
```

The preview app name is:

```text
Between Test
```

## Production Environment

Create `mobile/ios/.env.production` from the example:

```env
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_API_BASE_URL=https://api.between.app
EXPO_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_prod_supabase_anon_key
```

For EAS production builds:

```bash
cd mobile/ios
npx eas env:create --environment production --name EXPO_PUBLIC_APP_ENV --value production
npx eas env:create --environment production --name EXPO_PUBLIC_API_BASE_URL --value https://api.between.app
npx eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://your-prod-project.supabase.co
npx eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your_prod_supabase_anon_key
```

The production iOS bundle id is:

```text
com.between.relationship
```

The production app name is:

```text
Between
```

## Backend Environment

Backend secrets remain in the backend deployment environment:

```env
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GROQ_API_KEY=...
LEARNING_MODELS=...
REASONING_MODELS=...
PERCEPTION_MODELS=...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

The mobile app should never send model provider keys directly.
Supabase handles mobile login and email verification. The backend validates Supabase access tokens and stores profile/persona data in `public.mobile_profiles`.

## Supabase Setup

Run `supabase/migrations/202605140001_mobile_profiles.sql` in the Supabase SQL editor or with the Supabase CLI.

In Supabase Auth settings:

- Enable email confirmations.
- Add redirect URLs for local, test, and production:
  - `between-dev://auth/callback`
  - `between-test://auth/callback`
  - `between://auth/callback`
- Keep the anon key public only; never use the service-role key in the mobile app.
