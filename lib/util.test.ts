import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.217.0/assert/mod.ts";
import { sortImagesInPlace } from "./util.ts";

Deno.test("sortImagesInPlace - sorts by position keywords in correct order", () => {
  const images = [
    "https://example.com/image-right.jpg",
    "https://example.com/image-front.jpg",
    "https://example.com/image-no-position.jpg",
    "https://example.com/image-back.jpg",
    "https://example.com/image-left.jpg",
  ];

  sortImagesInPlace(images);

  assertEquals(images[0], "https://example.com/image-front.jpg");
  assertEquals(images[1], "https://example.com/image-back.jpg");
  assertEquals(images[2], "https://example.com/image-left.jpg");
  assertEquals(images[3], "https://example.com/image-right.jpg");
  assertEquals(images[4], "https://example.com/image-no-position.jpg");
});

Deno.test("sortImagesInPlace - handles case insensitivity", () => {
  const images = [
    "https://example.com/image-RIGHT.jpg",
    "https://example.com/image-Front.jpg",
  ];

  sortImagesInPlace(images);

  assertEquals(images[0], "https://example.com/image-Front.jpg");
  assertEquals(images[1], "https://example.com/image-RIGHT.jpg");
});

Deno.test("sortImagesInPlace - handles empty arrays", () => {
  const images: string[] = [];
  sortImagesInPlace(images);
  assertEquals(images.length, 0);
});

Deno.test("sortImagesInPlace - keeps original order when no position keywords", () => {
  const images = [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg",
  ];

  const sorted = sortImagesInPlace([...images]);

  assertEquals(images[0], "https://example.com/image1.jpg");
  assertEquals(images[1], "https://example.com/image2.jpg");
  assertEquals(images[2], "https://example.com/image3.jpg");
});

Deno.test("sort something more realistic", () => {
  // Direct test array without nesting
  const images = [
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-back-67f2d45ec6fc3.png",
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-back-67f2d45ec8339.png",
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-back-67f2d45ec87db.png",
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-front-67f2d45ec6a67.png",
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-front-67f2d45ec7b79.png",
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-front-67f2d45ec7f5f.png",
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-left-67f2d45ec7414.png",
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-left-front-67f2d45ec8d96.png",
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-left-front-67f2d45ec973b.png",
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-right-67f2d45ec77c4.png",
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-right-front-67f2d45ec9317.png",
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-right-front-67f2d45ec9b38.png",
  ];

  sortImagesInPlace(images);

  assertEquals(
    images[0],
    "https://d3leqxp227sjlw.cloudfront.net/summer-tshirt/unisex-sports-tee-orange-front-67f2d45ec6a67.png",
  );
  assertEquals(
    images.length,
    12,
  );
});
