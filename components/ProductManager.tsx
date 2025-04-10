import { Product } from "../lib/product_store.ts";
import { PrintfulProduct } from "../lib/client/printful.ts";

interface ProductManagerProps {
  appProducts: Product[];
  printfulProducts: PrintfulProduct[];
}

export default function ProductManager(
  { appProducts, printfulProducts }: ProductManagerProps,
) {
  // Filter out Printful products that are already in our database
  const availablePrintfulProducts = printfulProducts.filter(
    (printfulProduct) =>
      !appProducts.some(
        (appProduct) =>
          appProduct.printful_id === printfulProduct.id.toString(),
      ),
  );

  return (
    <div>
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">
          Your Products ({appProducts.length})
        </h2>
        {appProducts.length === 0
          ? <p className="text-gray-500">No products in your database yet.</p>
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {appProducts.map((product) => (
                <div
                  key={product.printful_id}
                  className="border rounded-lg overflow-hidden shadow-md"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src={product.thumbnail_url}
                      alt={product.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">
                      {product.name}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      ${product.price.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500 mb-3">
                      ID: {product.printful_id}
                    </p>
                    {product.colors && product.colors.length > 0 && (
                      <div className="flex space-x-2 mb-3">
                        {product.colors.map((color) => (
                          <div
                            key={color.name}
                            className="w-6 h-6 rounded-full border border-gray-300"
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          product.active
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {product.active ? "Active" : "Inactive"}
                      </span>
                      <a
                        href={`/admin/product-manager/product/${product.printful_id}`}
                        className="inline-block bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors"
                      >
                        View Details
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">
          Available Printful Products ({availablePrintfulProducts.length})
        </h2>
        {availablePrintfulProducts.length === 0
          ? (
            <p className="text-gray-500">
              No additional Printful products available.
            </p>
          )
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availablePrintfulProducts.map((product) => (
                <div
                  key={product.id}
                  className="border rounded-lg overflow-hidden shadow-md"
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src={product.thumbnail_url}
                      alt={product.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">
                      ID: {product.id}
                    </p>
                    <p className="text-sm text-gray-500 mb-3">
                      Variants: {product.variants}
                    </p>
                    <a
                      href={`/admin/product-manager/product/${product.id}`}
                      className="inline-block bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors"
                    >
                      View Details
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
