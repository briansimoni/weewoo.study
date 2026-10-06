---
name: run-local
description: Build and run weewoo.study locally as a production build and smoke-test it. Use to confirm a change works in the real app (not just unit tests), before pushing, or when asked to run, start, or check the app.
---

# Run weewoo.study locally

Run the **production build**, not the Vite dev server. It is what Deno Deploy
serves, and it catches bundling problems that `deno task dev` hides.

1. Build:

   ```sh
   deno task build
   ```

2. Start the server in the background (Bash tool with `run_in_background`).
   `STAGE=DEV` overrides `.env` (dotenv never overwrites variables that are
   already set) and keeps cron work, email, and payments off:

   ```sh
   deno task seed   # creates or tops up .kv/seed.sqlite3
   KV_PATH=.kv/seed.sqlite3 STAGE=DEV deno serve -A --unstable-kv --unstable-cron --port 8123 _fresh/server.js
   ```

   Use port 8123 so a developer's `deno task dev` on 8000 is left alone. **Check
   that the port is free first** (`curl -s localhost:8123` should fail). If an
   old server is still listening, the new one dies with `AddrInUse` and the old
   one serves stale HTML whose `/assets/*` 500 after a rebuild. Stop it (step 5)
   before starting.

3. Wait until it answers, then smoke-test:

   ```sh
   until curl -s -o /dev/null http://localhost:8123/; do sleep 1; done
   deno task smoke http://localhost:8123
   ```

   `KV_PATH` points at the seeded database (`[Seed]` questions, `seed|…` users,
   `[Seed]` products), so data-backed checks should pass. Only leave `KV_PATH`
   unset (the developer's own local database) when the task needs their data.

4. For the specific change, request the affected routes directly (curl, or a
   browser tool if available) and check the server output for errors.

5. Stop the server when done. On Windows (PowerShell tool):

   ```powershell
   Get-NetTCPConnection -LocalPort 8123 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -Confirm:$false }
   ```

   On macOS or Linux: `kill $(lsof -t -i :8123)`.

Never use production credentials, real payments, or real email while testing.
Login (OAuth) can't be completed headlessly. Note authenticated flows as "needs
human testing" rather than guessing.
