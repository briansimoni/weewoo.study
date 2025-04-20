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
}
