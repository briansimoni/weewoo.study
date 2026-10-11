import { assertEquals, assertStringIncludes } from "@std/assert";
import { render } from "preact-render-to-string";
import { VitalsMonitor } from "./VitalsMonitor.tsx";

Deno.test("VitalsMonitor stays Night Shift and lists each readout", () => {
  const html = render(
    <VitalsMonitor
      title="Vitals"
      status="Stable"
      readouts={[
        { label: "Pulse", value: "72", description: "bpm", tone: "accent" },
        {
          label: "SpO2",
          value: "98%",
          description: "Room air",
          tone: "primary",
        },
      ]}
    />,
  );
  assertStringIncludes(html, 'data-theme="nightshift"');
  assertStringIncludes(html, 'aria-label="Vitals"');
  assertEquals(html.match(/<dt /g)?.length, 2);
  assertStringIncludes(html, ">98%</dd>");
  assertStringIncludes(html, "text-accent");
});
