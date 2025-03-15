import { defineRoute } from "$fresh/server.ts";
import { ShoppingBag } from "../icons/index.ts";

const prod_items = [
  {
    "id": 377478087,
    "external_id": "67cded91916eb9",
    "product_template_id": "85855720",
    "name": "weewoo.study hoodie",
    "variants": 66,
    "synced": 66,
    "thumbnail_url":
      "https://files.cdn.printful.com/files/c07/c0732453e5253619cc78b2213ea92479_preview.png",
    "is_ignored": false,
    title: "Premium Hoodie",
    description: "A premium hoodie for premium people.",
    price: 29.99,
    payment_link: "https://buy.stripe.com/test_7sIeYi9580dN59e4gg",
    stripe_product_id: "https://buy.stripe.com/cN29Cy8SBe06gtG7ss",
  },
];

const dev_items = [
  {
    "id": 377478087,
    "external_id": "67cded91916eb9",
    "product_template_id": "85855720",
    "name": "weewoo.study hoodie",
    "variants": 66,
    "synced": 66,
    "thumbnail_url":
      "https://files.cdn.printful.com/files/c07/c0732453e5253619cc78b2213ea92479_preview.png",
    "is_ignored": false,
    title: "Premium Hoodie",
    description: "A premium hoodie for premium people.",
    price: 29.99,
    payment_link: "https://buy.stripe.com/test_7sIeYi9580dN59e4gg",
    stripe_product_id: "prod_Rwso5hEwAvKLd5",
  },
];

const items = Deno.env.get("STAGE") === "TEST" ? dev_items : prod_items;

export default defineRoute((req, ctx) => {
  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 mr-10 ml-10 lg:mr-30 lg:ml-30 xl:ml-50 xl:mr-50">
      {items.map((item, index) => (
        <div className="card border-info-content shadow-2xl">
          <figure>
            <img
              src="https://files.cdn.printful.com/files/c07/c0732453e5253619cc78b2213ea92479_preview.png"
              alt="Shoes"
            />
          </figure>
          <div className="card-body">
            <h2 className="card-title">{item.title}</h2>
            <p>
              {item.description}
            </p>
            <div className="card-actions flex justify-around">
              <div className="card-actions text-2xl">
                ${item.price}
              </div>
              <a href={item.payment_link}>
                <button type="button" className="btn btn-primary">
                  Buy Now
                </button>
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
