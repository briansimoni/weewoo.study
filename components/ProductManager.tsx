import type { Product } from "../lib/product_store.ts";
import type { PrintfulProduct } from "../lib/client/printful.ts";
import { Alert } from "./ui/Alert.tsx";
import { Badge } from "./ui/Badge.tsx";
import { LinkButton } from "./ui/Button.tsx";

interface ProductManagerProps {
  appProducts: Product[];
  printfulProducts: PrintfulProduct[];
  printfulError?: string;
  deleted?: string;
}

const detailHref = (id: string | number) =>
  `/admin/product-manager/product/${id}`;

/** The shop's products, and Printful's products that aren't imported yet. */
export default function ProductManager(
  { appProducts, printfulProducts, printfulError, deleted }:
    ProductManagerProps,
) {
  const imported = new Set(appProducts.map((p) => p.printful_id));
  const available = printfulProducts.filter((p) => !imported.has(String(p.id)));
  const products = [...appProducts].sort((a, b) =>
    Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)
  );
  const active = appProducts.filter((p) => p.active).length;

  return (
    <div class="flex flex-col gap-8">
      {deleted && <Alert tone="success">Deleted {deleted}.</Alert>}

      <section aria-labelledby="shop-products">
        <h2 id="shop-products" class="mb-3 text-xl font-bold">
          In the shop{" "}
          <span class="text-base font-normal text-base-content/60">
            {active} active of {appProducts.length}
          </span>
        </h2>
        {products.length === 0
          ? (
            <p class="rounded-box bg-base-100 p-8 text-center text-base-content/70">
              No products yet. Import one from Printful below.
            </p>
          )
          : (
            <div class="overflow-x-auto rounded-box bg-base-100">
              <table class="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Colors</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.printful_id}>
                      <td>
                        <a
                          href={detailHref(product.printful_id)}
                          class="flex items-center gap-3"
                        >
                          <Thumbnail src={product.thumbnail_url} />
                          <span>
                            <span class="link link-hover font-medium">
                              {product.name}
                            </span>
                            <span class="block font-mono text-xs text-base-content/60">
                              {product.printful_id}
                            </span>
                          </span>
                        </a>
                      </td>
                      <td>${product.price.toFixed(2)}</td>
                      <td>
                        {product.colors?.length
                          ? (
                            <span class="flex flex-wrap gap-1">
                              {product.colors.map((color) => (
                                <span
                                  key={color.name}
                                  class="size-4 rounded-full border border-base-content/20"
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                />
                              ))}
                            </span>
                          )
                          : <span class="text-base-content/50">—</span>}
                      </td>
                      <td>
                        <Badge tone={product.active ? "success" : "warning"}>
                          {product.active ? "Active" : "Inactive"}
                        </Badge>
                        {!product.product_template_id && (
                          <Badge tone="error" class="ml-1">No template</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>

      <section aria-labelledby="printful-products">
        <h2 id="printful-products" class="mb-3 text-xl font-bold">
          On Printful, not imported{" "}
          <span class="text-base font-normal text-base-content/60">
            {available.length}
          </span>
        </h2>
        {printfulError
          ? (
            <Alert tone="warning">
              Couldn't load Printful's products: {printfulError}
            </Alert>
          )
          : available.length === 0
          ? (
            <p class="text-base-content/70">
              Every Printful product is in the shop.
            </p>
          )
          : (
            <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((product) => (
                <li
                  key={product.id}
                  class="flex items-center gap-3 rounded-box bg-base-100 p-3"
                >
                  <Thumbnail src={product.thumbnail_url} />
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-medium">{product.name}</p>
                    <p class="text-xs text-base-content/60">
                      {product.variants} variants
                    </p>
                  </div>
                  <LinkButton
                    size="sm"
                    variant="outline"
                    href={detailHref(product.id)}
                    aria-label={`Review ${product.name}`}
                  >
                    Review
                  </LinkButton>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}

function Thumbnail({ src }: { src: string }) {
  return src
    ? (
      <img
        src={src}
        alt=""
        class="size-12 shrink-0 rounded-field bg-base-200 object-contain"
      />
    )
    : <span class="size-12 shrink-0 rounded-field bg-base-200" />;
}
