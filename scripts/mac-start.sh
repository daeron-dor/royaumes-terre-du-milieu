#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(uname -s)" != Darwin ]; then
  echo "Ce lanceur est destiné au Mac." >&2
  exit 1
fi
export JAVA_HOME="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
export PATH="$(brew --prefix node@22)/bin:$JAVA_HOME/bin:$PATH"
exec node scripts/start-host.mjs "$@"
