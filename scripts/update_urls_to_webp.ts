#!/usr/bin/env deno run --allow-net --allow-read --allow-write --allow-env

import { ProductStore } from "../lib/product_store.ts";
import { log } from "../lib/logger.ts";
import "$std/dotenv/load.ts";

/**
 * Converts a single URL from .png to .webp
 */
function convertUrlToWebP(url: string): string {
  if (!url) return url;
  
  // Replace .png with .webp (case insensitive)
  return url.replace(/\.png$/i, '.webp');
}

/**
 * Converts an array of URLs from .png to .webp
 */
function convertUrlsToWebP(urls: string[]): string[] {
  return urls.map(url => convertUrlToWebP(url));
}

/**
 * Updates all product and variant image URLs to use WebP format
 */
async function updateUrlsToWebP() {
  log.info("Starting database URL update to WebP format...");

  const productStore = await ProductStore.make();

  try {
    // Get all products
    const products = await productStore.listProducts();
    log.info(`Found ${products.length} products to process`);

    let totalUpdates = 0;
    let productsUpdated = 0;
    let variantsUpdated = 0;

    for (const product of products) {
      log.info(`Processing product: ${product.name} (${product.printful_id})`);
      
      let productNeedsUpdate = false;
      const updatedProduct = { ...product };

      // Update product thumbnail URL
      if (product.thumbnail_url && product.thumbnail_url.endsWith('.png')) {
        const newUrl = convertUrlToWebP(product.thumbnail_url);
        if (newUrl !== product.thumbnail_url) {
          updatedProduct.thumbnail_url = newUrl;
          productNeedsUpdate = true;
          totalUpdates++;
          log.info(`Updated product thumbnail: ${product.thumbnail_url} -> ${newUrl}`);
        }
      }

      // Update product color thumbnail URLs
      if (product.colors && product.colors.length > 0) {
        const updatedColors = product.colors.map(color => {
          if (color.thumbnail_url && color.thumbnail_url.endsWith('.png')) {
            const newUrl = convertUrlToWebP(color.thumbnail_url);
            if (newUrl !== color.thumbnail_url) {
              totalUpdates++;
              log.info(`Updated color thumbnail for ${color.name}: ${color.thumbnail_url} -> ${newUrl}`);
              return { ...color, thumbnail_url: newUrl };
            }
          }
          return color;
        });

        // Check if any colors were updated
        const colorsChanged = updatedColors.some((color, index) => 
          color.thumbnail_url !== product.colors![index].thumbnail_url
        );

        if (colorsChanged) {
          updatedProduct.colors = updatedColors;
          productNeedsUpdate = true;
        }
      }

      // Update the product if any changes were made
      if (productNeedsUpdate) {
        await productStore.updateProduct(updatedProduct);
        productsUpdated++;
        log.info(`Updated product: ${product.printful_id}`);
      }

      // Process variant images
      const variants = await productStore.listProductVariants(product.printful_id);
      log.info(`Found ${variants.length} variants for product ${product.printful_id}`);

      for (const variant of variants) {
        if (variant.images && variant.images.length > 0) {
          const originalImages = variant.images;
          const updatedImages = convertUrlsToWebP(originalImages);

          // Check if any images were updated
          const imagesChanged = updatedImages.some((url, index) => url !== originalImages[index]);

          if (imagesChanged) {
            const updatedVariant = {
              ...variant,
              images: updatedImages
            };

            await productStore.updateVariant(updatedVariant);
            variantsUpdated++;

            // Count how many URLs were actually changed
            const changedCount = updatedImages.filter((url, index) => 
              url !== originalImages[index]
            ).length;
            
            totalUpdates += changedCount;
            
            log.info(`Updated variant ${variant.variant_id}: ${changedCount} image URLs changed`);
            
            // Log the specific changes
            originalImages.forEach((originalUrl, index) => {
              if (updatedImages[index] !== originalUrl) {
                log.info(`  ${originalUrl} -> ${updatedImages[index]}`);
              }
            });
          }
        }
      }
    }

    // Final summary
    log.info("Database URL update completed!", {
      totalProducts: products.length,
      productsUpdated,
      variantsUpdated,
      totalUrlUpdates: totalUpdates,
      note: "All .png URLs have been updated to .webp in the database"
    });

  } catch (error) {
    log.error("Database URL update failed:", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Run the update if this script is executed directly
if (import.meta.main) {
  await updateUrlsToWebP();
}
