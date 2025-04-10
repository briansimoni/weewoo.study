import { Handlers, PageProps } from "$fresh/server.ts";
import {
  PrintfulApiClient,
  PrintfulProductVariant,
} from "../../../../lib/client/printful.ts";
import { Product, ProductStore } from "../../../../lib/product_store.ts";
import ProductDetail from "../../../../islands/admin/ProductDetail.tsx";

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
  async GET(_req, ctx) {
    const productId = ctx.params.id;

    try {
      // Check if product exists in our database
      const productStore = await ProductStore.make();
      const storedProduct = await productStore.getProduct(productId);

      // Get product details from Printful
      const printfulClient = new PrintfulApiClient();
      const response = await printfulClient.listProductVariants(productId);

      return ctx.render({
        productId,
        productDetails: response.result,
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

        return ctx.render({
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
        return ctx.render({
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
      <div className="container mx-auto px-4 py-8">
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6"
          role="alert"
        >
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <p className="mt-2">
            <a
              href="/admin/product-manager"
              className="text-blue-500 hover:underline"
            >
              &larr; Back to Product Manager
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (!productDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6"
          role="alert"
        >
          <p className="font-bold">Product Not Found</p>
          <p>Could not find product with ID: {productId}</p>
          <p className="mt-2">
            <a
              href="/admin/product-manager"
              className="text-blue-500 hover:underline"
            >
              &larr; Back to Product Manager
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <a
          href="/admin/product-manager"
          className="text-blue-500 hover:underline"
        >
          &larr; Back to Product Manager
        </a>
      </div>
      {storedProduct && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            Stored Product Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p>
                <span className="font-medium">Name:</span> {storedProduct.name}
              </p>
              <p>
                <span className="font-medium">ID:</span>{" "}
                {storedProduct.printful_id}
              </p>
              <p>
                <span className="font-medium">Template ID:</span>{" "}
                {storedProduct.product_template_id || "N/A"}
              </p>
              <p>
                <span className="font-medium">Price:</span>{" "}
                ${storedProduct.price.toFixed(2)}
              </p>
              <p>
                <span className="font-medium">Status:</span>{" "}
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    storedProduct.active
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {storedProduct.active ? "Active" : "Inactive"}
                </span>
              </p>
            </div>
            <div>
              <p>
                <span className="font-medium">Description:</span>
              </p>
              <p className="text-gray-700 mb-4">
                {storedProduct.description || "No description available."}
              </p>
              {storedProduct.colors && storedProduct.colors.length > 0
                ? (
                  <>
                    <p>
                      <span className="font-medium">Colors:</span>
                    </p>
                    <div className="flex space-x-2 mt-2">
                      {storedProduct.colors.map((color) => (
                        <div
                          key={color.name}
                          className="w-6 h-6 rounded-full border border-gray-300"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </>
                )
                : (
                  <p>
                    <span className="font-medium">Colors:</span>{" "}
                    No color options available
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
      <ProductDetail
        productDetails={productDetails}
        storedProduct={storedProduct}
      />
    </div>
  );
}
