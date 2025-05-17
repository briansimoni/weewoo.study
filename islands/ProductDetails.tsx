import { useState } from "preact/hooks";
import { Product, ProductVariant } from "../lib/product_store.ts";
import { addToCart } from "../lib/cart_store.ts";

interface ProductDetailsProps {
  product: Product;
  variants: ProductVariant[];
}

export default function ProductDetails(
  { product, variants }: ProductDetailsProps,
) {
  const [selectedColor, setSelectedColor] = useState(variants[0].color);
  const [selectedSize, setSelectedSize] = useState("M");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get unique sizes from variants
  const sizes = Array.from(new Set(variants.map((v) => v.size)));
  const colors = Array.from(new Set(variants.map((v) => v.color.name)));

  // Get variant images and details for the selected color and size
  const colorVariant = variants.find((v) =>
    v.color.name.toLowerCase() === selectedColor.name.toLowerCase()
  );
  const images = colorVariant?.images || [];

  // Get the selected variant based on color and size
  const selectedVariant = variants.find((v) =>
    v.color.name.toLowerCase() === selectedColor.name.toLowerCase() &&
    v.size === selectedSize
  );

  const handleAddToCart = () => {
    const variant = variants.find((v) =>
      v.color.name.toLowerCase() === selectedColor.name.toLowerCase() &&
      v.size === selectedSize
    );
    if (variant) {
      addToCart(variant);
      // Show a toast or notification that item was added
      const toast = document.getElementById("cart-toast");
      if (toast) {
        toast.classList.remove("hidden");
        setTimeout(() => {
          toast.classList.add("hidden");
        }, 3000);
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 p-4">
      {/* Left side - Image gallery */}
      <div className="lg:w-2/3">
        <div className="relative aspect-square mb-4">
          <img
            src={images[currentImageIndex] || product.thumbnail_url}
            alt={`${product.name} in ${selectedColor.name}`}
            className="w-full h-full object-cover rounded-lg"
          />
          {images.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setCurrentImageIndex((
                    prev,
                  ) => (prev > 0 ? prev - 1 : images.length - 1))}
                className="btn btn-circle btn-ghost bg-base-100 bg-opacity-50"
              >
                ❮
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentImageIndex((
                    prev,
                  ) => (prev < images.length - 1 ? prev + 1 : 0))}
                className="btn btn-circle btn-ghost bg-base-100 bg-opacity-50"
              >
                ❯
              </button>
            </div>
          )}
        </div>
        {/* Thumbnail gallery */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setCurrentImageIndex(index)}
                className={`w-20 h-20 rounded-md overflow-hidden flex-shrink-0 border-2 ${
                  currentImageIndex === index
                    ? "border-primary"
                    : "border-transparent"
                }`}
              >
                <img
                  src={image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right side - Product details and options */}
      <div className="lg:w-1/3">
        <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
        <p className="text-xl mb-6">
          ${selectedVariant
            ? selectedVariant.price.toFixed(2)
            : product.price.toFixed(2)}
        </p>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Description</h3>
          <p className="text-gray-600">{product.description}</p>
        </div>

        {/* Color selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">
            Color: {selectedColor.name.replace(/_/g, " ")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {colors.map((colorName) => {
              const variantColor = variants.find((v) =>
                v.color.name === colorName
              )?.color;
              if (!variantColor) return null;
              return (
                <button
                  key={colorName}
                  type="button"
                  onClick={() => {
                    setSelectedColor(variantColor);
                    setCurrentImageIndex(0);
                  }}
                  className={`w-10 h-10 rounded-full border-2 ${
                    selectedColor.name === colorName
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  style={{ backgroundColor: variantColor.hex }}
                  title={colorName.replace(/_/g, " ")}
                />
              );
            })}
          </div>
        </div>

        {/* Size selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Size</h3>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`btn ${
                  selectedSize === size ? "btn-primary" : "btn-outline"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Add to Cart button */}
        <div className="flex">
          <button
            type="button"
            onClick={handleAddToCart}
            className="btn btn-primary w-full"
          >
            Add to Cart
          </button>
        </div>

        {/* Toast notification */}
        <div id="cart-toast" className="toast toast-top toast-end hidden">
          <div className="alert alert-success">
            <div className="flex flex-col gap-1">
              <span>Added to cart!</span>
              <a
                href="/cart"
                className="text-sm underline hover:text-white transition-colors"
              >
                Go to cart
              </a>
            </div>
          </div>
        </div>

        {/* Additional information */}
        <div className="mt-8 space-y-4">
          <details className="collapse bg-base-200">
            <summary className="collapse-title text-lg font-semibold">
              Shipping Information
            </summary>
            <div className="collapse-content">
              <p>Estimated delivery: 7-14 business days</p>
            </div>
          </details>

          {product.size_guide && (
            <details className="collapse bg-base-200">
              <summary className="collapse-title text-lg font-semibold">
                Size Guide
              </summary>
              <div className="collapse-content">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Size</th>
                      {product.size_guide.sizes[0]?.dimensions.map((dim) => (
                        <th key={dim.name}>{dim.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {product.size_guide.sizes.map((size) => (
                      <tr key={size.name}>
                        <td>{size.name}</td>
                        {size.dimensions.map((dim) => (
                          <td key={dim.name}>{dim.value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          <details className="collapse bg-base-200">
            <summary className="collapse-title text-lg font-semibold">
              Return Policy
            </summary>
            <div className="collapse-content">
              <p>
                Contact me and I'll work with you. The return policy is in
                development, but I want my early adopter customers to be happy.
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
