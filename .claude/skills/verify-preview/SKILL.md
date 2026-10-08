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

3. Smoke-test the preview of the **test** app (test configuration). Use this
   commit's revision URL,
   `https://test-weewoo-study-<build id>.briansimoni.deno.net`, where the build
   ID ends the `deploy/briansimoni/test-weewoo-study` status's `target_url`
   (`…/builds/<build id>`). CI does the same. The branch alias
   (`test-weewoo-study--<branch>`, the branch with `/` removed) is what humans
   use, but Deploy doesn't always create it (seen 2026-10-08 for
   `fix/seed-cloudfront-thumbnails`: `DEPLOYMENT_NOT_FOUND` while the revision
   URL served):

   ```sh
   deno task smoke https://test-weewoo-study-<build id>.briansimoni.deno.net
   ```

   Each branch has its own KV database, which seeds itself on startup
   (`SEED_ON_EMPTY=true` on both apps), so the full smoke test including
   `/api/question` and a product page should pass. The first request waits for
   seeding and can take a few extra seconds. If data checks fail with "No
   questions", look at the runtime logs for "seeding failed":
   `cd ~ && deno run -A jsr:@deno/deploy logs --org briansimoni --app test-weewoo-study --once --json --non-interactive`.
   Use `--empty-db` only to separate a seeding problem from an app problem.

4. Run the E2E suite against the same preview (seeded data, test login and
   Stripe test mode all work there):

   ```sh
   BASE_URL=https://test-weewoo-study-<build id>.briansimoni.deno.net deno task e2e:remote
   ```

   The tests tolerate re-runs (they only add attempts). Failures leave
   screenshots and traces under `.e2e/results/`.

5. Report to the human: build status for both apps, smoke and E2E results, the
   preview URL, and a short "How to test" list for what changed. Humans sign in
   on previews through `/auth/test-login` (Auth0 rejects preview callbacks).
   Point out anything the preview can't show, such as real data and the Stripe
   webhook after payment.

Don't merge to `main` as part of this skill. Merging deploys test.weewoo.study
and weewoo.study and needs the human's go-ahead.
