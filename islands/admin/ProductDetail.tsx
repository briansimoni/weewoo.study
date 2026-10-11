import { useEffect, useState } from "preact/hooks";
import type {
  PrintfulProduct,
  PrintfulProductVariant,
} from "../../lib/client/printful.ts";
import type { Product, ProductVariant } from "../../lib/product_store.ts";
import { productApi } from "../../lib/admin_product_api.ts";
import { Alert } from "../../components/ui/Alert.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Card } from "../../components/ui/Card.tsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.tsx";
import { Modal } from "../../components/ui/Modal.tsx";
import { showToast } from "../../components/ui/toast.ts";
import {
  ColorDefinitions,
  type ProductColor,
} from "../../components/admin/product/ColorDefinitions.tsx";
import { JsonEditor } from "../../components/admin/product/JsonEditor.tsx";
import { VariantTable } from "../../components/admin/product/VariantTable.tsx";
import ZipImageUploader from "./ZipImageUploader.tsx";

interface ProductDetailProps {
  productDetails: {
    sync_product: PrintfulProduct;
    sync_variants: PrintfulProductVariant[];
  };
  storedProduct?: Product | null;
}

/** The fields the JSON editor offers; printful_id is shown but can't change. */
function editableJson(product: Product): string {
  return JSON.stringify(
    {
      printful_id: product.printful_id,
      name: product.name,
      description: product.description || "",
      price: product.price,
      active: product.active,
      category: product.category,
      product_template_id: product.product_template_id || "",
      thumbnail_url: product.thumbnail_url,
      colors: product.colors || [],
      size_guide: product.size_guide,
    },
    null,
    2,
  );
}

/** A Printful product: import it, or manage the shop's copy of it. */
export default function ProductDetail(
  { productDetails, storedProduct }: ProductDetailProps,
) {
  const { sync_product, sync_variants } = productDetails;
  const [product, setProduct] = useState(storedProduct ?? null);
  const [storedVariants, setStoredVariants] = useState<ProductVariant[]>([]);
  const [selected, setSelected] = useState(sync_variants[0]);
  const [busy, setBusy] = useState<"import" | "toggle" | "delete" | null>(
    null,
  );
  const [dialog, setDialog] = useState<
    "toggle" | "delete" | "json" | "images" | null
  >(null);

  async function loadVariants(printfulId: string) {
    const result = await productApi.listVariants(printfulId);
    if (result.ok) setStoredVariants(result.data.variants ?? []);
    else showToast(result.error, { tone: "error" });
  }

  useEffect(() => {
    if (product) loadVariants(product.printful_id);
  }, [product?.printful_id]);

  async function importProduct() {
    setBusy("import");
    const result = await productApi.import(String(sync_product.id));
    setBusy(null);
    if (!result.ok) {
      showToast(result.error, { tone: "error" });
      return;
    }
    setProduct(result.data.product);
    showToast(
      `Imported ${result.data.product.name}. It stays inactive until you activate it.`,
      { tone: "success" },
    );
  }

  /** Saves product fields; resolves true when it worked. */
  async function saveProduct(data: Partial<Product>, done: string) {
    if (!product) return false;
    const result = await productApi.update(product.printful_id, {
      printful_id: product.printful_id,
      ...data,
    });
    if (!result.ok) {
      showToast(result.error, { tone: "error" });
      return false;
    }
    setProduct(result.data.product);
    showToast(done, { tone: "success" });
    return true;
  }

  async function toggleActive() {
    if (!product) return;
    setBusy("toggle");
    const result = await productApi.toggleActive(product.printful_id);
    setBusy(null);
    setDialog(null);
    if (!result.ok) {
      showToast(result.error, { tone: "error" });
      return;
    }
    setProduct(result.data.product);
    showToast(
      `${result.data.product.name} is now ${
        result.data.product.active ? "live in the shop" : "hidden from the shop"
      }.`,
      { tone: "success" },
    );
  }

  async function deleteProduct() {
    if (!product) return;
    setBusy("delete");
    const result = await productApi.remove(product.printful_id);
    if (!result.ok) {
      setBusy(null);
      setDialog(null);
      showToast(result.error, { tone: "error" });
      return;
    }
    globalThis.location.href = `/admin/product-manager?deleted=${
      encodeURIComponent(product.name)
    }`;
  }

  const preview = selected?.files.find((f) => f.type === "preview")
    ?.preview_url || sync_product.thumbnail_url;

  return (
    <div class="flex flex-col gap-6">
      {product && !product.product_template_id && (
        <Alert tone="warning">
          This product has no Product Template ID, so orders for it may not
          reach Printful. Add it with Edit JSON.
        </Alert>
      )}

      <Card bodyClass="gap-6 md:flex-row">
        <div class="flex h-72 items-center justify-center rounded-field bg-base-200 p-4 md:w-80 md:shrink-0">
          {preview
            ? (
              <img
                src={preview}
                alt={selected?.name ?? sync_product.name}
                class="max-h-full max-w-full object-contain"
              />
            )
            : <span class="text-base-content/50">No preview</span>}
        </div>

        <div class="flex min-w-0 flex-1 flex-col gap-4">
          <div class="flex flex-wrap items-center gap-2">
            {product
              ? (
                <Badge tone={product.active ? "success" : "warning"}>
                  {product.active ? "Active" : "Inactive"}
                </Badge>
              )
              : <Badge tone="ghost">Not imported</Badge>}
            {product?.category && <Badge tone="ghost">{product.category}
            </Badge>}
          </div>

          {product && (
            <p class="text-base-content/80">
              {product.description || (
                <span class="text-base-content/50">No description.</span>
              )}
            </p>
          )}

          <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt class="text-base-content/60">Printful ID</dt>
            <dd class="font-mono">{sync_product.id}</dd>
            {product && (
              <>
                <dt class="text-base-content/60">Template ID</dt>
                <dd class="font-mono">
                  {product.product_template_id || "—"}
                </dd>
                <dt class="text-base-content/60">Shop price</dt>
                <dd>${product.price.toFixed(2)}</dd>
              </>
            )}
            <dt class="text-base-content/60">Variants</dt>
            <dd>{sync_product.variants}</dd>
            {selected && (
              <>
                <dt class="text-base-content/60">Previewing</dt>
                <dd>{selected.name}</dd>
              </>
            )}
          </dl>

          <div class="mt-auto flex flex-wrap gap-2">
            {product
              ? (
                <>
                  <Button
                    variant={product.active ? "warning" : "success"}
                    onClick={() => setDialog("toggle")}
                  >
                    {product.active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="outline" onClick={() => setDialog("json")}>
                    Edit JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDialog("images")}
                  >
                    Upload images
                  </Button>
                  <Button
                    variant="ghost"
                    class="text-error"
                    onClick={() => setDialog("delete")}
                  >
                    Delete
                  </Button>
                </>
              )
              : (
                <Button loading={busy === "import"} onClick={importProduct}>
                  Import into the shop
                </Button>
              )}
          </div>
        </div>
      </Card>

      {product && (
        <>
          <ColorDefinitions
            product={product}
            printfulVariants={sync_variants}
            onSave={(colors: ProductColor[]) =>
              saveProduct({ colors }, "Colors saved.")}
          />
          <VariantTable
            product={product}
            printfulVariants={sync_variants}
            storedVariants={storedVariants}
            selectedId={selected?.id}
            onSelect={setSelected}
            onChanged={() => loadVariants(product.printful_id)}
          />

          <ConfirmDialog
            open={dialog === "toggle"}
            title={product.active
              ? `Hide ${product.name} from the shop?`
              : `Put ${product.name} in the shop?`}
            confirmLabel={product.active ? "Deactivate" : "Activate"}
            tone={product.active ? "warning" : "primary"}
            loading={busy === "toggle"}
            onConfirm={toggleActive}
            onCancel={() => setDialog(null)}
          >
            {product.active
              ? "Shoppers won't see it until you activate it again."
              : "Shoppers can buy it as soon as it's active."}
          </ConfirmDialog>
          <ConfirmDialog
            open={dialog === "delete"}
            title={`Delete ${product.name}?`}
            confirmLabel="Delete product"
            tone="error"
            loading={busy === "delete"}
            onConfirm={deleteProduct}
            onCancel={() => setDialog(null)}
          >
            This removes it from the shop. It stays in Printful, so you can
            import it again.
          </ConfirmDialog>
          {dialog === "json" && (
            <JsonDialog
              product={product}
              onSave={(data) => saveProduct(data, "Product saved.")}
              onClose={() => setDialog(null)}
            />
          )}
          <Modal
            open={dialog === "images"}
            onClose={() => setDialog(null)}
            title="Upload images"
          >
            {dialog === "images" && (
              <ZipImageUploader
                productId={product.printful_id}
                onImagesExtracted={() => setDialog(null)}
              />
            )}
          </Modal>
        </>
      )}

      {!product && sync_variants.length > 0 && (
        <Card title="Printful variants">
          <ul class="text-sm">
            {sync_variants.map((v) => (
              <li key={v.id}>
                {v.name}{" "}
                <span class="text-base-content/60">
                  {v.retail_price} {v.currency}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function JsonDialog(
  { product, onSave, onClose }: {
    product: Product;
    onSave: (data: Partial<Product>) => Promise<boolean>;
    onClose: () => void;
  },
) {
  const [text, setText] = useState(() => editableJson(product));
  const [saving, setSaving] = useState(false);
  let parseError = "";
  try {
    JSON.parse(text);
  } catch (error) {
    parseError = error instanceof Error ? error.message : "Invalid JSON";
  }

  async function save() {
    setSaving(true);
    const ok = await onSave(JSON.parse(text));
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      class="max-w-3xl"
      title="Edit product JSON"
      actions={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button loading={saving} disabled={!!parseError} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <p class="py-2 text-sm text-base-content/70">
        Every field except <code>printful_id</code>{" "}
        can change. The server validates it before saving.
      </p>
      <JsonEditor
        initial={text}
        onChange={setText}
        invalid={!!parseError}
        label="Product JSON"
      />
      {parseError && <p class="mt-2 text-sm text-error">{parseError}</p>}
    </Modal>
  );
}
