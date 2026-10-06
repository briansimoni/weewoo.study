---
name: verify-preview
description: After pushing a branch, wait for the Deno Deploy preview builds and smoke-test the preview URLs. Use when a branch has been pushed and needs verification before a human tests it or before merging.
---

# Verify a branch preview

Deno Deploy builds every pushed commit for both apps through its GitHub
integration and reports commit statuses.

1. Get the pushed commit: `git rev-parse HEAD`. Make sure it has been pushed:
   `git status` shows it is not ahead of its upstream.

2. Wait for both builds (`deploy/briansimoni/test-weewoo-study` and
   `deploy/briansimoni/weewoo-study`). Poll in a background Bash command instead
   of sleeping in the foreground:

   ```sh
   sha=$(git rev-parse HEAD)
   # Combined state can read "success" before the second app registers, so also require 2 contexts.
   until r=$(gh api repos/briansimoni/weewoo.study/commits/$sha/status --jq '.state + " " + (.statuses|length|tostring)') && set -- $r && [ "$1" != pending ] && [ "$2" -ge 2 ]; do sleep 15; done; echo "$r"
   gh api repos/briansimoni/weewoo.study/commits/$sha/statuses --jq '.[] | [.context,.state,.description,.target_url] | @tsv' | sort -u -k1,2
   ```

   Run it with a timeout (builds take about 2 minutes).

   An empty status list right after a push means the builds haven't registered
   yet. Keep waiting. A `failure` links to the build log in the Deno console.
   Report the link, because logs need a Deploy login.

3. Smoke-test the preview of the **test** app (test configuration). The branch
   name in the URL is the git branch with every `/` **removed** (Deno Deploy
   slugging, e.g. `feat/phase-0-1` → `featphase-0-1`). Compute it with
   `git branch --show-current | tr -d /`:

   ```sh
   deno task smoke https://test-weewoo-study--<branch>.briansimoni.deno.net --empty-db
   ```

   `--empty-db` is required: preview deployments get an empty KV database, so
   questions and products don't exist there (ROADMAP Phase 0.2 fixes this).

4. Report to the human: build status for both apps, smoke results, the preview
   URL, and a short "How to test" list for what changed. Point out anything the
   preview can't show, such as data-backed pages and login.

Don't merge to `main` as part of this skill. Merging deploys test.weewoo.study
and weewoo.study and needs the human's go-ahead.
