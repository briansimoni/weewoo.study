import { Button, Card } from "weewoo-ui";
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

export function Question() {
  return (
    <Surface>
      <Card class="max-w-md">
        <h2 class="text-primary text-2xl font-bold">Practice Question</h2>
        <p class="text-lg">
          A 54-year-old man has crushing chest pain radiating to his left arm.
          What should you do first?
        </p>
        <Button>Submit</Button>
      </Card>
    </Surface>
  );
}

export function WithTitleAndActions() {
  return (
    <Surface>
      <Card
        class="max-w-md"
        title="Performance by category"
        actions={
          <>
            <Button variant="ghost">Later</Button>
            <Button>Review now</Button>
          </>
        }
      >
        <p>
          You're strongest in Airway Management and weakest in Pharmacology. A
          short review set targets the questions you missed most.
        </p>
      </Card>
    </Surface>
  );
}

export function Muted() {
  return (
    <Surface>
      <Card class="max-w-md">
        <p>Explanation</p>
        <Card tone="muted">
          <p>
            ABCs come first: you can't treat chest pain in a patient who isn't
            breathing.
          </p>
        </Card>
      </Card>
    </Surface>
  );
}
