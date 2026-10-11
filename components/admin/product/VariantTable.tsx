import { useState } from "preact/hooks";
import type { PrintfulProductVariant } from "../../../lib/client/printful.ts";
import type { Product, ProductVariant } from "../../../lib/product_store.ts";
import {
  productApi,
  type VariantInput,
} from "../../../lib/admin_product_api.ts";
import { Badge } from "../../ui/Badge.tsx";
import { Button } from "../../ui/Button.tsx";
import { Card } from "../../ui/Card.tsx";
import { ConfirmDialog } from "../../ui/ConfirmDialog.tsx";
import { showToast } from "../../ui/toast.ts";

/** The editable fields of a row, as typed. */
export interface VariantDraft {
  name: string;
  price: string;
  /** One URL per line. */
  images: string;
  color: string;
}

/** The defined color with this name, ignoring case. */
function definedColor(colors: Product["colors"], name: string | undefined) {
  return name
    ? colors?.find((c) => c.name.toLowerCase() === name.toLowerCase())
    : undefined;
}

/**
 * A draft starts from the stored variant, else from Printful's data. Colors
 * match the product's definitions ignoring case ("Black" is "black"); a stored
 * color with no definition is kept as is.
 */
export function initialDraft(
  printful: PrintfulProductVariant,
  stored: ProductVariant | undefined,
  colors: Product["colors"],
): VariantDraft {
  const color = definedColor(colors, stored?.color?.name)?.name ??
    stored?.color?.name ??
    definedColor(colors, printful.color)?.name ?? "";
  return {
    name: stored?.name ?? "",
    price: String(stored?.price ?? printful.retail_price),
    images: (stored?.images ?? []).join("\n"),
    color,
  };
}

/** The color choices for a row: the definitions, plus an undefined stored one. */
export function colorOptions(
  colors: Product["colors"],
  stored: ProductVariant | undefined,
): string[] {
  const names = (colors ?? []).map((c) => c.name);
  const own = stored?.color?.name;
  return own && !definedColor(colors, own) ? [...names, own] : names;
}

/** The variant to save, or an error message for the draft. */
export function variantFromDraft(
  draft: VariantDraft,
  printful: PrintfulProductVariant,
  stored: ProductVariant | undefined,
  product: Product,
): { variant: VariantInput } | { error: string } {
  const price = Number(draft.price);
  if (draft.price.trim() === "" || !Number.isFinite(price) || price <= 0) {
    return { error: "Enter a price above zero, like 39.99." };
  }
  const color = product.colors?.find((c) => c.name === draft.color) ??
    (draft.color && stored?.color?.name === draft.color
      ? stored.color
      : undefined);
  return {
    variant: {
      variant_id: String(printful.id),
      printful_product_id: product.printful_id,
      product_template_id: product.product_template_id,
      price,
      size: printful.size,
      name: draft.name.trim(),
      images: draft.images.split("\n").map((url) => url.trim()).filter(
        Boolean,
      ),
      stripe_product_id: stored?.stripe_product_id,
      ...(color && { color: { name: color.name, hex: color.hex } }),
    },
  };
}

/** Every Printful variant, with what the shop stores for it. */
export function VariantTable(
  {
    product,
    printfulVariants,
    storedVariants,
    selectedId,
    onSelect,
    onChanged,
  }: {
    product: Product;
    printfulVariants: PrintfulProductVariant[];
    storedVariants: ProductVariant[];
    selectedId?: number;
    /** Shows the variant's preview image in the summary. */
    onSelect: (variant: PrintfulProductVariant) => void;
    /** Called after a save or delete, to reload the stored variants. */
    onChanged: () => void;
  },
) {
  const saved = storedVariants.length;
  return (
    <Card
      title={
        <>
          Variants{" "}
          <span class="text-sm font-normal text-base-content/60">
            {saved} of {printfulVariants.length} saved to the shop
          </span>
        </>
      }
    >
      <div class="overflow-x-auto">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Variant</th>
              <th>Color</th>
              <th>Price</th>
              <th>Images</th>
              <th>Printful</th>
              <th>Stripe</th>
              <th>
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {printfulVariants.map((variant) => (
              <VariantRow
                key={variant.id}
                product={product}
                printful={variant}
                stored={storedVariants.find((v) =>
                  v.variant_id === String(variant.id)
                )}
                selected={variant.id === selectedId}
                onSelect={() => onSelect(variant)}
                onChanged={onChanged}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function VariantRow(
  { product, printful, stored, selected, onSelect, onChanged }: {
    product: Product;
    printful: PrintfulProductVariant;
    stored?: ProductVariant;
    selected: boolean;
    onSelect: () => void;
    onChanged: () => void;
  },
) {
  const [draft, setDraft] = useState<VariantDraft | null>(null);
  const [busy, setBusy] = useState<"save" | "delete" | "stripe" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const id = String(printful.id);
  const label = stored?.name || printful.name;
  const colors = colorOptions(product.colors, stored);

  const update = (field: keyof VariantDraft) => (e: Event) =>
    setDraft(
      draft && {
        ...draft,
        [field]: (e.target as HTMLInputElement).value,
      },
    );

  async function save() {
    if (!draft) return;
    const result = variantFromDraft(draft, printful, stored, product);
    if ("error" in result) {
      showToast(result.error, { tone: "error" });
      return;
    }
    setBusy("save");
    const saved = await productApi.saveVariant(
      product.printful_id,
      result.variant,
    );
    if (!saved.ok) {
      showToast(saved.error, { tone: "error" });
      setBusy(null);
      return;
    }
    // Stripe keeps its own price; follow a changed price there too.
    if (stored?.stripe_product_id && stored.price !== result.variant.price) {
      const stripe = await productApi.updateStripePrice(
        product.printful_id,
        id,
        result.variant.price,
      );
      if (!stripe.ok) {
        showToast(`Variant saved, but Stripe wasn't updated: ${stripe.error}`, {
          tone: "warning",
        });
      } else {
        showToast(`Saved ${label} and its Stripe price.`, { tone: "success" });
      }
    } else {
      showToast(`Saved ${label}.`, { tone: "success" });
    }
    setBusy(null);
    setDraft(null);
    onChanged();
  }

  async function remove() {
    setBusy("delete");
    const result = await productApi.deleteVariant(product.printful_id, id);
    setBusy(null);
    setConfirmDelete(false);
    if (!result.ok) {
      showToast(result.error, { tone: "error" });
      return;
    }
    showToast(`Deleted ${label}.`, { tone: "success" });
    onChanged();
  }

  async function createStripeProduct() {
    setBusy("stripe");
    const result = await productApi.createStripeProduct(
      product.printful_id,
      id,
    );
    setBusy(null);
    if (!result.ok) {
      showToast(result.error, { tone: "error" });
      return;
    }
    showToast(`Created the Stripe product for ${label}.`, { tone: "success" });
    onChanged();
  }

  const images = stored?.images.length ?? 0;

  return (
    <tr
      class={selected ? "bg-base-200" : undefined}
      data-testid={`variant-${id}`}
    >
      <td class="min-w-48">
        <button
          type="button"
          class="link link-hover text-left font-medium"
          onClick={onSelect}
          aria-pressed={selected}
          title="Show this variant's preview"
        >
          {printful.name}
        </button>
        <div class="font-mono text-xs text-base-content/60">
          {id}
          {printful.size && ` · ${printful.size}`}
        </div>
        {draft
          ? (
            <input
              class="input input-sm mt-1 w-full"
              aria-label="Custom name"
              placeholder="Custom name (optional)"
              value={draft.name}
              onInput={update("name")}
            />
          )
          : stored?.name && <div class="text-sm">“{stored.name}”</div>}
      </td>
      <td>
        {draft
          ? (
            colors.length > 0
              ? (
                <select
                  class="select select-sm"
                  aria-label="Color"
                  value={draft.color}
                  onChange={update("color")}
                >
                  <option value="">No color</option>
                  {colors.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              )
              : <span class="text-sm text-base-content/60">No colors</span>
          )
          : stored?.color?.name ?? printful.color ?? "—"}
      </td>
      <td>
        {draft
          ? (
            <input
              class="input input-sm w-24"
              aria-label="Price"
              inputMode="decimal"
              value={draft.price}
              onInput={update("price")}
            />
          )
          : stored
          ? `$${stored.price.toFixed(2)}`
          : (
            <span class="text-base-content/60">
              {printful.retail_price} {printful.currency}
            </span>
          )}
      </td>
      <td>
        {draft
          ? (
            <textarea
              class="textarea textarea-sm h-20 w-56"
              aria-label="Image URLs, one per line"
              placeholder="One image URL per line"
              value={draft.images}
              onInput={update("images")}
            />
          )
          : images > 0
          ? images
          : <Badge tone="warning" size="sm">None</Badge>}
      </td>
      <td>
        <Badge
          size="sm"
          tone={printful.availability_status === "active" ||
              printful.availability_status === "available"
            ? "ghost"
            : "warning"}
        >
          {printful.availability_status}
        </Badge>
      </td>
      <td>
        {!stored
          ? <Badge size="sm" tone="ghost">Not saved</Badge>
          : stored.stripe_product_id
          ? <Badge size="sm" tone="success">Created</Badge>
          : (
            <Button
              size="xs"
              variant="accent"
              loading={busy === "stripe"}
              onClick={createStripeProduct}
            >
              Create
            </Button>
          )}
      </td>
      <td>
        <div class="flex justify-end gap-1">
          {draft
            ? (
              <>
                <Button
                  size="xs"
                  loading={busy === "save"}
                  onClick={save}
                >
                  Save
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={busy === "save"}
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </Button>
              </>
            )
            : (
              <>
                <Button
                  size="xs"
                  variant="outline"
                  aria-label={`Edit ${printful.name}`}
                  onClick={() =>
                    setDraft(initialDraft(printful, stored, product.colors))}
                >
                  {stored ? "Edit" : "Set up"}
                </Button>
                {stored && (
                  <Button
                    size="xs"
                    variant="ghost"
                    class="text-error"
                    aria-label={`Delete ${printful.name}`}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete
                  </Button>
                )}
              </>
            )}
        </div>
        <ConfirmDialog
          open={confirmDelete}
          title={`Delete ${label}?`}
          confirmLabel="Delete variant"
          tone="error"
          loading={busy === "delete"}
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        >
          This deactivates its Stripe prices, deletes its Stripe product, and
          removes it from the shop. Printful keeps it.
        </ConfirmDialog>
      </td>
    </tr>
  );
}
