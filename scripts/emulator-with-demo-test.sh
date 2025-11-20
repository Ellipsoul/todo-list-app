#!/bin/bash
# Script to run Firebase emulator with demo-test project ID
# This ensures the emulator uses "demo-test" regardless of .firebaserc

# Backup current .firebaserc if it exists
if [ -f .firebaserc ]; then
  cp .firebaserc .firebaserc.backup
fi

# Create temporary .firebaserc with demo-test
cat > .firebaserc << EOF
{
  "projects": {
    "default": "demo-test"
  }
}
EOF

# Run the command passed as arguments
"$@"
EXIT_CODE=$?

# Restore original .firebaserc if backup exists
if [ -f .firebaserc.backup ]; then
  mv .firebaserc.backup .firebaserc
fi

exit $EXIT_CODE

