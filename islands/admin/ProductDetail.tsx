import { useState } from "preact/hooks";
import { PrintfulProductVariant } from "../../lib/client/printful.ts";
import { Product } from "../../lib/product_store.ts";
import { JSX } from "preact";

interface ProductDetailProps {
  productDetails: {
    sync_product: {
      id: number;
      external_id: string;
      name: string;
      variants: number;
      synced: number;
      thumbnail_url: string;
    };
    sync_variants: PrintfulProductVariant[];
  };
  storedProduct?: Product | null;
}

export default function ProductDetail(
  { productDetails, storedProduct }: ProductDetailProps,
) {
  const { sync_product, sync_variants } = productDetails;
  const [selectedVariant, setSelectedVariant] = useState<
    PrintfulProductVariant | null
  >(
    sync_variants.length > 0 ? sync_variants[0] : null,
  );
  
  const [isEditing, setIsEditing] = useState(false);
  const [productJson, setProductJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Group variants by color
  const variantsByColor = sync_variants.reduce((acc, variant) => {
    const color = variant.color;
    if (!acc[color]) {
      acc[color] = [];
    }
    acc[color].push(variant);
    return acc;
  }, {} as Record<string, PrintfulProductVariant[]>);

  const openJsonEditor = () => {
    if (!storedProduct) return;
    
    // Create a formatted JSON string with the product data
    // Exclude fields that shouldn't be editable
    const editableProduct = {
      name: storedProduct.name,
      description: storedProduct.description || "",
      price: storedProduct.price,
      active: storedProduct.active,
      colors: storedProduct.colors || [],
    };
    
    setProductJson(JSON.stringify(editableProduct, null, 2));
    setJsonError("");
    setIsEditing(true);
  };
  
  const handleJsonChange = (e: JSX.TargetedEvent<HTMLTextAreaElement>) => {
    const newJson = e.currentTarget.value;
    setProductJson(newJson);
    
    // Validate JSON as user types
    try {
      JSON.parse(newJson);
      setJsonError("");
    } catch (error) {
      setJsonError("Invalid JSON format");
    }
  };
  
  const updateProduct = async (data: Partial<Product>) => {
    if (!storedProduct) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/admin/product/${storedProduct.printful_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (response.ok) {
        return { success: true, product: result.product };
      } else {
        return { success: false, error: result.error || "Failed to update product" };
      }
    } catch (error) {
      console.error("Error updating product:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to update product" 
      };
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveJson = async () => {
    if (!storedProduct || jsonError) return;
    
    try {
      const updatedProduct = JSON.parse(productJson);
      const result = await updateProduct(updatedProduct);
      
      if (result && result.success) {
        alert("Product has been updated successfully!");
        setIsEditing(false);
        // Reload the page to show the updated information
        globalThis.location.reload();
      } else if (result) {
        alert(`Error: ${result.error}`);
      }
    } catch (_error) {
      alert(`Error parsing JSON: ${_error instanceof Error ? _error.message : "Unknown error"}`);
    }
  };

  return (
    <div>
      {storedProduct ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">{storedProduct.name}</h1>
            <button
              type="button"
              onClick={openJsonEditor}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Edit Product
            </button>
          </div>
          
          {/* Product Description Display */}
          <div className="mt-4 bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-medium mb-2">Description</h2>
            <p className="text-gray-700">
              {storedProduct.description || "No description available."}
            </p>
          </div>
          
          {/* JSON Editor Dialog */}
          {isEditing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b">
                  <h2 className="text-xl font-semibold">Edit Product</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Edit the JSON below to update the product. Fields like printful_id and product_template_id are not editable.
                  </p>
                </div>
                
                <div className="p-4 flex-grow overflow-auto">
                  <textarea
                    value={productJson}
                    onChange={handleJsonChange}
                    className={`w-full h-96 font-mono text-sm p-3 border rounded-md ${jsonError ? 'border-red-500' : 'border-gray-300'}`}
                    spellcheck={false}
                  />
                  {jsonError && (
                    <p className="text-red-500 text-sm mt-2">{jsonError}</p>
                  )}
                </div>
                
                <div className="p-4 border-t flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveJson}
                    disabled={isSaving || !!jsonError}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <h1 className="text-3xl font-bold mb-6">{sync_product.name}</h1>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Product Image */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="h-80 flex items-center justify-center overflow-hidden">
            <img
              src={selectedVariant?.files.find((file) =>
                file.type === "preview"
              )?.preview_url || sync_product.thumbnail_url}
              alt={sync_product.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Product Information</h2>
            <p>
              <span className="font-medium">ID:</span> {sync_product.id}
            </p>
            <p>
              <span className="font-medium">External ID:</span>{" "}
              {sync_product.external_id || "N/A"}
            </p>
            <p>
              <span className="font-medium">Total Variants:</span>{" "}
              {sync_product.variants}
            </p>
          </div>

          {selectedVariant && (
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Selected Variant</h2>
              <p>
                <span className="font-medium">ID:</span> {selectedVariant.id}
              </p>
              <p>
                <span className="font-medium">Name:</span>{" "}
                {selectedVariant.name}
              </p>
              <p>
                <span className="font-medium">SKU:</span> {selectedVariant.sku}
              </p>
              <p>
                <span className="font-medium">Price:</span>{" "}
                {selectedVariant.retail_price} {selectedVariant.currency}
              </p>
              <p>
                <span className="font-medium">Size:</span>{" "}
                {selectedVariant.size}
              </p>
              <p>
                <span className="font-medium">Color:</span>{" "}
                {selectedVariant.color}
              </p>
              <p>
                <span className="font-medium">Availability:</span>{" "}
                {selectedVariant.availability_status}
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {!storedProduct
              ? (
                <button
                  type="button"
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/admin/product`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          printful_id: sync_product.id.toString(),
                        }),
                      });

                      const result = await response.json();

                      if (response.ok) {
                        alert(
                          `Product "${result.product.name}" has been imported successfully! The product is set as inactive by default.`,
                        );
                        // Reload the page to show the updated information
                        globalThis.location.reload();
                      } else {
                        alert(
                          `Error: ${
                            result.error || "Failed to import product"
                          }`,
                        );
                      }
                    } catch (error) {
                      console.error("Error importing product:", error);
                      alert(`Error: ${
                        error instanceof Error
                          ? error.message
                          : "Failed to import product"
                      }`);
                    }
                  }}
                >
                  Import Product
                </button>
              )
              : (
                <>
                  <button
                    type="button"
                    className={`w-full ${
                      storedProduct.active
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "bg-green-500 hover:bg-green-600"
                    } text-white py-2 px-4 rounded-md transition-colors`}
                    onClick={async () => {
                      if (
                        !confirm(
                          `Are you sure you want to ${
                            storedProduct.active ? "deactivate" : "activate"
                          } this product?`,
                        )
                      ) {
                        return;
                      }

                      try {
                        const response = await fetch(
                          `/api/admin/product/${storedProduct.printful_id}/toggle-active`,
                          {
                            method: "POST",
                          },
                        );

                        const result = await response.json();

                        if (response.ok) {
                          alert(
                            `Product "${storedProduct.name}" has been ${
                              result.product.active
                                ? "activated"
                                : "deactivated"
                            } successfully!`,
                          );
                          // Reload the page to show the updated information
                          globalThis.location.reload();
                        } else {
                          alert(
                            `Error: ${
                              result.error || "Failed to update product status"
                            }`,
                          );
                        }
                      } catch (error) {
                        console.error("Error updating product status:", error);
                        alert(`Error: ${
                          error instanceof Error
                            ? error.message
                            : "Failed to update product status"
                        }`);
                      }
                    }}
                  >
                    {storedProduct.active
                      ? "Deactivate Product"
                      : "Activate Product"}
                  </button>

                  <button
                    type="button"
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-md transition-colors"
                    onClick={async () => {
                      if (
                        !confirm(
                          "Are you sure you want to delete this product? This action cannot be undone.",
                        )
                      ) {
                        return;
                      }

                      try {
                        const response = await fetch(
                          `/api/admin/product/${storedProduct.printful_id}`,
                          {
                            method: "DELETE",
                          },
                        );

                        const result = await response.json();

                        if (response.ok) {
                          alert(
                            `Product "${storedProduct.name}" has been deleted successfully!`,
                          );
                          // Redirect back to product manager
                          globalThis.location.href = "/admin/product-manager";
                        } else {
                          alert(
                            `Error: ${
                              result.error || "Failed to delete product"
                            }`,
                          );
                        }
                      } catch (error) {
                        console.error("Error deleting product:", error);
                        alert(`Error: ${
                          error instanceof Error
                            ? error.message
                            : "Failed to delete product"
                        }`);
                      }
                    }}
                  >
                    Delete Product
                  </button>
                </>
              )}
          </div>
        </div>
      </div>

      {/* Variant Selection */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Available Variants</h2>

        {/* Color Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Colors</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(variantsByColor).map(([color, variants]) => (
              <button
                key={color}
                type="button"
                className={`p-1 rounded-md ${
                  selectedVariant?.color === color
                    ? "ring-2 ring-blue-500"
                    : "ring-1 ring-gray-300"
                }`}
                onClick={() => setSelectedVariant(variants[0])}
                title={color}
              >
                <div
                  className="w-8 h-8 rounded-full"
                  style={{
                    backgroundColor:
                      variants[0].options.find((opt) => opt.id === "color")
                        ?.value || color,
                    border: "1px solid #e5e7eb",
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Size Selection */}
        <div>
          <h3 className="text-lg font-medium mb-2">Sizes</h3>
          <div className="flex flex-wrap gap-2">
            {selectedVariant &&
              variantsByColor[selectedVariant.color].map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  className={`px-3 py-2 border rounded-md ${
                    selectedVariant.id === variant.id
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedVariant(variant)}
                >
                  {variant.size}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Variant Details Table */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4">All Variants</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Color
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sync_variants.map((variant) => (
              <tr
                key={variant.id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  selectedVariant?.id === variant.id ? "bg-blue-50" : ""
                }`}
                onClick={() => setSelectedVariant(variant)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {variant.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {variant.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {variant.size}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-2"
                      style={{
                        backgroundColor:
                          variant.options.find((opt) => opt.id === "color")
                            ?.value || variant.color,
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    {variant.color}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {variant.retail_price} {variant.currency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {variant.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      variant.availability_status === "available"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {variant.availability_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
