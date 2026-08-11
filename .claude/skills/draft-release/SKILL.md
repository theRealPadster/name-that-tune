---
name: draft-release
description: Cut a new release of this Spicetify app — work out the version bump from what has merged since the last tag, write the release notes in this repo's house style, open the version-bump PR, then tag and draft the GitHub release once it is merged. Use when the user wants to release, cut a version, bump the version, or draft release notes.
---

# Drafting a release

The thing users actually install is the **`dist` branch**, not the tag. `push-dist.yml`
rebuilds and pushes it on every commit to `main`, so *`main` is released the moment
anything merges* — the tag and the GitHub release are documentation written after
the fact, not the mechanism.

That has one practical consequence worth holding onto: there is no "unrelease". If the
notes are wrong you edit them; if the code is wrong you ship another commit.

## The shape of it

| | |
|---|---|
| 1 | Gather the facts |
| 2 | Propose the version, **confirm with the user** |
| 3 | Draft the notes, **show them to the user** |
| 4 | Open the `chore: version bump` PR |
| — | **⏸ Stop. The user merges it.** |
| 5 | Verify `dist` matches main |
| 6 | Tag the bump commit |
| 7 | `gh release create --draft` — the user publishes |

Two hard stops: never merge the bump PR yourself, and never publish the release.
Both are the user's call.

## 1. Gather the facts

```bash
./.claude/skills/draft-release/gather.sh
```

Read-only, safe to run any time. It prints the last tag, every commit and PR since it,
each PR's author and labels, detected new contributors, and the Spotify/Spicetify
versions for the tested-against line.

If it warns that `package.json` disagrees with the last tag, **stop and work out why**
before bumping — usually it means a bump merged but was never tagged, and the fix is to
tag the existing commit rather than bump again.

## 2. Propose the version

Semver against what the PRs actually do, not against their `fix:`/`feat:` prefixes:

- **minor** — any new user-facing capability. 0.3.0 was a minor for one feature (song
  autocomplete, #198).
- **patch** — fixes, dependency bumps, internals only.
- **major** — has not happened yet; the app is pre-1.0. Ask before assuming it.

Say which PRs drove the call, then confirm the number with the user before touching
anything.

## 3. Draft the notes

This is the part that takes judgement — everything else is mechanical. Read the actual
PRs. Do not paste GitHub's auto-generated list, and do not just reformat PR titles.

The format, from `gh release view 0.2.0` and `0.3.0`:

```markdown
## What's Changed

**This release fixes the app being completely broken on current Spotify clients.**

* Fix playlists failing to load after Spotify removed the endpoint they used, by @peternjorogew in https://github.com/theRealPadster/name-that-tune/pull/190
* Allow starting a new game without leaving the game page first, by @theRealPadster in https://github.com/theRealPadster/name-that-tune/pull/196
* Various dependency upgrades

Tested against Spotify 1.2.94.583 with Spicetify 2.44.0.

## New Contributors
* @peternjorogew made their first contribution in https://github.com/theRealPadster/name-that-tune/pull/190

**Full Changelog**: https://github.com/theRealPadster/name-that-tune/compare/0.1.7...0.2.0
```

The rules that actually matter:

**One bold sentence up top saying what the release is *for*.** A reader deciding whether
to update should need nothing else. "This release fixes the app being completely broken
on current Spotify clients" — not "various fixes and improvements".

**Bullets are per user-visible change, not per PR.** #190 produced four separate bullets
in 0.2.0 because it fixed four distinct symptoms. One PR can be several bullets; several
PRs can collapse into one.

**Describe the symptom, not the diff.** "Fix playlists failing to load after Spotify
removed the endpoint they used" beats "resync shuffle+ with upstream". The reader knows
the game, not the codebase. Where a fix is Spotify's doing rather than ours, say so —
it explains why a working app broke on its own.

**Credit every author, the maintainer included.** Every bullet gets `by @author in <url>`,
whoever wrote it — @theRealPadster's own work included.

Note that this is a deliberate break from 0.1.x–0.3.0, which credited outside
contributors but left the maintainer's own changes bare (compare the #190 and #196
bullets as originally published). Do not copy that older pattern from `gh release view`;
the example above already shows the current convention.

**Leave internal work out entirely.** `chore:` PRs get no bullet — not the version bump
itself, not tooling, not CI, not the Claude config. 0.3.0 shipped #198, #199 and #200
and mentioned only #198. Roll Dependabot into one "Various dependency upgrades" line, or
drop it if that is the whole release.

**Tested-against comes from `gather.sh`,** which reads the live client over the debug
port (see the `spicetify-drive` skill). That only knows the one client that happens to be
running — 0.3.0 listed two Spotify versions. Ask the user whether they tested others
before settling the line.

Show the user the draft and take edits before opening anything.

## 4. Open the bump PR

Only `package.json` changes. `manifest.json` carries no version, and `dist/` is generated.

```bash
git checkout -b chore/version-bump-X.Y.Z
# edit "version" in package.json
git commit -am "chore: version bump to X.Y.Z"
gh pr create --base main --title "chore: version bump to X.Y.Z" \
  --body "Minor bump for <the headline change> in #NNN."
```

Keep the body to one line naming the bump's justification, as in #200.

**Then stop and hand back to the user.** Everything below waits on that merge.

## 5. Verify `dist` is current

The tag should point at something users can already install.

```bash
./.claude/skills/draft-release/verify-dist.sh
```

Exit 0 means `dist` matches main and it is safe to tag.

**Do not judge this by `dist`'s head commit.** `push-dist.yml` ends in
`git diff-index --quiet HEAD || git commit`, so it only commits when the *built output*
changes. A release whose only new commit is the version bump changes no output — the
version is not embedded in the bundle — so the run succeeds while `dist`'s head stays
pointing at an older SHA. That looks like a failed deploy and is not one. 0.3.1 hit
exactly this: `dist` read "generated at 111d1d1" (the PR before the bump) while its
contents were entirely correct.

So the script checks *content*, not commits: it confirms a successful `push-dist` run for
main's current SHA, then rebuilds locally with CI's own `pnpm build:prod` and diffs the
result against the branch. The build is reproducible, so a match is exact.

It tolerates exactly one discrepancy, `preview.png` at the branch root — a stale artifact
from an older layout that is no longer generated. The workflow builds into a checkout of
`dist` without cleaning first, so nothing ever removes it. Anything *else* differing is a
real problem: stop and work out why before tagging.

The script clears `dist/` (gitignored build output) to get a clean comparison. Stop
`pnpm watch` first if it is running.

## 6. Tag the bump commit

The tag goes on the bump commit itself, not on whatever landed after it. Both 0.2.0 and
0.3.0 are tagged this way.

```bash
git fetch origin
git tag X.Y.Z <bump-commit-sha>
git push origin X.Y.Z
```

Plain lightweight tags, no `v` prefix — match `0.3.0`, not `v0.3.0`.

Ignore the stray `dev-release` tag; `gather.sh` already filters it out.

## 7. Create the draft

```bash
gh release create X.Y.Z --draft --title "X.Y.Z" --notes-file notes.md
```

Give the user the URL and let them publish. Write `notes.md` to the scratchpad, not the
repo — this project keeps no CHANGELOG, and the release body is the only changelog there is.

## Gotchas

- **Squash merges renumber history.** Stacked release PRs conflict after the parent
  squashes. Confirm the squashed content matches (`git diff <old-commit> origin/main`
  should be empty) and then rebase, rather than resolving by hand.
- **`gather.sh` reads `origin/main`, not your local `main`.** It fetches first, so a stale
  local checkout will not silently produce short notes.
- **New-contributor detection assumes lowest PR number = first contribution.** True for
  this repo's history; it would misfire on someone whose first PR was closed and reopened.
- **Version bump PRs land in the *next* release's commit range** and must be excluded from
  its bullets. `gather.sh` lists them; you filter them.
