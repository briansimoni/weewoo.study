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
