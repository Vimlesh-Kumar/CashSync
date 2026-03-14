#!/usr/bin/env bash
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required. Install from https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Please login first: gh auth login" >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Run this script from inside your git repository." >&2
  exit 1
fi

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

read -rp "Enable Sonar workflow? (true/false) [true]: " SONAR_ENABLED
SONAR_ENABLED="${SONAR_ENABLED:-true}"

read -rp "SONAR_HOST_URL [http://localhost:9000]: " SONAR_HOST_URL
SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}"

read -rp "SONAR_PROJECT_KEY [cashsync-local]: " SONAR_PROJECT_KEY
SONAR_PROJECT_KEY="${SONAR_PROJECT_KEY:-cashsync-local}"

read -rp "SONAR_ORGANIZATION (leave empty for self-hosted SonarQube): " SONAR_ORGANIZATION

read -rsp "SONAR_TOKEN: " SONAR_TOKEN
echo
if [[ -z "${SONAR_TOKEN}" ]]; then
  echo "SONAR_TOKEN cannot be empty." >&2
  exit 1
fi

echo "Configuring GitHub Actions variables/secrets on ${REPO}..."

gh variable set SONAR_ENABLED --repo "${REPO}" --body "${SONAR_ENABLED}"
gh variable set SONAR_HOST_URL --repo "${REPO}" --body "${SONAR_HOST_URL}"
gh variable set SONAR_PROJECT_KEY --repo "${REPO}" --body "${SONAR_PROJECT_KEY}"
gh variable set SONAR_ORGANIZATION --repo "${REPO}" --body "${SONAR_ORGANIZATION}"
gh secret set SONAR_TOKEN --repo "${REPO}" --body "${SONAR_TOKEN}"

echo "Done."
echo "Tip: if SONAR_HOST_URL points to localhost, GitHub runners cannot reach it. Use a public/self-hosted reachable URL for CI scans."
