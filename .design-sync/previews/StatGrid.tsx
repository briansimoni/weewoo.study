import { Card, Stat, StatGrid } from "weewoo-ui";
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

export function ProfileStats() {
  return (
    <Surface>
      <StatGrid>
        <Stat title="Questions Answered" value="150" tone="primary" />
        <Stat title="Correct Answers" value="130" tone="success" />
        <Stat title="Accuracy" value="87%" tone="accent" />
        <Stat title="Streak" value="45 Days" tone="secondary" />
      </StatGrid>
    </Surface>
  );
}
