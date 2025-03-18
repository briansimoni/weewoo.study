const prod_items = [
  {
    "id": 377478087,
    "external_id": "67cded91916eb9",
    "variant_id": 10779,
    "product_template_id": 85855720,
    "name": "weewoo.study hoodie",
    "variants": 66,
    "synced": 66,
    "thumbnail_url":
      "https://files.cdn.printful.com/files/c07/c0732453e5253619cc78b2213ea92479_preview.png",
    "is_ignored": false,
    title: "Premium Hoodie",
    description: "A premium hoodie for premium people.",
    price: 39.99,
    payment_link: "https://buy.stripe.com/dR6aGC9WF09g7XacMN",
    stripe_product_id: "prod_RwqBsBG4paxltt",
  },
];

const dev_items = [
  {
    "id": 377478087,
    "variant_id": 10779,
    "product_template_id": 85855720,
    "external_id": "67cded91916eb9",
    "name": "weewoo.study hoodie",
    "variants": 66,
    "synced": 66,
    "thumbnail_url":
      "https://files.cdn.printful.com/files/c07/c0732453e5253619cc78b2213ea92479_preview.png",
    "is_ignored": false,
    title: "Premium TEST Hoodie",
    description: "A premium TEST hoodie for premium people.",
    price: 29.99,
    payment_link: "https://buy.stripe.com/test_7sIeYi9580dN59e4gg",
    stripe_product_id: "prod_Rwso5hEwAvKLd5",
  },
];

interface Product {
  /** id of the product in printful */
  printful_id: number
  /** the variant id of the product corresponds to the color or whatever */
  variant_id: number
  /** this correspoonds to the template you made in printful. I can get it from the url in the dashboard
  * https://www.printful.com/dashboard/product-templates/85855720 
  **/
  product_template_id: number
  external_id: string,
  name: string
  synced: number
  thumbnail_url: string
  description: string
  price: number
  variants: [
    {
      id: number
      product_template_id: number
      size: string
      color: string
      hex_color: string;
      name: string;
      images: string[]
    }
  ]
}

const items = Deno.env.get("STAGE") === "TEST" ? dev_items : prod_items;

export { items };
