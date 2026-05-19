# Mobile iOS CI/CD

The repo uses GitHub Actions for mobile validation and manual EAS builds.

Repo-level CI/CD process details live in `docs/CICD_PROCESS.md`.

Mobile-specific workflows:

- automatic validation in `.github/workflows/ci.yml`
- manual EAS iOS builds in `.github/workflows/mobile-ios.yml`

## Required GitHub Secret

Add this repository secret:

```text
EXPO_TOKEN
```

Create it from your Expo account settings. The token is used only by the manual EAS build job.

## Automatic Validation

The validation job runs on pull requests and pushes to `main`.

It runs:

```bash
npm ci
npm run typecheck
npm run doctor
npm audit --audit-level=moderate --registry=https://registry.npmjs.org
```

## Manual iOS Build

In GitHub Actions, run `Mobile iOS` manually and choose one profile:

- `preview`: internal test build using `Between Test`
- `production`: production build using `Between`

The workflow runs:

```bash
eas build --platform ios --profile preview --non-interactive --no-wait
```

or:

```bash
eas build --platform ios --profile production --non-interactive --no-wait
```

`--no-wait` keeps CI short. Build progress is tracked in the Expo dashboard.

## First EAS Build Notes

The first iOS build may ask the Expo account owner to configure Apple credentials. Keep that interaction in EAS/Expo rather than storing Apple credentials in GitHub at this stage.

## Production Submission

App Store submission is intentionally not automated yet. Add `eas submit` only after:

- bundle id is final
- App Store Connect app exists
- privacy copy and review notes are ready
- screenshot import consent flow is finalized
