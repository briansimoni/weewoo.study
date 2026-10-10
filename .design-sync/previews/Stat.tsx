import { Card, Stat } from "weewoo-ui";
import type * as React from "react";

// The preview card's body is white. In the app, stats sit inside a Card on
// the page color (base-200), where they read as inset tiles, so each cell
// renders that way.
function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-base-200 text-base-content rounded-box p-6">
      <Card>{children}</Card>
    </div>
  );
}

export function Accuracy() {
  return (
    <Surface>
      <div style={{ width: 240 }}>
        <Stat title="Accuracy" value="87%" tone="accent" />
      </div>
    </Surface>
  );
}

export function Tones() {
  return (
    <Surface>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
        <Stat title="Questions answered" value="150" tone="primary" />
        <Stat title="Correct answers" value="130" tone="success" />
        <Stat title="Streak" value="45 days" tone="secondary" />
        <Stat title="Missed this week" value="6" tone="error" />
      </div>
    </Surface>
  );
}

export function WithDescription() {
  return (
    <Surface>
      <div style={{ width: 260 }}>
        <Stat
          title="Exam readiness"
          value="72%"
          tone="warning"
          description="Up 8% since last week"
        />
      </div>
    </Surface>
  );
}
