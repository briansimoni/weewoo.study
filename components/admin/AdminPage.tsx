import type { ComponentChildren } from "preact";
import { Head } from "fresh/runtime";
import { pageTitle } from "../ui/Page.tsx";

export const ADMIN_SECTIONS = {
  dashboard: { href: "/admin", label: "Dashboard" },
  questions: { href: "/admin/questions", label: "Questions" },
  reports: { href: "/admin/question-reports", label: "Reports" },
  generator: { href: "/admin/question-generator", label: "Generator" },
  products: { href: "/admin/product-manager", label: "Products" },
  users: { href: "/admin/users", label: "Users" },
  database: { href: "/admin/database", label: "Database" },
} as const;

export type AdminSection = keyof typeof ADMIN_SECTIONS;

// Full class names only (see components/ui/Button.tsx).
const WIDTHS = {
  /** Detail pages and forms. */
  narrow: "max-w-4xl",
  /** Tables and dashboards. */
  wide: "max-w-7xl",
} as const;

interface AdminPageProps {
  /** The page heading; the tab title is "Admin: <title>". */
  title: string;
  /** The admin tab this page belongs to. */
  section: AdminSection;
  description?: ComponentChildren;
  /** Buttons or links next to the heading. */
  actions?: ComponentChildren;
  /** A link above the heading back to the parent page, e.g. the list. */
  back?: { href: string; label: string };
  width?: keyof typeof WIDTHS;
  children?: ComponentChildren;
}

/** The shell of every admin page: section tabs, heading and width. */
export function AdminPage(
  {
    title,
    section,
    description,
    actions,
    back,
    width = "wide",
    children,
  }: AdminPageProps,
) {
  return (
    <>
      <Head>
        <title>{pageTitle(`Admin: ${title}`)}</title>
      </Head>
      <div class="border-b border-base-300 bg-base-100">
        <nav
          aria-label="Admin"
          class="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4"
        >
          {Object.entries(ADMIN_SECTIONS).map(([key, { href, label }]) => {
            const current = key === section;
            return (
              <a
                key={key}
                href={href}
                aria-current={current ? "page" : undefined}
                class={[
                  "shrink-0 border-b-2 px-3 py-3 text-sm font-medium",
                  current
                    ? "border-primary text-base-content"
                    : "border-transparent text-base-content/70 hover:text-base-content",
                ].join(" ")}
              >
                {label}
              </a>
            );
          })}
        </nav>
      </div>
      <div class={`mx-auto w-full px-4 py-6 ${WIDTHS[width]}`}>
        <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div class="min-w-0">
            {back && (
              <a href={back.href} class="link link-hover text-sm">
                ← {back.label}
              </a>
            )}
            <h1 class="text-3xl font-bold">{title}</h1>
            {description && (
              <p class="mt-1 text-base-content/70">{description}</p>
            )}
          </div>
          {actions && <div class="flex flex-wrap gap-2">{actions}</div>}
        </header>
        {children}
      </div>
    </>
  );
}
