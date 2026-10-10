import { Avatar } from "weewoo-ui";
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

export function Initials() {
  return (
    <Surface>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar name="Seed Expert" size="lg" />
        <Avatar name="Pat Medic" size="md" />
        <Avatar name="Riley" size="sm" />
      </div>
    </Surface>
  );
}

export function OwnProfile() {
  return (
    <Surface>
      <Avatar name="Seed Expert" ring />
    </Surface>
  );
}
