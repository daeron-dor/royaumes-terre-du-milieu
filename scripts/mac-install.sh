#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(uname -s)" != Darwin ]; then
  echo "Ce script est destiné au Mac. Aucun changement effectué." >&2
  exit 1
fi
if ! command -v brew >/dev/null 2>&1; then
  echo "Installer Homebrew depuis https://brew.sh puis relancer ce script." >&2
  exit 1
fi
brew install openjdk@21 node@22
export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
export PATH="$(brew --prefix node@22)/bin:$JAVA_HOME/bin:$PATH"
(cd backend && bash mvnw verify)
(cd frontend && npm ci && npm test && npm run typecheck && npm run build)
echo "Installation et tests terminés. Lire INSTALLATION-MAC.md pour importer la campagne et démarrer."
