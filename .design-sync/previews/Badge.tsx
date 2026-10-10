import { Badge } from "weewoo-ui";
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

export function Tones() {
  return (
    <Surface>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Badge tone="primary">New</Badge>
        <Badge tone="secondary">Cardiology</Badge>
        <Badge tone="accent">Swag</Badge>
        <Badge tone="info">EMT-B</Badge>
        <Badge tone="success">Approved</Badge>
        <Badge tone="warning">DEV</Badge>
        <Badge tone="error">Reported</Badge>
        <Badge tone="outline">Airway</Badge>
        <Badge tone="ghost">Draft</Badge>
        <Badge>Neutral</Badge>
      </div>
    </Surface>
  );
}

export function Sizes() {
  return (
    <Surface>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Badge tone="primary" size="xs">xs</Badge>
        <Badge tone="primary" size="sm">sm</Badge>
        <Badge tone="primary" size="md">md</Badge>
        <Badge tone="primary" size="lg">lg</Badge>
      </div>
    </Surface>
  );
}
