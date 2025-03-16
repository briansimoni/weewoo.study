import { defineRoute } from "$fresh/server.ts";
import { ShoppingBag } from "../icons/index.ts";
import { items } from "../lib/shop_items.ts";

export default defineRoute((req, ctx) => {
  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 mr-10 ml-10 lg:mr-30 lg:ml-30 xl:ml-50 xl:mr-50">
      {items.map((item, index) => (
          <div className="card border-info-content shadow-2xl hover:shadow-3xl hover:border-primary">
          <a href={`/shop/${item.id}`}>
            <figure>
              <img
                src="https://files.cdn.printful.com/files/c07/c0732453e5253619cc78b2213ea92479_preview.png"
                alt="Shoes"
              />
            </figure>
            </a>
            <div className="card-body">
              <h2 className="card-title">{item.title}</h2>
              <p>
                {item.description}
              </p>
              <div className="flex gap-2 my-2">
                <div className="w-6 h-6 rounded-full bg-red-500 cursor-pointer border-2 border-gray-300 hover:border-gray-500"></div>
                <div className="w-6 h-6 rounded-full bg-black cursor-pointer border-2 border-gray-300 hover:border-gray-500"></div>
                <div className="w-6 h-6 rounded-full bg-gray-500 cursor-pointer border-2 border-gray-300 hover:border-gray-500"></div>
                <div className="w-6 h-6 rounded-full bg-blue-500 cursor-pointer border-2 border-gray-300 hover:border-gray-500"></div>
                <div className="w-6 h-6 rounded-full bg-pink-500 cursor-pointer border-2 border-gray-300 hover:border-gray-500"></div>
              </div>
              <div className="card-actions flex justify-start">
                <div className="card-actions text-2xl">
                  ${item.price}
                </div>
              </div>
              <div>
                <a href={item.payment_link}>
                  <button className="btn btn-primary">Buy</button>
                </a>
              </div>
            </div>
          </div>
      ))}
    </div>
  );
});
