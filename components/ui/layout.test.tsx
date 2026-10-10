import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { Badge, CountBadge } from "./Badge.tsx";
import { Page, pageTitle } from "./Page.tsx";
import { ProgressBar } from "./ProgressBar.tsx";

Deno.test("pageTitle appends the site name", () => {
  assertEquals(pageTitle("Shop"), "Shop | WeeWoo.study");
  assertEquals(pageTitle(), "WeeWoo.study");
});

Deno.test("Page sets the width and renders an optional heading", () => {
  const plain = render(<Page title="Shop" width="wide">Body</Page>);
  assertStringIncludes(plain, 'class="mx-auto w-full px-4 py-6 max-w-7xl"');
  assert(!plain.includes("<h1"));

  const headed = render(
    <Page title="Cart" heading="Shopping Cart" description="2 items">
      Body
    </Page>,
  );
  assertStringIncludes(headed, "max-w-4xl");
  assertStringIncludes(
    headed,
    '<h1 class="text-3xl font-bold">Shopping Cart</h1>',
  );
  assertStringIncludes(headed, "2 items");
});

Deno.test("Badge and CountBadge", () => {
  assertEquals(
    render(<Badge tone="warning">DEV</Badge>),
    '<span class="badge badge-warning">DEV</span>',
  );
  const count = render(<CountBadge count={150} data-testid="n" />);
  assertStringIncludes(count, ">99+<");
  assertStringIncludes(count, 'data-testid="n"');
  assertStringIncludes(count, "badge badge-primary badge-sm indicator-item");
  assertStringIncludes(render(<CountBadge count={7} />), ">7<");
});

Deno.test("ProgressBar is labelled and can be indeterminate", () => {
  const bar = render(<ProgressBar label="Daily goal" value={3} max={10} />);
  assertStringIncludes(bar, 'aria-label="Daily goal"');
  assertStringIncludes(bar, 'value="3"');
  assertStringIncludes(bar, ">30%<");
  assertStringIncludes(bar, 'class="progress progress-primary w-full"');
  assert(!render(<ProgressBar label="Busy" />).includes("value="));
});
