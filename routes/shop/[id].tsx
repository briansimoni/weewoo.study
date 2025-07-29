import { defineRoute } from "$fresh/server.ts";
import { Product, ProductStore } from "../../lib/product_store.ts";
import ProductDetails from "../../islands/ProductDetails.tsx";

const productStore = await ProductStore.make();

export default defineRoute(async (req, ctx) => {
  const id = ctx.params.id;
  const product = await productStore.getProduct(id);
  const variants = await productStore.listProductVariants(id);

  if (!product) {
    return new Response("Product not found", { status: 404 });
  }

  const P: Product = {
    printful_id: "387792016",
    product_template_id: "91237896",
    name: "Purple Sani-Cloth Candle",
    thumbnail_url:
      "https://files.cdn.printful.com/files/b08/b081ea50fac5e8ce07f5b83a597fb655_preview.png",
    description: "dope ass candle",
    price: 24.99,
    active: true,
    colors: [
      {
        name: "Sani-Cloth",
        hex: "#CCCCCC",
        thumbnail_url:
          "https://d3leqxp227sjlw.cloudfront.net/387792016/scented-soy-candle,-9oz-cinnamon-vanilla-front-6882e7ccee8a4.png",
      },
    ],
    type: "item",
  };

  const V = [
    {
      variant_id: "22804",
      printful_product_id: "387792016",
      product_template_id: "91237896",
      price: 24.99,
      name: "purple butthole",
      size: "9oz",
      images: [
        "https://d3leqxp227sjlw.cloudfront.net/387792016/scented-soy-candle,-9oz-cinnamon-vanilla-front-6882e7ccee8a4.png",
        "https://d3leqxp227sjlw.cloudfront.net/387792016/scented-soy-candle,-9oz-clean-cotton-front-6882e7ccee934.png",
        "https://d3leqxp227sjlw.cloudfront.net/387792016/scented-soy-candle,-9oz-coconut-cream-and-cardamom-front-6882e7ccee97b.png",
        "https://d3leqxp227sjlw.cloudfront.net/387792016/scented-soy-candle,-9oz-peppered-passionfruit-front-6882e7ccee9c3.png",
        "https://d3leqxp227sjlw.cloudfront.net/387792016/scented-soy-candle,-9oz-white-sage-and-lavender-front-2-6882e7cceea07.png",
      ],
      stripe_product_id: undefined,
    },
    {
      variant_id: "22804",
      printful_product_id: "387792016",
      product_template_id: "91237896",
      price: 24.99,
      name: "black dildo",
      size: "9oz",
      images: [
        "https://d3leqxp227sjlw.cloudfront.net/387792016/scented-soy-candle,-9oz-cinnamon-vanilla-front-6882e7ccee8a4.png",
        "https://d3leqxp227sjlw.cloudfront.net/387792016/scented-soy-candle,-9oz-clean-cotton-front-6882e7ccee934.png",
        "https://d3leqxp227sjlw.cloudfront.net/387792016/scented-soy-candle,-9oz-coconut-cream-and-cardamom-front-6882e7ccee97b.png",
        "https://d3leqxp227sjlw.cloudfront.net/387792016/scented-soy-candle,-9oz-peppered-passionfruit-front-6882e7ccee9c3.png",
        "https://d3leqxp227sjlw.cloudfront.net/387792016/scented-soy-candle,-9oz-white-sage-and-lavender-front-2-6882e7cceea07.png",
      ],
      stripe_product_id: undefined,
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <nav className="text-sm mb-8">
        <ol className="list-none p-0 inline-flex">
          <li className="flex items-center">
            <a href="/shop" className="text-primary hover:text-primary-focus">
              Shop
            </a>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mx-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </li>
          <li className="text-gray-500">{product.name}</li>
        </ol>
      </nav>

      <ProductDetails product={P} variants={V} />
    </div>
  );
});
