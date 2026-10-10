import type { ComponentChildren } from "preact";
import { Head } from "fresh/runtime";

// Full class names only (see Button.tsx).
const WIDTHS = {
  /** Forms, single cards: support, leaderboard, a practice question. */
  narrow: "max-w-xl",
  /** Profiles, the cart. */
  default: "max-w-4xl",
  /** Grids: the shop, product pages. */
  wide: "max-w-7xl",
} as const;

export const SITE_NAME = "WeeWoo.study";

/** The browser tab title for a page. */
export function pageTitle(title?: string): string {
  return title ? `${title} | ${SITE_NAME}` : SITE_NAME;
}

interface PageProps {
  /** Browser tab title, before " | WeeWoo.study". */
  title: string;
  /** Visible page heading; omit when the page draws its own. */
  heading?: ComponentChildren;
  /** A line under the heading. */
  description?: ComponentChildren;
  width?: keyof typeof WIDTHS;
  children?: ComponentChildren;
}

/** The shell every page renders in: tab title, width, padding and heading. */
export function Page(
  { title, heading, description, width = "default", children }: PageProps,
) {
  return (
    <>
      <Head>
        <title>{pageTitle(title)}</title>
      </Head>
      <div class={`mx-auto w-full px-4 py-6 ${WIDTHS[width]}`}>
        {heading && (
          <header class="mb-6">
            <h1 class="text-3xl font-bold">{heading}</h1>
            {description && (
              <p class="mt-2 text-base-content/70">{description}</p>
            )}
          </header>
        )}
        {children}
      </div>
    </>
  );
}
