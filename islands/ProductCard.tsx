import { useState } from "preact/hooks";
import { Product } from "../lib/product_store.ts";

export default function ProductCard({ product }: { product: Product }) {
  // Default to product thumbnail if no colors are available
  const defaultThumbnail = product.colors && product.colors.length > 0
    ? product.colors[0].thumbnail_url
    : product.thumbnail_url;

  const [currentThumbnail, setCurrentThumbnail] = useState(defaultThumbnail);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = (img: HTMLImageElement) => {
    // Check if image is already loaded (cached)
    if (img.complete && img.naturalHeight !== 0) {
      setImageLoaded(true);
    }
  };

  return (
    <div className="card border-info-content shadow-2xl hover:shadow-3xl hover:border-primary">
      <a href={`/shop/${product.printful_id}`}>
        <figure className="relative">
          {!imageLoaded && <div className="skeleton w-full absolute inset-0" />}
          <img
            loading="lazy"
            src={currentThumbnail}
            alt={product.name}
            onLoad={(_e) => {
              setImageLoaded(true);
            }}
            onError={() => setImageLoaded(true)}
            ref={(img) => {
              if (img) handleImageLoad(img);
            }}
            className={`transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        </figure>
      </a>
      <div className="card-body">
        <div className="flex justify-between items-start">
          <h2 className="card-title">{product.name}</h2>
          <div className="text-xl font-bold text-green-500">
            ${product.price.toFixed(2)}
          </div>
        </div>
        <p>{product.description}</p>
        {product.colors && product.colors.length > 0 && (
          <div className="flex gap-2 my-2">
            {product.colors.map((color) => (
              <div
                key={color.hex}
                className="w-6 h-6 rounded-full cursor-pointer border-2 border-gray-300 hover:border-gray-100"
                style={{ backgroundColor: color.hex }}
                onMouseEnter={() => {
                  setCurrentThumbnail(color.thumbnail_url);
                  setImageLoaded(false); // Reset loading state for new image
                }}
                onMouseLeave={() => {
                  setCurrentThumbnail(defaultThumbnail);
                  setImageLoaded(false); // Reset loading state for default image
                }}
              >
              </div>
            ))}
          </div>
        )}
        <div className="card-actions flex justify-start">
          <a href={`/shop/${product.printful_id}`}>
            <button type="button" className="btn btn-primary">
              See Options
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
