# Code Quality: ESLint + Sonar

This repository uses ESLint for linting and Sonar for static analysis in CI.

## 1. ESLint Setup

### Scope
- Backend: `backend/src/**/*.{ts,js}` via `backend/eslint.config.js`
- Frontend: Expo lint setup via `frontend/eslint.config.js`

### Commands
From repository root:

```bash
npm run lint:check
```

Run autofix for backend + frontend lint pass:

```bash
npm run lint
```

Run per package:

```bash
npm run lint:backend
npm run lint:frontend
```

## 2. Sonar Setup

### Config File
- `sonar-project.properties`

### CI Integration
- Workflow: `.github/workflows/code-quality.yml`
- Jobs:
  - `lint`: installs dependencies and runs `npm run lint:check`
  - `sonar`: runs Sonar scan and quality gate (only when `SONAR_TOKEN` is configured)

### Required GitHub Variables/Secrets
- Secret: `SONAR_TOKEN`
- Variable: `SONAR_PROJECT_KEY`
- Variable: `SONAR_ORGANIZATION` (for SonarCloud)
- Variable: `SONAR_HOST_URL`
  - SonarCloud: `https://sonarcloud.io`
  - Self-hosted SonarQube: your server URL

## 3. Troubleshooting

### `eslint: command not found`
Install dependencies first:

```bash
npm ci
npm --prefix backend ci
npm --prefix frontend ci
```

### Sonar job skipped in CI
The workflow intentionally skips the Sonar job if `SONAR_TOKEN` is missing.

### Sonar scan fails with key/organization errors
Verify:
- `SONAR_PROJECT_KEY` is correct
- `SONAR_ORGANIZATION` matches your SonarCloud org
- `SONAR_HOST_URL` matches your Sonar instance

### Quality gate fails
Open the Sonar report from the CI logs and fix issues by category (bugs, vulnerabilities, code smells), then re-run CI.
