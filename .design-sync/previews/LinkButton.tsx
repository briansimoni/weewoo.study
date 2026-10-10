import { LinkButton } from "weewoo-ui";
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

export function Primary() {
  return (
    <Surface>
      <LinkButton href="/emt/practice">Start practice</LinkButton>
    </Surface>
  );
}

export function Variants() {
  return (
    <Surface>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <LinkButton href="/emt/practice" size="lg">Start free practice</LinkButton>
        <LinkButton href="/shop" variant="outline" size="lg">Buy swag</LinkButton>
        <LinkButton href="/leaderboard" variant="ghost">Leaderboard</LinkButton>
      </div>
    </Surface>
  );
}
