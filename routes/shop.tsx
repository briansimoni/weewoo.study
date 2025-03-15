import { defineRoute } from "$fresh/server.ts";
import { ShoppingBag } from "../icons/index.ts";
import { items } from "../lib/shop_items.ts";

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
