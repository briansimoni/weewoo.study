import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { FakeTime } from "@std/testing/time";
import { render } from "preact-render-to-string";
import { Alert } from "./Alert.tsx";
import { Modal } from "./Modal.tsx";
import { dismissToast, showToast, toasts } from "./toast.ts";

Deno.test("showToast queues toasts and removes them after their duration", () => {
  using time = new FakeTime();
  toasts.value = [];
  const info = showToast("Saved");
  const error = showToast("Failed", { tone: "error" });
  const sticky = showToast("Read me", { duration: 0 });
  assertEquals(toasts.value.map((t) => [t.message, t.tone]), [
    ["Saved", "info"],
    ["Failed", "error"],
    ["Read me", "info"],
  ]);

  time.tick(4000); // info's default
  assertEquals(toasts.value.map((t) => t.id), [error, sticky]);
  time.tick(4000); // error's default is 8s
  assertEquals(toasts.value.map((t) => t.id), [sticky]);
  time.tick(60_000);
  assertEquals(toasts.value.map((t) => t.id), [sticky]);

  dismissToast(sticky);
  assertEquals(toasts.value, []);
  assert(info < error && error < sticky);
});

Deno.test("showToast keeps an action link", () => {
  using _time = new FakeTime();
  toasts.value = [];
  showToast("Added to cart!", {
    tone: "success",
    action: { label: "Go to cart", href: "/cart" },
  });
  assertEquals(toasts.value[0].action, { label: "Go to cart", href: "/cart" });
  toasts.value = [];
});

Deno.test("Alert uses role=alert only for errors", () => {
  const error = render(<Alert tone="error">Nope</Alert>);
  assertStringIncludes(error, 'role="alert"');
  assertStringIncludes(error, "alert alert-error");
  assertStringIncludes(error, "<span>Nope</span>");

  const success = render(<Alert tone="success" class="mb-6">Sent</Alert>);
  assertStringIncludes(success, 'role="status"');
  assertStringIncludes(success, 'class="alert alert-success mb-6"');
});

Deno.test("Modal renders a labelled dialog with its actions", () => {
  const html = render(
    <Modal open={false} onClose={() => {}} title="Delete?" actions="Buttons">
      Body
    </Modal>,
  );
  assertStringIncludes(html, '<dialog class="modal" aria-labelledby=');
  assertStringIncludes(html, '<div class="modal-action">Buttons</div>');
  assertStringIncludes(html, 'class="modal-backdrop"');
  const titleId = /aria-labelledby="([^"]+)"/.exec(html)![1];
  assertStringIncludes(html, `<h3 id="${titleId}" class="font-bold text-lg">`);
  // Closed on the server; the browser opens it with showModal().
  assert(!/<dialog[^>]* open/.test(html));
});
