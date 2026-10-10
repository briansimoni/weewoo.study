# UI audit (Phase 1)

A snapshot of the UI on 2026-10-10 (`main` at `865620a`), taken before
extracting `components/ui/` primitives. It lists every page and island, the
markup that's repeated by hand, and the inconsistencies a design system should
remove. Counts come from a scan of `class`/`className` strings in `routes/`,
`islands/` and `components/` (52 files, about 8,800 lines).

## Summary

- **No design tokens yet.** `static/styles.css` is only `tailwindcss` plus the
  DaisyUI 5 plugin with its default `light` and `dark` themes: no custom colors,
  fonts, radii or spacing scale. The brand is whatever DaisyUI's defaults are.
- **DaisyUI is used, but bypassed often.** 77 `btn`s and 35 `card`s use it, but
  key screens use hand-rolled Tailwind instead: the practice screen's "Next
  Question" button, the error page, the public user page's stats. 34 raw palette
  classes (`bg-blue-500`, `text-gray-500`, `bg-white`, ...) ignore the theme, so
  those spots break in dark mode.
- **The same components are copy-pasted.** The four-stat block is written twice
  (profile and public user page) with different colors. The admin header band is
  copied into 6 pages. The landing page writes out 6 feature cards, 3 promo
  cards and 15 star icons by hand. Modals are hand-managed with `modal-open` in
  3 places.
- **Feedback is inconsistent.** 38 browser `alert()` calls and 4 `confirm()`s
  (mostly admin, but also the practice screen), next to DaisyUI `alert`
  components and one toast.
- **Page layout has no shared shell.** Every page picks its own wrapper and
  width (`max-w-md`, `max-w-xl`, `max-w-3xl`, `max-w-4xl`, `container`), and
  most set no `<title>`.

## Foundations today

| Area       | Current state                                                                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme      | DaisyUI 5 (`daisyui@5.0.27`) defaults. `data-theme` on `<html>` from the user's saved preference (`light` default); `ThemeController` toggles light/dark and saves it via `/api/preferences`. |
| Colors     | DaisyUI semantic colors (`primary`, `secondary`, `accent`, `base-*`, `success`, ...) mixed with 34 raw Tailwind palette classes (see below).                                                  |
| Typography | System font stack (none configured). Headings are ad-hoc: `text-2xl font-semibold mb-4` (11×), `text-3xl font-bold mb-2` (7×), `text-xl font-bold` (7×), `text-4xl font-bold mb-4` (landing). |
| Icons      | `lucide-preact` in 17 files, plus emoji as icons (🚑 logo, 🔥 streak, 🎉/💩 feedback) and 5 inline SVGs (hamburger, cart, admin uploaders).                                                   |
| Motion     | None beyond DaisyUI defaults; `static/correct.wav` and `incorrect.wav` exist.                                                                                                                 |
| Dead files | `static/dist.css` (5,194 lines) isn't referenced anywhere; it predates the Vite/Tailwind 4 build. `islands/NavAvatar.tsx` isn't used (a hard-coded "D" avatar menu).                          |

## Page inventory

### Shell

| File                 | What it is                                                                        | Notes                                                                                                                                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `routes/_app.tsx`    | HTML document, default `<title>` "NREMT practice questions"                       | Most pages never override the title.                                                                                                                                                                                                                                                                         |
| `routes/_layout.tsx` | Navbar (logo, stage badge, cart, streak, menus, theme toggle), mobile bottom dock | The mobile dropdown and desktop menu are two hand-maintained copies of the same links. **Desktop has no Practice link**; only the mobile dock does. Cart appears twice (icon and menu link). Hamburger is inline SVG while dock icons are lucide. Islands: `CartIcon`, `StreakIndicator`, `ThemeController`. |
| `routes/_error.tsx`  | 404/500 page                                                                      | Hard-coded `bg-white`, `text-gray-800`, `bg-blue-600` button: a white card in dark mode, and not a DaisyUI `btn`.                                                                                                                                                                                            |

### Public and signed-in pages

| Route                                             | Files                                                                                | What's on it                                                                                | Notes                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                                               | `routes/index.tsx` (581 lines), `TrialQuestions`                                     | Hero, trial questions, 6 feature cards, shop promos, celebrity "endorsements", testimonials | Everything is written out by hand: 6 identical feature cards (icon circle + title + text), 3 hard-coded product cards linking to `/shop`, 15 `mask-star-2 bg-orange-400` stars. The endorsement section uses real celebrities' names, photos and audio clips (`trump.webp`, `snoop.mp3`, ...); worth deciding in the brand-direction task. |
| `/emt/practice`                                   | `islands/Question.tsx` (346)                                                         | Question card, answer radios, feedback, thumbs up/down modal                                | The core screen. Card is a hand-rolled `border border-gray-300 rounded-lg` box, not a DaisyUI card. "Next Question" is a hand-rolled `bg-blue-700` button. Correct/incorrect use `text-green-600`/`text-red-600`. Errors use `alert()`. Modal state is managed by hand. Shared with the landing page through `TrialQuestions`.             |
| `/profile`                                        | `routes/profile.tsx`, `islands/Profile.tsx` (290), `components/charts/BasicLine.tsx` | Avatar, editable name, 4 stats, streak countdown, accuracy chart, per-category table        | Stat grid is `grid-cols-2` at every width, which overflows at 390px (ROADMAP 0.3). Uses `avatar placeholder`, DaisyUI 4's class name; v5 renamed it `avatar-placeholder`, so the fallback avatar is unstyled. 3 cards repeat `card card-bordered w-full max-w-3xl shadow-xl rounded-xl p-6 bg-base-100`.                                   |
| `/user/[user_id]`                                 | `components/UserPage.tsx`                                                            | Another user's public profile                                                               | Same 4 stats as `/profile`, written again with pastel `bg-blue-100`/`text-blue-700`-style colors that ignore the theme. Should be the same component as the profile's.                                                                                                                                                                     |
| `/leaderboard`                                    | `routes/leaderboard.tsx`                                                             | Ranked table                                                                                | Clean DaisyUI table; its own `max-w-xl` card wrapper.                                                                                                                                                                                                                                                                                      |
| `/about`                                          | `routes/about.tsx`                                                                   | About text, CTAs                                                                            | `min-h-screen bg-base-200` full-page wrapper, unlike the pages around it.                                                                                                                                                                                                                                                                  |
| `/support`                                        | `routes/support.tsx`, `islands/SupportForm.tsx`                                      | Contact form with success/error alerts                                                      | Same `min-h-screen bg-base-200` wrapper as About; mixes `class` and `className`.                                                                                                                                                                                                                                                           |
| `/shop`                                           | `routes/shop.tsx`, `islands/shop/Catalog.tsx`, `ProductCard.tsx`                     | Product grid with a filter drawer                                                           | Price in raw `text-green-500`. Card hover uses `shadow-3xl`, which Tailwind doesn't define.                                                                                                                                                                                                                                                |
| `/shop/[id]`                                      | `islands/shop/ProductDetails.tsx` (368)                                              | Gallery, color/size pickers, add to cart, shipping and size guide                           | Uses a hidden DaisyUI toast plus an `alert-success`; gallery arrows use `bg-opacity-50` (Tailwind 3 syntax).                                                                                                                                                                                                                               |
| `/cart`                                           | `islands/CartPageIsland.tsx` (308)                                                   | Cart table, quantity steppers, summary card                                                 | **Shows the Printful product ID (e.g. "377478087") as the product name** (`CartPageIsland.tsx:161`). Inline SVG for the remove icon. Table doesn't fit at 390px (horizontal scroll).                                                                                                                                                       |
| `/checkout/success`                               | `routes/checkout/success.tsx`, `CartClearer`                                         | Order confirmation                                                                          | Shows the raw Stripe session ID as the "order reference".                                                                                                                                                                                                                                                                                  |
| `/auth/login`, `/auth/logout`, `/auth/logged-out` | `routes/auth/*`                                                                      | Redirects and a logged-out card                                                             | `logged-out` is the only one with UI: a small card with a button.                                                                                                                                                                                                                                                                          |
| `/auth/test-login`                                | `routes/auth/test-login.tsx`                                                         | Seed-user picker (DEV/TEST only)                                                            | Not a product page; leave out of the design system.                                                                                                                                                                                                                                                                                        |

### Admin (internal; lower priority)

| Route                                                   | Files                                                                                          | Notes                                                                                                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin`                                                | `routes/admin/index.tsx`                                                                       | Dashboard. The header band `bg-primary text-primary-content shadow-md py-4` + `container mx-auto px-4` is copied into 6 admin pages.                        |
| `/admin/questions`, `/admin/questions/[id]`             | `QuestionEditor`, `DeleteQuestionButton`, `admin/ReportCard`                                   | Mixed `class`/`className`; `confirm()` + `alert()` for delete.                                                                                              |
| `/admin/question-reports`, `.../question-reports-stats` | —                                                                                              | Tables and stats.                                                                                                                                           |
| `/admin/question-generator`                             | `AdminQuestionGenerator`                                                                       | `alert()` for errors.                                                                                                                                       |
| `/admin/users`, `/admin/database`, `/admin/debug`       | `admin/KvBackupUploader`                                                                       | Tables, upload forms.                                                                                                                                       |
| `/admin/product-manager`, `.../product/[id]`            | `components/ProductManager.tsx`, `islands/admin/ProductDetail.tsx` (1,776), `ZipImageUploader` | The biggest file in the UI. 28 `alert()`s, 3 `confirm()`s, and 15 uses of `text-on-surface`, a class that exists in neither Tailwind nor DaisyUI (a no-op). |

## Repeated patterns → proposed primitives

The roadmap's list (Button, Card, Badge, Modal, ProgressBar, Stat) holds up. The
scan adds a few more that would remove the most duplication.

| Primitive                 | Evidence                                                                                                                                                                                      | Notes                                                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Button**                | `btn` 77× in 30 files; `btn btn-primary` 16×, `btn btn-ghost btn-sm` 8×, `btn btn-primary btn-lg` 4×; two hand-rolled blue buttons (practice "Next Question", error page).                    | Variants: primary, secondary, outline, ghost, danger; sizes; `loading` state (spinner markup is repeated 5×); renders `<a>` when given `href`. |
| **Card**                  | `card` 35× in 16 files; `card bg-base-100 shadow-xl` 15×, `card bg-base-200 shadow-lg` 4×, profile's `card card-bordered ... max-w-3xl` 3×; question card hand-rolled with `border-gray-300`. | Pick one or two elevations. Title and actions slots.                                                                                           |
| **Stat** / **StatGrid**   | `stat` 20× in 6 files; the 4-stat block written twice (profile, user page) with different colors.                                                                                             | A `UserStats` built on it replaces both copies and fixes the 390px overflow in one place.                                                      |
| **Badge**                 | `badge` 11× in 7 files (stage badge, catalog filters, admin statuses).                                                                                                                        | Variants map to semantic colors.                                                                                                               |
| **Modal**                 | 3 `modal` dialogs, each with hand-managed `modal-open` state (practice feedback in `Question`, `QuestionEditor`, admin `ProductDetail`).                                                      | Use `<dialog>.showModal()` for focus and Escape handling.                                                                                      |
| **ProgressBar**           | `progress progress-primary` 2× today.                                                                                                                                                         | Needed for Phase 4 (daily goal, lessons) more than for today's pages.                                                                          |
| **Alert** + **Toast**     | `alert` 14× in 8 files (`alert-error mb-6` 4×), one hidden toast; 38 `alert()` and 4 `confirm()` calls.                                                                                       | A toast helper would replace the browser `alert()`s; `Modal` covers `confirm()`.                                                               |
| **Avatar**                | `avatar` 16× in 5 files; initials placeholder written twice (profile, user page).                                                                                                             | Fixes the DaisyUI 4 `placeholder` class name.                                                                                                  |
| **PageHeader** / **Page** | Page wrappers differ on every page (see inventory); `text-3xl font-bold mb-2` 7×; admin header band 6×.                                                                                       | A page shell with a title (also setting `<title>`) and one or two standard widths.                                                             |
| **FeatureCard**           | 6 copies on the landing page.                                                                                                                                                                 | Landing-only; worth it when the landing page is redesigned.                                                                                    |

## Inconsistencies and bugs to fix along the way

Raw palette colors that ignore the theme (most visible in dark mode):

- `routes/_error.tsx`: `bg-white`, `text-gray-800`, `text-gray-600`,
  `bg-blue-600`.
- `components/UserPage.tsx`: `bg-blue-100`/`text-blue-700`, green, yellow and
  purple pairs, `text-gray-600`.
- `islands/Question.tsx`: `bg-blue-700` button, `text-green-600`/`text-red-600`,
  `border-gray-300`.
- `islands/shop/ProductCard.tsx`: `text-green-500` price.
- `islands/admin/ProductDetail.tsx`: `text-gray-500` (16×), `bg-blue-500`
  buttons.
- Landing testimonials: `bg-orange-400` stars (could be `bg-warning`).

Classes that do nothing:

- `text-on-surface` (15×, admin product page): not a Tailwind or DaisyUI class.
- `avatar placeholder` (profile): DaisyUI 4 name; v5 uses `avatar-placeholder`.
- `shadow-3xl` (product card hover): not in Tailwind's scale.
- `bg-opacity-50` (product gallery arrows): Tailwind 3 syntax; v4 uses
  `bg-base-100/50`.

Bugs found:

- Cart shows the Printful product ID instead of the product name
  (`islands/CartPageIsland.tsx:161`).
- Profile overflows at 390px (stat grid; already in ROADMAP 0.3).
- Desktop navigation has no link to Practice.
- Most pages have no `<title>` (only cart, checkout success and support set
  one).

Code style:

- 12 files mix `class` and `className`. Pick one (Preact accepts both) when
  extracting.

## Suggested order for the extraction task

1. Button, Card, Stat/StatGrid, Avatar: they cover the most copies and fix the
   profile overflow and the user page's dark-mode colors on the way.
2. Alert + Toast, Modal: replace `alert()` and hand-managed modals on the
   practice screen first, admin later.
3. Page shell + PageHeader: one wrapper, standard widths, and `<title>`s.
4. Badge, ProgressBar: small; ProgressBar mainly for Phase 4.

Admin pages can adopt the primitives last, or stay on raw DaisyUI: they're
internal, and the product-detail page (1,776 lines) is a refactor of its own.
