import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { ADMIN_SECTIONS, AdminPage } from "./AdminPage.tsx";
import { ScopeTabs } from "./ScopeTabs.tsx";

Deno.test("AdminPage links every admin section and marks the current one", () => {
  const html = render(
    <AdminPage
      title="Questions"
      section="questions"
      back={{ href: "/admin", label: "Dashboard" }}
      actions={<button type="button">Act</button>}
    >
      Body
    </AdminPage>,
  );
  for (const { href } of Object.values(ADMIN_SECTIONS)) {
    assertStringIncludes(html, `href="${href}"`);
  }
  assertEquals(html.match(/aria-current="page"/g)?.length, 1);
  assertStringIncludes(
    html,
    'href="/admin/questions" aria-current="page"',
  );
  assertStringIncludes(html, ">Questions</h1>");
  assertStringIncludes(html, "← Dashboard");
  assertStringIncludes(html, ">Act</button>");
  assertStringIncludes(html, "max-w-7xl");
});

Deno.test("ScopeTabs links each bank and marks the current one", () => {
  const html = render(<ScopeTabs path="/admin/questions" current="medic" />);
  assertStringIncludes(html, 'href="/admin/questions?scope=emt"');
  assertStringIncludes(html, 'href="/admin/questions?scope=advanced"');
  assertStringIncludes(
    html,
    'href="/admin/questions?scope=medic" aria-current="page"',
  );
  assert(!html.includes('scope=emt" aria-current'));
});
