import { ProgressBar } from "weewoo-ui";
import type * as React from "react";

// The preview card's body is white; in the app these components always sit
// on the theme's page color (base-200), so each cell renders on it.
function Surface({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-base-200 text-base-content rounded-box p-6">
      {children}
    </div>
  );
}

export function Lesson() {
  return (
    <Surface>
      <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="text-sm">Question 6 of 10</span>
        <ProgressBar label="Lesson progress" value={6} max={10} />
      </div>
    </Surface>
  );
}

export function Tones() {
  return (
    <Surface>
      <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 12 }}>
        <ProgressBar label="Daily goal" value={80} tone="primary" />
        <ProgressBar label="Cardiology mastery" value={55} tone="secondary" />
        <ProgressBar label="Pharmacology mastery" value={30} tone="warning" />
        <ProgressBar label="Trauma mastery" value={90} tone="success" />
      </div>
    </Surface>
  );
}

export function Indeterminate() {
  return (
    <Surface>
      <div style={{ width: 320 }}>
        <ProgressBar label="Loading questions" />
      </div>
    </Surface>
  );
}
