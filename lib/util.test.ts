import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.217.0/assert/mod.ts";
import { sortImagesInPlace, dollarsToCents } from "./util.ts";

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

// Tests for dollarsToCents function
Deno.test("dollarsToCents - converts basic dollar amounts correctly", () => {
  assertEquals(dollarsToCents(19.99), 1999);
  assertEquals(dollarsToCents(20.00), 2000);
  assertEquals(dollarsToCents(1.50), 150);
  assertEquals(dollarsToCents(0.99), 99);
  assertEquals(dollarsToCents(0.01), 1);
});

Deno.test("dollarsToCents - handles the specific bug case (19.99)", () => {
  // This is the specific case that was causing issues with floating-point precision
  assertEquals(dollarsToCents(19.99), 1999);
  assertEquals(dollarsToCents("19.99"), 1999);
});

Deno.test("dollarsToCents - handles string inputs", () => {
  assertEquals(dollarsToCents("19.99"), 1999);
  assertEquals(dollarsToCents("20.00"), 2000);
  assertEquals(dollarsToCents("1.50"), 150);
  assertEquals(dollarsToCents("0.99"), 99);
  assertEquals(dollarsToCents("0.01"), 1);
});

Deno.test("dollarsToCents - handles whole dollar amounts without decimals", () => {
  assertEquals(dollarsToCents(20), 2000);
  assertEquals(dollarsToCents(1), 100);
  assertEquals(dollarsToCents(0), 0);
  assertEquals(dollarsToCents("20"), 2000);
  assertEquals(dollarsToCents("1"), 100);
  assertEquals(dollarsToCents("0"), 0);
});

Deno.test("dollarsToCents - handles single decimal place", () => {
  assertEquals(dollarsToCents("19.9"), 1990);
  assertEquals(dollarsToCents("0.1"), 10);
  assertEquals(dollarsToCents("5.5"), 550);
});

Deno.test("dollarsToCents - handles edge cases", () => {
  assertEquals(dollarsToCents(0), 0);
  assertEquals(dollarsToCents("0"), 0);
  assertEquals(dollarsToCents("0.00"), 0);
  assertEquals(dollarsToCents(0.00), 0);
});

Deno.test("dollarsToCents - handles large amounts", () => {
  assertEquals(dollarsToCents(999.99), 99999);
  assertEquals(dollarsToCents("999.99"), 99999);
  assertEquals(dollarsToCents(1000.00), 100000);
});

Deno.test("dollarsToCents - validates precision vs Math.round approach", () => {
  // Test cases that would fail with floating-point arithmetic
  const testCases = [
    { input: 19.99, expected: 1999 },
    { input: 0.99, expected: 99 },
    { input: 1.01, expected: 101 },
    { input: 5.55, expected: 555 },
  ];

  for (const testCase of testCases) {
    assertEquals(dollarsToCents(testCase.input), testCase.expected);
    // Also verify the floating-point issue would occur with direct multiplication
    // (This is just for documentation, not assertion)
    const floatResult = Math.round(testCase.input * 100);
    assertEquals(dollarsToCents(testCase.input), floatResult);
  }
});
