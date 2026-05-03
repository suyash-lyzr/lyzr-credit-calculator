#!/bin/bash
set -e

if [ -f package-lock.json ]; then
  npm install --no-audit --no-fund
fi

if [ -f lyzr-boilerplate/package-lock.json ]; then
  (cd lyzr-boilerplate && npm install --no-audit --no-fund)
fi
