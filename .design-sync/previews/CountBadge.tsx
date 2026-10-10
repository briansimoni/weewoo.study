import { CountBadge } from "weewoo-ui";
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

function CartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

export function OnIconButtons() {
  return (
    <Surface>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <a href="/cart" className="btn btn-ghost btn-circle indicator" aria-label="Cart, 2 items">
          <CountBadge count={2} />
          <CartIcon />
        </a>
        <a href="/profile" className="btn btn-ghost btn-circle indicator" aria-label="Streak: 45 days">
          <CountBadge count={45} />
          <span className="text-lg" aria-hidden="true">🔥</span>
        </a>
        <a href="/profile" className="btn btn-ghost btn-circle indicator" aria-label="Streak: 120 days">
          <CountBadge count={120} />
          <span className="text-lg" aria-hidden="true">🔥</span>
        </a>
      </div>
    </Surface>
  );
}
