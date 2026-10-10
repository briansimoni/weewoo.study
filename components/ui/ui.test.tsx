import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { Avatar } from "./Avatar.tsx";
import { Button, buttonClass, LinkButton } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { Stat } from "./Stat.tsx";

Deno.test("buttonClass composes full DaisyUI class names", () => {
  assertEquals(buttonClass({}), "btn btn-primary");
  assertEquals(
    buttonClass({
      variant: "ghost",
      size: "sm",
      shape: "circle",
      class: "m-2",
    }),
    "btn btn-ghost btn-sm btn-circle m-2",
  );
  assertEquals(buttonClass({ variant: "neutral" }), "btn");
});

Deno.test("Button defaults to type=button and disables itself while loading", () => {
  const idle = render(<Button>Save</Button>);
  assertStringIncludes(idle, 'type="button"');
  assert(!idle.includes("disabled"));
  assert(!idle.includes("loading-spinner"));

  const busy = render(<Button type="submit" loading>Save</Button>);
  assertStringIncludes(busy, 'type="submit"');
  assertStringIncludes(busy, "disabled");
  assertStringIncludes(busy, 'aria-busy="true"');
  assertStringIncludes(busy, "loading-spinner");
  assertStringIncludes(busy, "Save");
});

Deno.test("LinkButton renders a link with button classes", () => {
  assertEquals(
    render(<LinkButton href="/" size="lg">Home</LinkButton>),
    '<a href="/" class="btn btn-primary btn-lg">Home</a>',
  );
});

Deno.test("Card renders title, body classes and actions", () => {
  const html = render(
    <Card title="Hi" tone="muted" bodyClass="items-center" actions="Go">
      Body
    </Card>,
  );
  assertStringIncludes(html, 'class="card bg-base-200"');
  assertStringIncludes(html, 'class="card-body items-center"');
  assertStringIncludes(html, '<h2 class="card-title">Hi</h2>');
  assertStringIncludes(html, '<div class="card-actions justify-end">Go</div>');
});

Deno.test("Stat applies its tone to the value", () => {
  const html = render(<Stat title="Accuracy" value="90%" tone="accent" />);
  assertStringIncludes(html, "text-accent");
  assertStringIncludes(html, ">90%<");
  assert(!html.includes("stat-desc"));
});

Deno.test("Avatar shows the image, or the name's initial without one", () => {
  const image = render(<Avatar name="Pat" src="/p.jpg" ring />);
  assertStringIncludes(image, '<img src="/p.jpg" alt="Pat"/>');
  assertStringIncludes(image, "ring-primary");

  const initials = render(<Avatar name=" seed expert" size="sm" />);
  assertStringIncludes(initials, "avatar avatar-placeholder");
  assertStringIncludes(initials, ">S<");
  assertStringIncludes(initials, '<span class="sr-only"> seed expert</span>');
  assert(!initials.includes("<img"));
});
