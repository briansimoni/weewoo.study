import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { sesEventAlert } from "./ses_events.ts";

const ADMIN = "admin@example.com";

function sqsBody(notification: unknown): string {
  return JSON.stringify({
    Type: "Notification",
    Message: JSON.stringify(notification),
  });
}

function bounce(destination: string) {
  return {
    notificationType: "Bounce",
    mail: { destination: [destination], messageId: "m-1" },
    bounce: { bounceType: "Permanent" },
  };
}

Deno.test("sesEventAlert mails the admin about someone else's bounce", () => {
  const alert = sesEventAlert(sqsBody(bounce("user@example.com")), ADMIN);
  assertEquals(alert?.to, ADMIN);
  assertEquals(alert?.subject, "Email status for user@example.com - Bounce");
  assertStringIncludes(alert!.htmlBody, "resulted in a Bounce event");
  assertStringIncludes(alert!.htmlBody, "Permanent");
});

Deno.test("sesEventAlert skips events about mail to the admin", () => {
  assertEquals(sesEventAlert(sqsBody(bounce(ADMIN)), ADMIN), null);
});

Deno.test("sesEventAlert escapes HTML from the notification", () => {
  const alert = sesEventAlert(
    sqsBody(bounce("<script>@example.com")),
    ADMIN,
  );
  assertEquals(alert!.htmlBody.includes("<script>"), false);
  assertStringIncludes(alert!.htmlBody, "&lt;script&gt;@example.com");
});

Deno.test("sesEventAlert throws on bodies that are not SES notifications", () => {
  assertThrows(() => sesEventAlert("not json", ADMIN));
  assertThrows(() => sesEventAlert(JSON.stringify({ hello: 1 }), ADMIN));
  assertThrows(() => sesEventAlert(sqsBody({ something: "else" }), ADMIN));
});
