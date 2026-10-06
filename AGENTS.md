# Project verification

- Runtime: Deno 2; Fresh 2 with the Vite plugin and Tailwind CSS 4.
- Development: `deno task dev` (port 8000 by default).
- Production: `deno task build`, then `deno task start`. Deployment must build
  assets and serve `_fresh/server.js`, not `main.ts`.
- Tests: `deno task test`. KV tests use in-memory databases. The allowed
  environment variables are Fresh build metadata, not application credentials.
- Application type check:
  `deno check main.ts vite.config.ts client.ts routes/ islands/ lib/ components/`.
- Full checks: `deno task check`. Existing repository-wide lint issues and type
  errors in `scripts/create_product.ts` and `scripts/verify_stripe_products.ts`
  are separate from the application checks.
- `vite.config.ts` externalizes server-only AWS, logging, and Sharp dependencies
  to avoid Fresh's CommonJS bundling incompatibilities. Keep browser
  dependencies bundled. Development uses bare package names; production uses npm
  specifiers.
- Cron jobs register only in production builds; Vite reloads must not register
  duplicate jobs. Callbacks additionally require `STAGE=PROD` to perform work.
- For local smoke checks, use `STAGE=DEV`; do not trigger real email, payment,
  webhook, or production-data operations. Full OAuth and commerce flows require
  separate staging verification.
- Server debugging uses the `Start And Debug Deno Server` launch configuration.
  Keep its source-map path overrides (and the attach configuration's): Vite
  emits workspace-relative source paths that otherwise resolve to duplicated
  directories such as `routes/routes/shop.tsx`. The inspector waits for
  attachment before startup. Set breakpoints inside handlers and request the
  corresponding route.
