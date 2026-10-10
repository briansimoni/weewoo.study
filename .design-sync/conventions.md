# weewoo.study design system: conventions

weewoo.study is an EMT/NREMT study app. Brand: **Night Shift** (dark, the
default) with a **Day Shift** light variant. DaisyUI 5 + Tailwind 4 classes,
themed by CSS variables. Components come from `window.WeeWooUI`.

## Setup: theme and page

- No provider. The theme comes from `data-theme` on the root element:
  Night Shift applies by default; `<html data-theme="dayshift">` switches to
  Day Shift.
- The page background is `bg-base-200` with `text-base-content`. Components are
  built for that page: `Card` (`bg-base-100`) sits one step above it; `Stat`
  tiles (`bg-base-200`) read as insets **inside a Card**. Put content on the
  page color, never on white.
- Fonts are already wired: IBM Plex Sans body (`font-sans`), Space Grotesk on
  `h1`–`h3`, `.btn` and `.card-title` automatically, IBM Plex Mono for numbers
  and timers (`font-mono`). There is no `font-display` class.

## Styling idiom

Use the DaisyUI component classes and theme colors, never raw palette colors
(`bg-blue-500`, `text-gray-600`, `bg-white`): those break Night Shift.

| Family     | Use                                                                 |
| ---------- | ------------------------------------------------------------------- |
| Surfaces   | `bg-base-100` (cards), `bg-base-200` (page, insets), `bg-base-300` (borders) |
| Text       | `text-base-content`, muted `text-base-content/70`, `/60`            |
| Brand      | `text-primary`, `bg-primary`, `text-secondary`, `text-accent`       |
| Status     | `text-success`, `text-warning`, `text-error`                        |
| Components | `card card-body card-title`, `btn`, `badge`, `alert`, `table table-zebra`, `input`, `textarea`, `select`, `toggle`, `radio`, `checkbox`, `tabs tab`, `menu`, `divider`, `collapse`, `dropdown`, `loading loading-spinner`, `indicator`, `stat`, `avatar`, `hero` |
| Layout     | `flex`, `flex-col`, `md:flex-row`, `grid`, `grid-cols-2`, `sm:grid-cols-2`, `md:grid-cols-2`, `md:grid-cols-3`, `lg:grid-cols-3`, `gap-2/4/6/8`, `p-4`, `p-6`, `px-4`, `py-6`, `mx-auto`, `max-w-md/xl/3xl/4xl`, `w-full`, `rounded-box`, `shadow-xl` |
| Type       | `text-sm`, `text-lg`, `text-xl` … `text-4xl`, `font-semibold`, `font-bold` |

**Lime (`primary`) is a fill.** Buttons and badges use lime with dark text.
For lime-colored text, links or lines, use `text-primary`, `link-primary` or
`progress-primary`: they switch to olive on Day Shift, where lime text on white
is unreadable. Never hard-code `#d4f25a` as a text color.

Only classes the app already uses are compiled. Stick to the families above;
anything else (e.g. `tooltip`, `grid-cols-3`, `hover:shadow-lg`) may silently
not exist. For one-off values use inline `style` with theme variables:
`var(--color-base-100)`, `var(--color-base-200)`, `var(--color-base-300)`,
`var(--color-base-content)`, `var(--color-primary)`, `var(--color-primary-ink)`.

## Components

Prefer `Button`, `LinkButton`, `Card`, `Stat`/`StatGrid`, `Avatar`, `Alert`,
`Badge`/`CountBadge`, `ProgressBar` and `Modal` over hand-built markup. They
take extra classes as `class` or `className` (both work). Each has a `.d.ts`
and `.prompt.md` under `components/general/<Name>/`.

## Voice

Dry EMS humor, short: "Clean call." / "Not quite. Read the why, then run it
again." / "Shift's almost over. One question keeps the streak."

## Example

```jsx
const { Card, Button, StatGrid, Stat, ProgressBar } = window.WeeWooUI;

<main className="bg-base-200 text-base-content min-h-screen p-6">
  <div className="max-w-xl mx-auto flex flex-col gap-6">
    <Card title="Cardiology · 6 of 10">
      <ProgressBar label="Lesson progress" value={6} max={10} />
      <p className="text-lg">
        A 54-year-old man has crushing chest pain radiating to his left arm.
        What should you do first?
      </p>
      <Button shape="block">Check answer</Button>
    </Card>
    <Card>
      <StatGrid>
        <Stat title="Accuracy" value="87%" tone="accent" />
        <Stat title="Streak" value="45 Days" tone="secondary" />
      </StatGrid>
    </Card>
  </div>
</main>
```
