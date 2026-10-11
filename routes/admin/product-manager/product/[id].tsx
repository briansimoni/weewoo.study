import { page, type PageProps } from "fresh";
import { AdminPage } from "../../../../components/admin/AdminPage.tsx";
import { Alert } from "../../../../components/ui/Alert.tsx";
import type { PrintfulProductVariant } from "../../../../lib/client/printful.ts";
import { printfulCatalog } from "../../../../lib/printful_catalog.ts";
import { Product, ProductStore } from "../../../../lib/product_store.ts";
import ProductDetail from "../../../../islands/admin/ProductDetail.tsx";
import { Handlers } from "fresh/compat";

interface ProductDetailData {
  productId: string;
  productDetails: {
    sync_product: {
      id: number;
      external_id: string;
      name: string;
      variants: number;
      synced: number;
      thumbnail_url: string;
    };
    sync_variants: PrintfulProductVariant[];
  } | null;
  storedProduct: Product | null;
  error: string | null;
}

export const handler: Handlers<ProductDetailData> = {
  async GET(ctx) {
    const productId = ctx.params.id;

    try {
      // Check if product exists in our database
      const productStore = await ProductStore.make();
      const storedProduct = await productStore.getProduct(productId);

      // Get product details from Printful
      const printful = await printfulCatalog().getProduct(productId);
      const productDetails = {
        sync_product: printful.sync_product,
        // the first id isn't the one that you actually use for creating orders which is annoying
        sync_variants: printful.sync_variants.map((variant) => ({
          ...variant,
          id: variant.product.variant_id,
        })),
      };

      return page({
        productId,
        productDetails,
        storedProduct,
        error: null,
      });
    } catch (error) {
      console.error(
        `Error fetching product details for ID ${productId}:`,
        error,
      );

      // Even if Printful API fails, try to get the product from our database
      try {
        const productStore = await ProductStore.make();
        const storedProduct = await productStore.getProduct(productId);

        return page({
          productId,
          productDetails: null,
          storedProduct,
          error: storedProduct
            ? "Failed to fetch latest Printful details, showing stored data only."
            : error instanceof Error
            ? error.message
            : "Failed to fetch product details",
        });
      } catch (_dbError) {
        return page({
          productId,
          productDetails: null,
          storedProduct: null,
          error: error instanceof Error
            ? error.message
            : "Failed to fetch product details",
        });
      }
    }
  },
};

export default function ProductDetailPage(
  { data }: PageProps<ProductDetailData>,
) {
  const { productId, productDetails, storedProduct, error } = data;

  if (error) {
    return (
      <AdminPage
        title="Product"
        section="products"
        back={{ href: "/admin/product-manager", label: "Products" }}
        width="narrow"
      >
        <Alert tone="error">{error}</Alert>
      </AdminPage>
    );
  }

  if (!productDetails) {
    return (
      <AdminPage
        title="Product not found"
        section="products"
        back={{ href: "/admin/product-manager", label: "Products" }}
        width="narrow"
      >
        <Alert tone="warning">
          No Printful product has the ID {productId}.
        </Alert>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title={storedProduct?.name ?? productDetails.sync_product.name}
      section="products"
      back={{ href: "/admin/product-manager", label: "Products" }}
    >
      <ProductDetail
        productDetails={productDetails}
        storedProduct={storedProduct}
      />
    </AdminPage>
  );
}
