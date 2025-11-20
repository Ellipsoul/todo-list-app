#!/bin/bash

# Script to run a specific Cypress test file with Firebase emulator
# Usage: ./scripts/run-cypress-spec.sh cypress/e2e/settings/settings.spec.ts

if [ -z "$1" ]; then
  echo "Error: Please provide a spec file path"
  echo "Usage: npm run cy:run:emulator:spec -- cypress/e2e/path/to/test.spec.ts"
  exit 1
fi

SPEC_PATH="$1"

firebase emulators:exec -- "NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true USE_FIREBASE_EMULATOR=true start-server-and-test dev:emulator:ci http://localhost:3000 'cypress run --spec ${SPEC_PATH}'"

