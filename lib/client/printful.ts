import { log } from "../logger.ts";

export interface PrintfulProduct {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
}

export interface PrintfulProductVariant {
  id: number;
  external_id: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  main_category_id: number;
  warehouse_product_id: number | null;
  warehouse_product_variant_id: number | null;
  retail_price: string;
  sku: string;
  currency: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
  files: PrintfulFile[];
  options: PrintfulOption[];
  is_ignored: boolean;
  size: string;
  color: string;
  availability_status: string;
}

export interface PrintfulFile {
  id: number;
  type: string;
  hash: string;
  url: string | null;
  filename: string;
  mime_type: string;
  size: number;
  width: number;
  height: number;
  dpi: number | null;
  status: string;
  created: number;
  thumbnail_url: string;
  preview_url: string;
  visible: boolean;
  is_temporary: boolean;
  message: string;
  options: PrintfulOption[];
  stitch_count_tier: PrintfulStitchCountTier | null;
}

export interface PrintfulOption {
  id: string;
  value: string;
}

export interface PrintfulStitchCountTier {
  id: number;
  name: string;
  stitch_count: number;
}

export interface PrintfulProductVariantListResponse {
  sync_product: PrintfulProduct;
  sync_variants: PrintfulProductVariant[];
}

export interface PrintfulResponse<T> {
  code: number;
  result: T;
  extra: unknown[];
  paging?: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * A store's webhook configuration. The v1 API has exactly one per store (one
 * URL for all event types); there are no webhook IDs.
 */
export interface PrintfulWebhookConfig {
  url: string | null;
  types: string[];
  params?: unknown;
}

export interface PrintfulRecipient {
  name: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state_code: string;
  state_name: string;
  country_code: string;
  country_name: string;
  zip: string;
  phone: string;
  email: string;
  tax_number?: string;
}

export interface PrintfulOrderItem {
  id: number;
  external_id: string;
  variant_id: number;
  sync_variant_id: number;
  external_variant_id: string;
  warehouse_product_variant_id: number | null;
  product_template_id: number | null;
  quantity: number;
  price: string;
  retail_price: string;
  name: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
  files: PrintfulFile[];
  options: PrintfulOption[];
  sku: string | null;
  discontinued: boolean;
  out_of_stock: boolean;
}

export interface PrintfulIncompleteItem {
  name: string;
  quantity: number;
  sync_variant_id: number;
  external_variant_id: string;
  external_line_item_id: string;
}

export interface PrintfulCosts {
  currency: string;
  subtotal: string;
  discount: string;
  shipping: string;
  digitization: string;
  additional_fee: string;
  fulfillment_fee: string;
  retail_delivery_fee: string;
  tax: string;
  vat: string;
  total: string;
}

export interface PrintfulRetailCosts {
  currency: string;
  subtotal: string;
  discount: string;
  shipping: string;
  tax: string;
  vat: string;
  total: string;
}

export interface PrintfulPricingBreakdown {
  customer_pays: string;
  printful_price: string;
  profit: string;
  currency_symbol: string;
}

export interface PrintfulShipmentItem {
  item_id: number;
  quantity: number;
  picked: number;
  printed: number;
}

export interface PrintfulShipment {
  id: number;
  carrier: string;
  service: string;
  tracking_number: number;
  tracking_url: string;
  created: number;
  ship_date: string;
  shipped_at: number;
  reshipment: boolean;
  items: PrintfulShipmentItem[];
}

export interface PrintfulGift {
  subject: string;
  message: string;
}

export interface PrintfulPackingSlip {
  email: string;
  phone: string;
  message: string;
  logo_url: string;
  store_name: string;
  custom_order_id: string;
}

export interface PrintfulOrder {
  id: number;
  external_id: string;
  store: number;
  status: string;
  shipping: string;
  shipping_service_name: string;
  created: number;
  updated: number;
  recipient: PrintfulRecipient;
  items: PrintfulOrderItem[];
  branding_items?: PrintfulOrderItem[];
  incomplete_items?: PrintfulIncompleteItem[];
  costs: PrintfulCosts;
  retail_costs: PrintfulRetailCosts;
  pricing_breakdown: PrintfulPricingBreakdown[];
  shipments: PrintfulShipment[];
  gift?: PrintfulGift;
  packing_slip?: PrintfulPackingSlip;
}

export interface PrintfulShippingRatesRequest {
  recipient: { country_code: string; state_code?: string; zip?: string };
  /** `variant_id` is the Printful catalog variant, as on `ProductVariant`. */
  items: Array<{ variant_id: string; quantity: number }>;
  currency?: string;
}

export interface PrintfulShippingRate {
  /** Shipping method, e.g. `STANDARD`; an order's `shipping` field. */
  id: string;
  name: string;
  /** Decimal string in `currency`, e.g. "4.95". */
  rate: string;
  currency: string;
  minDeliveryDays?: number;
  maxDeliveryDays?: number;
}

export class PrintfulApiClient {
  baseURL: string;
  printfulToken: string;
  fetch: typeof globalThis.fetch;

  constructor(fetch = globalThis.fetch) {
    this.baseURL = "https://api.printful.com";
    this.fetch = fetch;
    const printfulToken = Deno.env.get("PRINTFUL_SECRET");
    if (!printfulToken) {
      throw new Error("PRINTFUL_SECRET is not defined");
    }
    this.printfulToken = printfulToken;
  }

  async listProducts(): Promise<PrintfulResponse<PrintfulProduct[]>> {
    const response = await this.fetch(`${this.baseURL}/store/products`, {
      headers: {
        Authorization: `Bearer ${this.printfulToken}`,
      },
    });
    return await response.json();
  }

  async listProductVariants(
    productId: string,
  ): Promise<PrintfulResponse<PrintfulProductVariantListResponse>> {
    const response = await this.fetch(
      `${this.baseURL}/store/products/${productId}`,
      {
        headers: {
          Authorization: `Bearer ${this.printfulToken}`,
        },
      },
    );
    return await response.json();
  }

  async getProductVariant(
    variantId: string,
  ): Promise<PrintfulResponse<PrintfulProductVariant>> {
    const response = await this.fetch(
      `${this.baseURL}/store/variants/${variantId}`,
      {
        headers: {
          Authorization: `Bearer ${this.printfulToken}`,
        },
      },
    );
    return await response.json();
  }

  /**
   * Update a sync variant
   * @param variant The variant data to update. Must include id property.
   * @returns Updated product variant information
   */
  async updateProductVariant(
    variant: Partial<PrintfulProductVariant>,
  ): Promise<PrintfulResponse<PrintfulProductVariant>> {
    if (!variant.id) {
      throw new Error("Variant ID is required for updating a product variant");
    }

    const response = await this.fetch(
      `${this.baseURL}/store/variants/${variant.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.printfulToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(variant),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      log.error("failed to update product variant", errorData);
      throw new Error(
        `Failed to update product variant: ${response.status}`,
      );
    }

    return await response.json();
  }

  /** The store's webhook configuration (GET /webhooks). */
  async getWebhookConfig(): Promise<PrintfulResponse<PrintfulWebhookConfig>> {
    const response = await this.fetch(`${this.baseURL}/webhooks`, {
      headers: {
        Authorization: `Bearer ${this.printfulToken}`,
      },
    });
    return await response.json();
  }

  /**
   * Set the store's webhook configuration (POST /webhooks). This replaces the
   * existing URL and event types for every environment sharing the store.
   * @param types e.g. ["package_shipped"]
   */
  async setWebhookConfig(
    url: string,
    types: string[],
  ): Promise<PrintfulResponse<PrintfulWebhookConfig>> {
    const response = await this.fetch(`${this.baseURL}/webhooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.printfulToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, types }),
    });
    return await response.json();
  }

  /** Turn off the store's webhooks (DELETE /webhooks). */
  async disableWebhooks(): Promise<PrintfulResponse<PrintfulWebhookConfig>> {
    const response = await this.fetch(`${this.baseURL}/webhooks`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.printfulToken}`,
      },
    });
    return await response.json();
  }

  async getShippingRates(
    request: PrintfulShippingRatesRequest,
  ): Promise<PrintfulResponse<PrintfulShippingRate[]>> {
    const response = await this.fetch(`${this.baseURL}/shipping/rates`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.printfulToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error(
        `Printful shipping rates failed: ${response.status} ${await response
          .text()}`,
      );
    }
    return await response.json();
  }

  async getOrder(orderId: number): Promise<PrintfulResponse<PrintfulOrder>> {
    const response = await this.fetch(`${this.baseURL}/orders/${orderId}`, {
      headers: {
        Authorization: `Bearer ${this.printfulToken}`,
      },
    });
    return await response.json();
  }
}
