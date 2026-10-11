import { useState } from "preact/hooks";
import type { PrintfulProductVariant } from "../../../lib/client/printful.ts";
import type { Product } from "../../../lib/product_store.ts";
import { Badge } from "../../ui/Badge.tsx";
import { Button } from "../../ui/Button.tsx";
import { Card } from "../../ui/Card.tsx";
import { Modal } from "../../ui/Modal.tsx";

export type ProductColor = NonNullable<Product["colors"]>[number];

const HEX = /^#([0-9a-f]{3}){1,2}$/i;

/** Printful colors the product hasn't defined yet, with a hex and preview. */
export function undefinedPrintfulColors(
  variants: PrintfulProductVariant[],
  colors: ProductColor[],
): ProductColor[] {
  const defined = new Set(colors.map((c) => c.name.toLowerCase()));
  const found = new Map<string, ProductColor>();
  for (const variant of variants) {
    const name = variant.color;
    if (!name || defined.has(name.toLowerCase()) || found.has(name)) continue;
    found.set(name, {
      name,
      hex: variant.options.find((o) => o.id === "color")?.value || "#CCCCCC",
      thumbnail_url: variant.files.find((f) =>
        f.type === "preview"
      )?.preview_url ?? "",
    });
  }
  return [...found.values()];
}

/** The product's colors: a table, Printful's undefined colors, and an editor. */
export function ColorDefinitions(
  { product, printfulVariants, onSave }: {
    product: Product;
    printfulVariants: PrintfulProductVariant[];
    /** Saves the whole list; resolves true when it worked. */
    onSave: (colors: ProductColor[]) => Promise<boolean>;
  },
) {
  const colors = product.colors ?? [];
  const missing = undefinedPrintfulColors(printfulVariants, colors);
  const [editing, setEditing] = useState<
    { color: ProductColor; index: number } | null
  >(null);
  const [saving, setSaving] = useState(false);

  async function save(color: ProductColor, index: number) {
    const next = [...colors];
    if (index >= 0) next[index] = color;
    else next.push(color);
    setSaving(true);
    if (await onSave(next)) setEditing(null);
    setSaving(false);
  }

  return (
    <Card
      title="Colors"
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setEditing({
              color: { name: "", hex: "#000000", thumbnail_url: "" },
              index: -1,
            })}
        >
          Add color
        </Button>
      }
    >
      <p class="text-sm text-base-content/70">
        The shop shows these as the color choices. Products sold by color (like
        hoodies) need them before they can be activated; products sold by name
        (like scents) leave them empty and use custom variant names.
      </p>

      {colors.length === 0
        ? <p class="text-base-content/60">No colors defined.</p>
        : (
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Color</th>
                  <th>Hex</th>
                  <th>Thumbnail</th>
                  <th>
                    <span class="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {colors.map((color, index) => (
                  <tr key={`${color.name}-${index}`}>
                    <td>
                      <span class="flex items-center gap-2">
                        <Swatch hex={color.hex} />
                        {color.name}
                      </span>
                    </td>
                    <td class="font-mono text-xs">{color.hex}</td>
                    <td>
                      {color.thumbnail_url
                        ? (
                          <a
                            href={color.thumbnail_url}
                            target="_blank"
                            rel="noopener"
                            class="link"
                          >
                            View
                          </a>
                        )
                        : <Badge tone="warning" size="sm">Missing</Badge>}
                    </td>
                    <td class="text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        aria-label={`Edit ${color.name}`}
                        onClick={() =>
                          setEditing({ color, index })}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {missing.length > 0 && (
        <div>
          <h3 class="mb-2 text-sm font-semibold">
            Printful colors without a definition
          </h3>
          <ul class="flex flex-wrap gap-2">
            {missing.map((color) => (
              <li key={color.name}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing({ color, index: -1 })}
                >
                  <Swatch hex={color.hex} />
                  Define {color.name}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <ColorDialog
          key={`${editing.index}-${editing.color.name}`}
          initial={editing.color}
          isNew={editing.index < 0}
          saving={saving}
          onSave={(color) => save(color, editing.index)}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function Swatch({ hex }: { hex: string }) {
  return (
    <span
      class="inline-block size-5 shrink-0 rounded-full border border-base-content/20"
      style={{ backgroundColor: hex }}
      aria-hidden="true"
    />
  );
}

function ColorDialog(
  { initial, isNew, saving, onSave, onClose }: {
    initial: ProductColor;
    isNew: boolean;
    saving: boolean;
    onSave: (color: ProductColor) => void;
    onClose: () => void;
  },
) {
  const [color, setColor] = useState(initial);
  const set = (field: keyof ProductColor) => (e: Event) =>
    setColor({ ...color, [field]: (e.target as HTMLInputElement).value });
  const validHex = HEX.test(color.hex);
  const valid = color.name.trim() !== "" && validHex;

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Add color" : `Edit ${initial.name}`}
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            loading={saving}
            disabled={!valid}
            onClick={() => onSave({ ...color, name: color.name.trim() })}
          >
            Save color
          </Button>
        </>
      }
    >
      <div class="flex flex-col gap-4 py-4">
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Name</span>
          <input
            class="input w-full"
            value={color.name}
            onInput={set("name")}
            placeholder="Black"
          />
        </label>
        <div class="flex flex-col gap-1">
          <label for="color-hex" class="text-sm font-medium">Hex</label>
          <div class="flex items-center gap-2">
            <input
              id="color-hex"
              class={`input flex-1 font-mono ${validHex ? "" : "input-error"}`}
              value={color.hex}
              onInput={set("hex")}
              placeholder="#000000"
            />
            <input
              type="color"
              aria-label="Pick a color"
              class="size-10 cursor-pointer rounded-field"
              value={/^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : "#000000"}
              onInput={set("hex")}
            />
          </div>
          {!validHex && (
            <span class="text-sm text-error">
              Use #RGB or #RRGGBB, e.g. #1A2B3C.
            </span>
          )}
        </div>
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">Thumbnail URL</span>
          <input
            class="input w-full"
            value={color.thumbnail_url}
            onInput={set("thumbnail_url")}
            placeholder="https://…"
          />
        </label>
        {color.thumbnail_url && (
          <img
            src={color.thumbnail_url}
            alt={`${color.name || "Color"} thumbnail`}
            class="mx-auto max-h-32 rounded-field bg-base-200 object-contain"
          />
        )}
      </div>
    </Modal>
  );
}
