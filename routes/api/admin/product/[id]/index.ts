import { Handlers } from "$fresh/server.ts";
import {
  productCategories,
  ProductStore,
} from "../../../../../lib/product_store.ts";
import { z } from "zod";

// Validation schema for product updates
const UpdateProductSchema = z.object({
  product_template_id: z.string().min(1, "Product template ID is required").optional(),
  name: z.string().min(1, "Product name is required").optional(),
  thumbnail_url: z.string().url("Invalid thumbnail URL").optional(),
  description: z.string().optional(),
  price: z.number().positive("Price must be positive").optional(),
  active: z.boolean().optional(),
  category: z.enum(productCategories, {
    errorMap: () => ({ message: "Invalid category" }),
  }).optional(),
  colors: z.array(z.object({
    name: z.string().min(1, "Color name is required"),
    hex: z.string(),
    thumbnail_url: z.string().url("Invalid thumbnail URL"),
  })).optional(),
  size_guide: z.object({
    sizes: z.array(z.object({
      name: z.string().min(1, "Size name is required"),
      dimensions: z.array(z.object({
        name: z.string().min(1, "Dimension name is required"),
        value: z.string().min(1, "Dimension value is required"),
      })),
    })),
  }).optional(),
}).strict();

export const handler: Handlers = {
  /**
   * Update a product in the local product store
   */
  async PUT(req, ctx) {
    try {
      const productId = ctx.params.id;

      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Parse and validate the request body
      const rawData = await req.json();

      // Validate the data using Zod
      const validationResult = UpdateProductSchema.safeParse(rawData);
      if (!validationResult.success) {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: validationResult.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const data = validationResult.data;

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

      // Update the product
      const updatedProduct = await productStore.updateProduct({
        printful_id: productId,
        ...data,
      });

      return new Response(
        JSON.stringify({
          success: true,
          product: updatedProduct,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error updating product:", error);
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

  /**
   * Delete a product from the local product store
   */
  async DELETE(_req, _ctx) {
    try {
      const productId = _ctx.params.id;

      if (!productId) {
        return new Response(
          JSON.stringify({ error: "Product ID is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

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

      // Delete the product
      await productStore.deleteProduct(productId);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Product ${productId} deleted successfully`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Error deleting product:", error);
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
