import type {
  PrintfulApiClient,
  PrintfulProduct,
  PrintfulProductVariant,
  PrintfulProductVariantListResponse,
} from "./client/printful.ts";
import type { Product, ProductVariant } from "./product_store.ts";
import seedCatalog from "./seed_catalog.json" with { type: "json" };

/** The store's products on Printful, as the admin product pages read them. */
export interface PrintfulCatalog {
  listProducts(): Promise<PrintfulProduct[]>;
  /** One product and its variants; throws when Printful doesn't have it. */
  getProduct(id: string): Promise<PrintfulProductVariantListResponse>;
}

/**
 * Printful when PRINTFUL_SECRET is set. Outside PROD without it (CI, local E2E
 * runs), a stub built from the seed catalog, so the admin product pages work
 * against seeded data. PROD without the secret is a configuration error.
 */
export function printfulCatalog(
  stage = Deno.env.get("STAGE"),
  secret = Deno.env.get("PRINTFUL_SECRET")?.trim(),
): PrintfulCatalog {
  if (secret) return liveCatalog();
  if (stage === "PROD") throw new Error("PRINTFUL_SECRET is not set");
  return seedPrintfulCatalog();
}

/**
 * The client is loaded on first use: its module pulls in the logger, which
 * the stub (and its tests) don't need.
 */
async function client(): Promise<PrintfulApiClient> {
  const { PrintfulApiClient } = await import("./client/printful.ts");
  return new PrintfulApiClient();
}

function liveCatalog(): PrintfulCatalog {
  return {
    async listProducts() {
      return (await (await client()).listProducts()).result;
    },
    async getProduct(id) {
      const response = await (await client()).listProductVariants(id);
      if (!response.result?.sync_product) {
        throw new Error(`Printful has no product ${id}`);
      }
      return response.result;
    },
  };
}

/** A stub-only product that the seed shop hasn't imported, to test importing. */
export const STUB_UNIMPORTED_PRODUCT_ID = "900000001";

const STUB_UNIMPORTED: {
  product: Pick<Product, "printful_id" | "name" | "thumbnail_url">;
  variants: ProductVariant[];
} = {
  product: {
    printful_id: STUB_UNIMPORTED_PRODUCT_ID,
    name: "[Seed] Unimported Mug",
    thumbnail_url: "",
  },
  variants: ["11 oz", "15 oz"].map((size, i) => ({
    variant_id: String(990000001 + i),
    printful_product_id: STUB_UNIMPORTED_PRODUCT_ID,
    product_template_id: "",
    price: 14.99 + i * 2,
    color: { name: "White", hex: "#FFFFFF" },
    size,
    images: [],
  })),
};

/** Printful-shaped products and variants from lib/seed_catalog.json. */
export function seedPrintfulCatalog(): PrintfulCatalog {
  const catalog = seedCatalog as {
    products: Product[];
    variants: ProductVariant[];
  };
  const products = [
    ...catalog.products.map((product) => ({
      product,
      variants: catalog.variants.filter((v) =>
        v.printful_product_id === product.printful_id
      ),
    })),
    STUB_UNIMPORTED,
  ];

  const syncProduct = (
    { product, variants }: (typeof products)[number],
  ): PrintfulProduct => ({
    id: Number(product.printful_id),
    external_id: `seed-${product.printful_id}`,
    name: product.name,
    variants: variants.length,
    synced: variants.length,
    thumbnail_url: product.thumbnail_url,
  });

  return {
    listProducts() {
      return Promise.resolve(products.map(syncProduct));
    },
    getProduct(id) {
      const entry = products.find((p) => p.product.printful_id === id);
      if (!entry) {
        return Promise.reject(new Error(`Printful has no product ${id}`));
      }
      return Promise.resolve({
        sync_product: syncProduct(entry),
        sync_variants: entry.variants.map((v) => stubVariant(entry, v)),
      });
    },
  };
}

function stubVariant(
  { product }: { product: Pick<Product, "printful_id" | "name"> },
  variant: ProductVariant,
): PrintfulProductVariant {
  const id = Number(variant.variant_id);
  const image = variant.images[0] ?? "";
  const color = variant.color?.name ?? "";
  return {
    id,
    external_id: `seed-${variant.variant_id}`,
    sync_product_id: Number(product.printful_id),
    name: [product.name, color, variant.size].filter(Boolean).join(" / "),
    synced: true,
    variant_id: id,
    main_category_id: 0,
    warehouse_product_id: null,
    warehouse_product_variant_id: null,
    retail_price: variant.price.toFixed(2),
    sku: `SEED-${variant.variant_id}`,
    currency: "USD",
    // The admin pages use product.variant_id as the variant's ID (see the
    // product route), so it matches the stored variant_id.
    product: { variant_id: id, product_id: 0, image, name: product.name },
    files: image
      ? [{
        id,
        type: "preview",
        hash: "",
        url: image,
        filename: "",
        mime_type: "image/webp",
        size: 0,
        width: 0,
        height: 0,
        dpi: null,
        status: "ok",
        created: 0,
        thumbnail_url: image,
        preview_url: image,
        visible: true,
        is_temporary: false,
        message: "",
        options: [],
        stitch_count_tier: null,
      }]
      : [],
    options: variant.color ? [{ id: "color", value: variant.color.hex }] : [],
    is_ignored: false,
    size: variant.size ?? "",
    color,
    availability_status: "active",
  };
}
