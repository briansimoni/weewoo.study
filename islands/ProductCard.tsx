import { useState } from "preact/hooks";
import { Product } from "../lib/product_store.ts";


export default function ProductCard({ product }: { product: Product }) {
  const [currentThumbnail, setCurrentThumbnail] = useState(product.colors[0].thumbnail_url);

  return (
    <div className="card border-info-content shadow-2xl hover:shadow-3xl hover:border-primary">
      <a href={`/shop/${product.printful_id}`}>
        <figure>
          <img
            src={currentThumbnail}
            alt={product.name}
          />
        </figure>
      </a>
      <div className="card-body">
        <h2 className="card-title">{product.name}</h2>
        <p>{product.description}</p>
        <div className="flex gap-2 my-2">
          {product.colors.map((color) => (
            <div 
              key={color.hex}
              className="w-6 h-6 rounded-full cursor-pointer border-2 border-gray-300 hover:border-gray-100"
              style={{ backgroundColor: color.hex }}
              onMouseEnter={() => {setCurrentThumbnail(color.thumbnail_url); console.log(color)}}
              onMouseLeave={() => setCurrentThumbnail(product.colors[0].thumbnail_url)}
            ></div>
          ))}
        </div>
        <div className="card-actions flex justify-start">
          <a href={`/shop/${product.printful_id}`}>
            <button type="button" className="btn btn-primary">See Options</button>
          </a>
        </div>
      </div>
    </div>
  );
}
