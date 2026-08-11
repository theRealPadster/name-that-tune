#!/usr/bin/env bash
# Verify the `dist` branch — what users actually install — matches current main.
#
# Do NOT judge this by dist's head commit. push-dist.yml only commits when the
# built output changes, so a release whose only commit is the version bump
# leaves dist's head pointing at an older SHA while its *content* is correct.
#
# Rebuilds locally with the same command CI runs and diffs against the branch.
set -uo pipefail

cd "$(git rev-parse --show-toplevel)" || exit 1
git fetch -q origin 2>/dev/null

STATUS=0

echo "=== push-dist run for current main ==="
HEAD_SHA=$(git rev-parse origin/main)
gh run list --workflow=push-dist.yml --branch main --limit 5 \
  --json headSha,conclusion,displayTitle,url \
  --jq ".[] | select(.headSha == \"$HEAD_SHA\") | \"\(.conclusion)\t\(.displayTitle)\n\(.url)\"" \
  | head -3
RUN_OK=$(gh run list --workflow=push-dist.yml --branch main --limit 5 \
         --json headSha,conclusion --jq \
         "[.[] | select(.headSha == \"$HEAD_SHA\")] | first | .conclusion")
if [ "$RUN_OK" != "success" ]; then
  echo "!! no successful push-dist run for $(git rev-parse --short origin/main) (got: ${RUN_OK:-none})"
  echo "!! dist may be stale. Do not tag until this is sorted."
  STATUS=1
fi
echo

echo "=== rebuilding locally with CI's command (pnpm build:prod) ==="
# dist/ is gitignored build output, safe to clear. Stop `pnpm watch` first.
rm -rf dist
if ! pnpm build:prod >/dev/null 2>&1; then
  echo "!! build:prod failed — run it directly to see why"
  exit 1
fi

REF=$(mktemp -d)
trap 'rm -rf "$REF"' EXIT
git archive origin/dist | tar -x -C "$REF"

echo "=== local build vs origin/dist ==="
# preview.png is a stale artifact: it sits at the root of the dist branch but is
# no longer generated. The workflow builds into a checkout of the branch without
# cleaning, so it never gets removed. Expected — anything else is not.
DIFF=$(diff -rq dist "$REF" 2>&1 | grep -v 'preview\.png$')

if [ -z "$DIFF" ]; then
  echo "identical (ignoring the known stale preview.png)"
  echo
  echo "dist is current with main. Safe to tag."
else
  echo "$DIFF"
  echo
  echo "!! dist does not match a local build of main."
  echo "!! Check the push-dist run above before tagging."
  STATUS=1
fi

exit $STATUS
