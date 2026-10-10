import { Button } from "weewoo-ui";
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
      <Button>Start practice</Button>
    </Surface>
  );
}

export function Variants() {
  return (
    <Surface>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Button variant="primary">Next question</Button>
        <Button variant="secondary">Review missed</Button>
        <Button variant="accent">Report issue</Button>
        <Button variant="outline">Skip</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="error">Delete question</Button>
      </div>
    </Surface>
  );
}

export function Sizes() {
  return (
    <Surface>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
    </Surface>
  );
}

export function States() {
  return (
    <Surface>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Button loading>Submit</Button>
        <Button disabled>Submit</Button>
        <Button shape="circle" variant="ghost" aria-label="Thumbs up">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
          </svg>
        </Button>
      </div>
    </Surface>
  );
}

export function Block() {
  return (
    <Surface>
      <div style={{ width: 320 }}>
        <Button shape="block" size="lg">Check answer</Button>
      </div>
    </Surface>
  );
}
