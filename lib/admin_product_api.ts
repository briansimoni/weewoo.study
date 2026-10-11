import type { Product, ProductVariant } from "./product_store.ts";

/**
 * Browser-side calls to the admin product API (routes/api/admin/product*).
 * Every call resolves, never throws: `{ ok: false, error }` carries a message
 * fit for a toast.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** The API's error body: `{ error, details? }`, details as zod issues. */
export function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const { error, details } = body as { error?: unknown; details?: unknown };
  const message = typeof error === "string" && error ? error : fallback;
  if (!Array.isArray(details) || details.length === 0) return message;
  const lines = details.map((detail) => {
    if (typeof detail === "string") return detail;
    const { field, message } = (detail ?? {}) as {
      field?: string;
      message?: string;
    };
    if (field && message) return `${field}: ${message}`;
    return message ?? JSON.stringify(detail);
  });
  return `${message}: ${lines.join("; ")}`;
}

export async function request<T>(
  url: string,
  init: RequestInit,
  fallback: string,
  fetcher: typeof fetch = fetch,
): Promise<ApiResult<T>> {
  try {
    const response = await fetcher(url, {
      ...init,
      headers: init.body
        ? { "Content-Type": "application/json", ...init.headers }
        : init.headers,
    });
    const body = await response.json().catch(() => undefined);
    if (!response.ok || (body && body.success === false)) {
      return {
        ok: false,
        error: apiErrorMessage(body, `${fallback} (HTTP ${response.status})`),
      };
    }
    return { ok: true, data: body as T };
  } catch (error) {
    return {
      ok: false,
      error: `${fallback}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

const base = (printfulId: string) => `/api/admin/product/${printfulId}`;
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

/** The fields of a variant that the variant editor saves. */
export type VariantInput = Omit<ProductVariant, "description">;

export const productApi = {
  import: (printfulId: string) =>
    request<{ product: Product }>(
      "/api/admin/product",
      json("POST", { printful_id: printfulId }),
      "Couldn't import the product",
    ),
  update: (printfulId: string, data: Partial<Product>) =>
    request<{ product: Product }>(
      base(printfulId),
      json("PUT", data),
      "Couldn't save the product",
    ),
  toggleActive: (printfulId: string) =>
    request<{ product: Product }>(
      `${base(printfulId)}/toggle-active`,
      json("POST"),
      "Couldn't change the product's status",
    ),
  remove: (printfulId: string) =>
    request<unknown>(
      base(printfulId),
      json("DELETE"),
      "Couldn't delete the product",
    ),
  listVariants: (printfulId: string) =>
    request<{ variants: ProductVariant[] }>(
      `${base(printfulId)}/variants`,
      { method: "GET" },
      "Couldn't load the variants",
    ),
  saveVariant: (printfulId: string, variant: VariantInput) =>
    request<unknown>(
      `${base(printfulId)}/variant/${variant.variant_id}`,
      json("PUT", variant),
      "Couldn't save the variant",
    ),
  deleteVariant: (printfulId: string, variantId: string) =>
    request<unknown>(
      `${base(printfulId)}/variant/${variantId}`,
      json("DELETE"),
      "Couldn't delete the variant",
    ),
  createStripeProduct: (printfulId: string, variantId: string) =>
    request<unknown>(
      `${base(printfulId)}/variant/${variantId}/create-stripe-product`,
      json("POST"),
      "Couldn't create the Stripe product",
    ),
  updateStripePrice: (printfulId: string, variantId: string, price: number) =>
    request<unknown>(
      `${base(printfulId)}/variant/${variantId}/update-price`,
      json("POST", { price }),
      "Couldn't update the Stripe price",
    ),
};
