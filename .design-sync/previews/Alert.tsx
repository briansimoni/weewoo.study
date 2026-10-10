import { Alert } from "weewoo-ui";
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
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Alert tone="info">New questions were added to Cardiology.</Alert>
        <Alert tone="success">
          Your message has been sent. I'll get back to you soon.
        </Alert>
        <Alert tone="warning">Your streak expires in 2 hours.</Alert>
        <Alert tone="error">Couldn't send your feedback. Please try again later.</Alert>
      </div>
    </Surface>
  );
}
