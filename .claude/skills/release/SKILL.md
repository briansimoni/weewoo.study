---
name: release
description: Release to production (weewoo.study) by promoting the main commit the human approved on test.weewoo.study. Use only when the human explicitly asks to release or deploy to prod.
---

# Release to weewoo.study

`main` deploys test.weewoo.study. Production (the `weewoo-study` Deno Deploy
app) deploys the `production` branch. A release merges `main` into `production`
with `--no-ff`. That creates a new commit, so Deno Deploy always builds it, and
its tree is identical to the tested `main`.

**Only release when the human has explicitly asked for it in this
conversation.** Approval of a PR or a merge to main is not approval to release.

1. Sync and show what's going out:

   ```sh
   git fetch origin
   git log --oneline origin/production..origin/main
   ```

   If the list is empty, there is nothing to release. Stop.

2. Check that this exact `main` commit is what the human tested:
   - CI passed on it:
     `gh run list --branch main --workflow CI -L 1 --json headSha,conclusion`
     (the `headSha` must equal `git rev-parse origin/main`, and the conclusion
     must be `success`).
   - test.weewoo.study runs it: the `deploy/briansimoni/test-weewoo-study`
     status for that SHA is `success`
     (`gh api repos/briansimoni/weewoo.study/commits/<sha>/statuses`).
   - Tell the human the SHA and the commit list from step 1, and ask them to
     confirm they tested it on test.weewoo.study. Wait for a yes.

3. Create the release commit in a temporary worktree, so the human's working
   tree is untouched:

   ```sh
   sha=$(git rev-parse --short origin/main)
   git worktree add -B production ../weewoo-release origin/production
   cd ../weewoo-release
   git merge --no-ff origin/main -m "Release $(date -u +%F): main@$sha"
   git diff --quiet origin/main HEAD || { echo "tree differs from main"; exit 1; }
   git push origin production
   cd - && git worktree remove ../weewoo-release
   ```

   If the merge reports conflicts, someone committed to `production` directly.
   Stop and tell the human; don't resolve them yourself.

4. Wait for the prod build of the new `production` commit
   (`deploy/briansimoni/weewoo-study` status `success`, polling as in the
   verify-preview skill), then confirm it's routed:

   ```sh
   cd ~ && deno run -A jsr:@deno/deploy deployments list --org briansimoni --app weewoo-study --json --non-interactive
   ```

   The newest deployment must have that build's ID and `"status":"routed"`. Run
   the Deploy CLI outside the repo, because it rewrites `deno.lock`.

5. Smoke-test production (read-only; never run E2E against prod):
   `deno task smoke https://weewoo.study`.

6. Report: the release commit, the build ID, the smoke result, and the commits
   included.

**Rollback.** The fastest way is to roll back to the previous deployment in the
Deno Deploy console (weewoo-study → Deployments). Then fix forward on `main` and
release again. Don't force-push `production`.
