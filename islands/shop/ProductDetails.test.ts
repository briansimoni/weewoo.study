import { assertEquals } from "@std/assert";
import { sortSizes } from "./ProductDetails.tsx";

Deno.test("sortSizes sorts standard apparel sizes in expected order", () => {
    const sizes = ["L", "S", "M", "XS", "XL", "XXS"];

    assertEquals(sortSizes(sizes), ["XXS", "XS", "S", "M", "L", "XL"]);
});

Deno.test("sortSizes places extended xl sizes after XL in numeric order", () => {
    const sizes = ["3XL", "XL", "M", "2XL", "S", "10XL"];

    assertEquals(sortSizes(sizes), ["S", "M", "XL", "2XL", "3XL", "10XL"]);
});

Deno.test("sortSizes normalizes spacing and casing while sorting", () => {
    const sizes = [" xl ", "m", " 2xl", "s "];

    assertEquals(sortSizes(sizes), ["s ", "m", " xl ", " 2xl"]);
});

Deno.test("sortSizes keeps unknown sizes after known sizes in alphabetical order", () => {
    const sizes = ["Tall", "M", "Petite", "One Size", "S"];

    assertEquals(sortSizes(sizes), ["S", "M", "One Size", "Petite", "Tall"]);
});
