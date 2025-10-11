// Global JSX runtime for lucide-preact compatibility
import { h, Fragment } from "preact";

// Make h and Fragment globally available
(globalThis as Record<string, unknown>).h = h;
(globalThis as Record<string, unknown>).Fragment = Fragment;

export { h, Fragment };
