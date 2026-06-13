#!/bin/sh
set -e
if [ "$RUN_DB_INIT" = "true" ]; then
  npx tsx scripts/init.ts
fi
exec "$@"
