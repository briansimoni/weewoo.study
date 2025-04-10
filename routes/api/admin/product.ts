import { Handlers } from "$fresh/server.ts";
import { ProductStore } from "../../../lib/product_store.ts";
import { PrintfulApiClient } from "../../../lib/client/printful.ts";

export const handler: Handlers = {
  /**
   * Import a product from Printful to the local product store
   * Sets active to false by default
   */
  async POST(req) {
    try {
      const body = await req.json();
      const { printful_id } = body;

      if (!printful_id) {
        return new Response(
          JSON.stringify({ error: "printful_id is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Get product details from Printful
      const printfulClient = new PrintfulApiClient();
      const productResponse = await printfulClient.listProductVariants(
        printful_id,
      );
      const productDetails = productResponse.result;

      if (!productDetails) {
        return new Response(
          JSON.stringify({ error: "Product not found in Printful" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Create product object
      const { sync_product } = productDetails;
      const product = {
        printful_id: sync_product.id.toString(),
        product_template_id: sync_product.external_id || "",
        name: sync_product.name,
        thumbnail_url: sync_product.thumbnail_url,
        description: "", // This would need to be provided separately
        price: 0, // This would need to be set later
        active: false, // Set to false as requested
        colors: [], // This would need to be populated from variants
      };

      // Store the product
      const productStore = await ProductStore.make();
      await productStore.addProduct(product);

      return new Response(
        JSON.stringify({
          success: true,
          product,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error importing product:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
