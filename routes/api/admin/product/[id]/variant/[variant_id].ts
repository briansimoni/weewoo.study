import { Handlers } from "$fresh/server.ts";
import { ProductStore } from "../../../../../../lib/product_store.ts";
import { ProductVariant } from "../../../../../../lib/product_store.ts";

export const handler: Handlers = {
  /**
   * Update a product variant in the local product store
   */
  async PUT(req, ctx) {
    try {
      const productId = ctx.params.id;
      const variantId = ctx.params.variant_id;

      if (!productId || !variantId) {
        return new Response(
          JSON.stringify({ error: "Product ID and Variant ID are required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Parse the request body
      const data = await req.json();
      
      // Get the product store
      const productStore = await ProductStore.make();

      // Check if product exists
      const product = await productStore.getProduct(productId);
      if (!product) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if variant exists
      const existingVariant = await productStore.getVariant(productId, variantId);
      let isNewVariant = false;
      
      // Prepare the variant data
      let variantData: ProductVariant;
      
      if (!existingVariant) {
        // If variant doesn't exist, create a new one
        isNewVariant = true;
        
        // Validate required fields for new variants
        if (!data.color || !data.size) {
          return new Response(
            JSON.stringify({ error: "Color and size are required for new variants" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        
        // Create a new variant with default values
        variantData = {
          variant_id: variantId,
          printful_product_id: productId,
          product_template_id: product.product_template_id,
          price: data.price || 0,
          color: data.color,
          size: data.size,
          images: data.images || [],
          stripe_product_id: data.stripe_product_id || `${productId}_${variantId}`, // Generate a default
          payment_page: data.payment_page || '',
          ...data // Apply any other fields from the request
        };
      } else {
        // Update existing variant
        variantData = {
          ...existingVariant,
          ...data,
          // Ensure these fields are always set correctly
          variant_id: variantId,
          printful_product_id: productId,
          product_template_id: product.product_template_id,
        };
      }

      // Create or update the variant
      if (isNewVariant) {
        await productStore.addVariant(variantData);
      } else {
        await productStore.updateVariant(variantData);
      }

      return new Response(
        JSON.stringify({
          success: true,
          variant: variantData,
          isNewVariant: isNewVariant,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Error updating variant:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }
};
