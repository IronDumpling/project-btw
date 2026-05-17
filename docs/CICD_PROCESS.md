# CI/CD Process Design

This repository uses GitHub Actions for validation and manual deployment. The process is intentionally lightweight: pull requests prove that backend and mobile code compile, while environment deployments remain explicit manual actions.

## Branch And PR Flow

- Work happens on feature branches pushed to a fork.
- Pull requests target `IronDumpling/between-relationship-ai-agent:main`.
- PR validation is required before merge.
- Deployment is not automatic from PR branches.

Recommended branch naming:

```bash
feature/<short-description>
```

## Pull Request CI

Workflow: `.github/workflows/ci.yml`

CI runs on all pull requests and on pushes to `main`.

Backend validation:

```bash
cd backend
python -m pip install -r requirements.txt
python -m py_compile main.py config.py utils.py routers/*.py
python -c "from main import app; print(app.title)"
```

Mobile iOS validation:

```bash
cd mobile/ios
npm ci
npm run typecheck
npm run doctor
npm audit --audit-level=moderate --registry=https://registry.npmjs.org
```

CI does not require real LLM provider keys, Supabase credentials, Apple credentials, or EAS credentials.

## Backend Deployment

Workflow: `.github/workflows/backend-deploy.yml`

Backend deployment is manual through `workflow_dispatch`.

Supported environments:

- `test`
- `production`

The workflow validates the backend first, then triggers the selected environment's deploy hook.

Required GitHub repository secrets:

```text
BACKEND_TEST_DEPLOY_HOOK_URL
BACKEND_PROD_DEPLOY_HOOK_URL
```

Use GitHub Environments:

- `test`: no approval required, or lightweight maintainer approval.
- `production`: require reviewer approval before deploy.

This works with Render/Railway-style services that provide an HTTPS deploy hook. The hook should point at a backend service configured to deploy from the repository or a connected branch.

The backend service command is:

```bash
python backend/main.py
```

Backend environment variables must live in the hosting platform, not in git:

```text
ANTHROPIC_API_KEY
OPENAI_API_KEY
GROQ_API_KEY
DEEPSEEK_API_KEY
SUPABASE_URL
SUPABASE_ANON_KEY
PERCEPTION_MODELS
REASONING_MODELS
LEARNING_MODELS
BACKEND_HOST
BACKEND_PORT
```

For hosted deployment, use:

```text
BACKEND_HOST=0.0.0.0
```

Set `BACKEND_PORT` to the platform-provided port only if the platform requires an explicit value.

## Mobile iOS Build

Workflow: `.github/workflows/mobile-ios.yml`

Mobile iOS builds are manual through `workflow_dispatch`.

Supported EAS profiles:

- `preview`: internal test build using the test environment.
- `production`: production build using the production environment.

Required GitHub repository secret:

```text
EXPO_TOKEN
```

The workflow runs:

```bash
cd mobile/ios
npm ci
eas build --platform ios --profile preview --non-interactive --no-wait
```

or:

```bash
cd mobile/ios
npm ci
eas build --platform ios --profile production --non-interactive --no-wait
```

`--no-wait` keeps GitHub Actions short. Build status is tracked in the Expo dashboard.

Mobile public environment variables belong in EAS environment config:

```text
EXPO_PUBLIC_APP_ENV
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

These values are public in the app bundle. Never place LLM provider keys, Supabase service-role keys, database passwords, Apple credentials, or private deploy secrets in `EXPO_PUBLIC_*`.

## Environment Promotion

Recommended release path:

1. Open PR from feature branch.
2. Wait for CI to pass.
3. Merge to `main`.
4. Manually deploy backend to `test`.
5. Manually run EAS `preview` build.
6. Smoke-test login, onboarding, import analysis, reply generation, and memory approval.
7. Manually deploy backend to `production` with GitHub Environment approval.
8. Manually run EAS `production` build.

## Rollback

Backend rollback:

- Use the hosting platform rollback if available.
- Otherwise revert the merge commit and run the backend deploy workflow again.

Mobile rollback:

- Use App Store Connect/TestFlight release controls.
- For internal preview builds, create a new EAS build from the last known good commit.

## Secret Hygiene

Before committing or opening PRs, check for accidental credentials:

```bash
git diff --cached -G "sk-|sb_publishable_|postgresql://|EXPO_TOKEN"
```

Do not commit:

- `.env` files
- local SQLite databases
- API keys
- Supabase service-role keys
- Postgres connection strings with passwords
- EAS tokens
- Apple certificates, provisioning profiles, or `.p8` keys
