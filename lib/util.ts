/**
 * @param images Array of image URLs to sort
 * @returns The same array, sorted in place
 */
export function sortImagesInPlace(images: string[]) {
  const frontImages: string[] = [];
  const backImages: string[] = [];
  const leftImages: string[] = [];
  const rightImages: string[] = [];
  const otherImages: string[] = [];

  for (const image of images) {
    const path = new URL(image).pathname.toLowerCase();
    if (
      path.includes("front") && !path.includes("left") &&
      !path.includes("right")
    ) frontImages.push(image);
    else if (path.includes("back")) backImages.push(image);
    else if (path.includes("left")) leftImages.push(image);
    else if (path.includes("right")) rightImages.push(image);
    else otherImages.push(image);
  }

  images.length = 0;
  images.push(
    ...frontImages,
    ...backImages,
    ...leftImages,
    ...rightImages,
    ...otherImages,
  );
}

/**
 * Converts a dollar amount to cents with precise arithmetic
 * Avoids floating-point precision issues by using string manipulation
 * @param dollars - Dollar amount as number or string (e.g., 19.99)
 * @returns Integer cents amount (e.g., 1999)
 */
export function dollarsToCents(dollars: number | string): number {
  const dollarString = dollars.toString();
  
  // Handle cases where there's no decimal point
  if (!dollarString.includes('.')) {
    return parseInt(dollarString) * 100;
  }
  
  // Split on decimal point
  const [wholePart, decimalPart] = dollarString.split('.');
  
  // Ensure we have exactly 2 decimal places
  const normalizedDecimalPart = (decimalPart + '00').substring(0, 2);
  
  // Convert to integer cents
  const wholePartCents = parseInt(wholePart || '0') * 100;
  const decimalPartCents = parseInt(normalizedDecimalPart);
  
  return wholePartCents + decimalPartCents;
}
