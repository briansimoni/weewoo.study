---
name: release
description: Release to production (weewoo.study) by promoting the main commit the human approved on test.weewoo.study. Use only when the human explicitly asks to release or deploy to prod.
---

# Release to weewoo.study

`main` deploys test.weewoo.study through Deno Deploy's GitHub integration.
Production (the `weewoo-study` app) is **not** linked to GitHub. The
`Deploy production` workflow (`.github/workflows/deploy-production.yml`) deploys
it with the Deno Deploy CLI whenever the `production` branch moves. A release
merges `main` into `production` with `--no-ff`. That gives a release commit
whose tree is identical to the tested `main`, and the push triggers the
workflow.

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

4. Watch the `Deploy production` workflow run for the release commit. It deploys
   with `--prod` and then smoke-tests weewoo.study:

   ```sh
   gh run list --workflow "Deploy production" -L 1 --json databaseId,headSha,status
   gh run watch <databaseId> --exit-status
   ```

   The run's `headSha` must be the release commit. Then confirm the newest prod
   deployment is routed (run the Deploy CLI outside the repo, because it
   rewrites `deno.lock`):

   ```sh
   cd ~ && deno run -A jsr:@deno/deploy@0.0.9908 deployments list --org briansimoni --app weewoo-study --json --non-interactive
   ```

5. Smoke-test production (read-only; never run E2E against prod):
   `deno task smoke https://weewoo.study`.

6. Report: the release commit, the build ID, the smoke result, and the commits
   included.

**Rollback.** The fastest way is to roll back to the previous deployment in the
Deno Deploy console (weewoo-study → Deployments). Then fix forward on `main` and
release again. Don't force-push `production`.
