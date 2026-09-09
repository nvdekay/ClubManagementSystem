#!/usr/bin/env bash
# Runs eslint for every workspace in parallel, prints colored per-workspace results.
cd "$(dirname "$0")/.."

# Discover workspaces from package.json — a new workspace is linted without editing this script.
workspaces=$(node -p "require('./package.json').workspaces.join(' ')")

pids=()
names=()
for ws in $workspaces; do
  npm run lint -w "$ws" --if-present & pids+=($!)
  names+=("$ws")
done

green='\033[1;32m'; red='\033[1;31m'; reset='\033[0m'
fail=0
echo
for i in "${!pids[@]}"; do
  if wait "${pids[$i]}"; then
    printf "${green}✓ %s lint passed${reset}\n" "${names[$i]}"
  else
    printf "${red}✗ %s lint failed${reset}\n" "${names[$i]}"
    fail=1
  fi
done
exit "$fail"
