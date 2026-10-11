import { useEffect, useRef } from "preact/hooks";
import { json } from "@codemirror/lang-json";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";

/** One Dark on Night Shift; the theme's own colors on Day Shift. */
function themeExtension() {
  if (document.documentElement.getAttribute("data-theme") === "nightshift") {
    return oneDark;
  }
  return EditorView.theme({
    "&": {
      backgroundColor: "var(--color-base-100)",
      color: "var(--color-base-content)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--color-base-200)",
      color: "color-mix(in oklab, var(--color-base-content) 60%, transparent)",
      borderRight: "1px solid var(--color-base-300)",
    },
    ".cm-activeLine": { backgroundColor: "var(--color-base-200)" },
    ".cm-activeLineGutter": { backgroundColor: "var(--color-base-200)" },
    ".cm-cursor": { borderLeftColor: "var(--color-base-content)" },
    ".cm-selectionBackground": {
      backgroundColor:
        "color-mix(in oklab, var(--color-primary) 20%, transparent)",
    },
  });
}

/**
 * A CodeMirror JSON editor. `initial` is read once on mount; render it only
 * while it's needed (e.g. while its dialog is open).
 */
export function JsonEditor(
  { initial, onChange, invalid, label }: {
    initial: string;
    onChange: (text: string) => void;
    invalid?: boolean;
    /** Accessible name of the editor. */
    label: string;
  },
) {
  const container = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!container.current) return;
    const theme = new Compartment();
    const view = new EditorView({
      state: EditorState.create({
        doc: initial,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          lineNumbers(),
          json(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": label }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
          }),
          theme.of(themeExtension()),
          EditorView.theme({
            "&": { height: "24rem", fontSize: "0.875rem" },
            ".cm-scroller": { fontFamily: "var(--font-mono)" },
            ".cm-content": { padding: "0.75rem" },
          }),
        ],
      }),
      parent: container.current,
    });

    // Follow the theme toggle while open.
    const observer = new MutationObserver(() =>
      view.dispatch({ effects: theme.reconfigure(themeExtension()) })
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
      view.destroy();
    };
  }, []);

  return (
    <div
      ref={container}
      class={`overflow-hidden rounded-field border ${
        invalid ? "border-error" : "border-base-300"
      }`}
    />
  );
}
