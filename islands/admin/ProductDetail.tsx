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
  
  // Color management states
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<{
    name: string;
    hex: string;
    thumbnail_url: string;
  } | null>(null);
  const [colorIndex, setColorIndex] = useState<number>(-1);
  const [variantColorAssignments, setVariantColorAssignments] = useState<Record<string, string>>({});
  const [editingVariants, setEditingVariants] = useState<Record<string, boolean>>({});
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({});
  const [variantImages, setVariantImages] = useState<Record<string, string>>({});
  const [savingVariants, setSavingVariants] = useState<Record<string, boolean>>({});
  
  // Helper function to get variant images (since PrintfulProductVariant doesn't have an images property)
  const getVariantImages = (variantId: string): string[] => {
    // First check if we have edited images for this variant
    if (variantImages[variantId]) {
      return variantImages[variantId].split('\n').filter(url => url.trim() !== '');
    }
    // Otherwise return an empty array as the default
    return [];
  };

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

      {/* Color Management Section */}
      {storedProduct && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Color Definitions</h2>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Define colors with name, hex value, and thumbnail URL to make products available for purchase.
              Colors must be defined before a product can be activated.
            </p>
          </div>

          {/* Color Definitions Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 mb-4">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preview</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hex Value</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thumbnail</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {storedProduct.colors && storedProduct.colors.length > 0 ? (
                  storedProduct.colors.map((color, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{color.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div 
                          className="w-8 h-8 rounded-full" 
                          style={{
                            backgroundColor: color.hex,
                            border: "1px solid #e5e7eb"
                          }}
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{color.hex}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {color.thumbnail_url ? (
                          <a href={color.thumbnail_url} target="_blank" className="text-blue-500 hover:underline">View</a>
                        ) : (
                          <span className="text-red-500">Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingColor(color);
                            setColorIndex(index);
                            setIsColorDialogOpen(true);
                          }}
                          className="text-blue-500 hover:text-blue-700 mr-2"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                      No color definitions yet. Add some to make this product available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Undefined Colors Section */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Undefined Printful Colors</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.keys(variantsByColor).filter(colorName => {
                // Check if this color is already defined in storedProduct.colors
                return !storedProduct.colors?.some(c => c.name.toLowerCase() === colorName.toLowerCase());
              }).map((colorName) => {
                const variants = variantsByColor[colorName];
                const colorValue = variants[0].options.find((opt) => opt.id === "color")?.value || "#CCCCCC";
                const variantImage = variants[0].files.find(file => file.type === "preview")?.preview_url || "";
                
                return (
                  <div
                    key={colorName}
                    className="p-2 border border-gray-300 rounded-md flex items-center gap-2 hover:bg-gray-50"
                  >
                    <div
                      className="w-6 h-6 rounded-full cursor-pointer"
                      style={{
                        backgroundColor: colorValue,
                        border: "1px solid #e5e7eb",
                      }}
                      onClick={() => {
                        setEditingColor({
                          name: colorName,
                          hex: colorValue,
                          thumbnail_url: variantImage
                        });
                        setColorIndex(-1);
                        setIsColorDialogOpen(true);
                      }}
                      title="Click to edit with this color's preview image"
                    />
                    <span className="text-sm">{colorName}</span>
                    <span className="text-xs text-red-500 mr-2">Undefined</span>
                    <button
                      type="button"
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={() => {
                        setEditingColor({
                          name: colorName,
                          hex: colorValue,
                          thumbnail_url: ""
                        });
                        setColorIndex(-1);
                        setIsColorDialogOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
            {Object.keys(variantsByColor).filter(colorName => {
              return !storedProduct.colors?.some(c => c.name.toLowerCase() === colorName.toLowerCase());
            }).length === 0 && (
              <p className="text-sm text-green-600">All Printful colors have been defined!</p>
            )}
          </div>
        </div>
      )}



      {/* Variant Details Table */}
      <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">All Variants</h2>
        </div>
        
        {storedProduct && (!storedProduct.colors || storedProduct.colors.length === 0) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You need to define colors before you can assign them to variants.
                </p>
              </div>
            </div>
          </div>
        )}
        
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
                Printful Color
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Color
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Images
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sync_variants.map((variant) => {
              // Find if there's a matching color in the defined colors
              const matchingDefinedColor = storedProduct?.colors?.find(c => 
                c.name.toLowerCase() === variant.color.toLowerCase()
              );
              
              return (
                <tr
                  key={variant.id}
                  className={`hover:bg-gray-50 ${
                    selectedVariant?.id === variant.id ? "bg-blue-50" : ""
                  }`}
                  onClick={(e) => {
                    // Don't trigger row click when clicking on the select dropdown
                    if ((e.target as HTMLElement).tagName !== 'SELECT') {
                      setSelectedVariant(variant);
                    }
                  }}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                    {storedProduct && storedProduct.colors && storedProduct.colors.length > 0 ? (
                      <select
                        className="border border-gray-300 rounded-md text-sm p-1 w-full max-w-[150px]"
                        value={variantColorAssignments[variant.id] || (matchingDefinedColor ? matchingDefinedColor.name : '')}
                        onChange={(e) => {
                          const newAssignments = {...variantColorAssignments};
                          newAssignments[variant.id] = e.currentTarget.value;
                          setVariantColorAssignments(newAssignments);
                        }}
                      >
                        <option value="">-- Select Color --</option>
                        {storedProduct.colors.map((color, idx) => (
                          <option key={idx} value={color.name}>{color.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-red-500 text-xs">No defined colors</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                    {editingVariants[variant.id.toString()] ? (
                      <input
                        type="text"
                        className="border border-gray-300 rounded-md text-sm p-1 w-full max-w-[100px]"
                        value={variantPrices[variant.id.toString()] || variant.retail_price}
                        onChange={(e) => {
                          const newPrices = {...variantPrices};
                          newPrices[variant.id.toString()] = e.currentTarget.value;
                          setVariantPrices(newPrices);
                        }}
                      />
                    ) : (
                      <span>{variant.retail_price} {variant.currency}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                    {editingVariants[variant.id.toString()] ? (
                      <textarea
                        className="border border-gray-300 rounded-md text-sm p-1 w-full max-w-[200px] h-20"
                        value={variantImages[variant.id.toString()] || ''}
                        placeholder="One image URL per line"
                        onChange={(e) => {
                          const newImages = {...variantImages};
                          newImages[variant.id.toString()] = e.currentTarget.value;
                          setVariantImages(newImages);
                        }}
                      />
                    ) : (
                      <div>
                        {getVariantImages(variant.id.toString()).length > 0 ? (
                          <span>{getVariantImages(variant.id.toString()).length} image(s)</span>
                        ) : (
                          <span className="text-red-500 text-xs">No images</span>
                        )}
                      </div>
                    )}
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                    {editingVariants[variant.id.toString()] ? (
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 focus:outline-none"
                          onClick={async () => {
                            if (!storedProduct) return;
                            
                            // Set saving state
                            const newSavingState = {...savingVariants};
                            newSavingState[variant.id.toString()] = true;
                            setSavingVariants(newSavingState);
                            
                            try {
                              // Prepare the variant data
                              const selectedColorName = variantColorAssignments[variant.id.toString()] || 
                                (storedProduct.colors?.find(c => c.name.toLowerCase() === variant.color.toLowerCase())?.name || '');
                              
                              const selectedColor = storedProduct.colors?.find(c => c.name === selectedColorName);
                              
                              if (!selectedColor) {
                                alert("Please select a color for this variant.");
                                return;
                              }
                              
                              // Parse price
                              const price = parseFloat(variantPrices[variant.id.toString()] || variant.retail_price);
                              if (isNaN(price)) {
                                alert("Please enter a valid price.");
                                return;
                              }
                              
                              // Parse images
                              const images = getVariantImages(variant.id.toString());
                              
                              // Create variant data
                              const variantData = {
                                variant_id: variant.id,
                                printful_product_id: storedProduct.printful_id,
                                product_template_id: storedProduct.product_template_id,
                                price,
                                color: {
                                  name: selectedColor.name,
                                  hex: selectedColor.hex
                                },
                                size: variant.size,
                                images,
                                stripe_product_id: '', // This would need to be set or generated
                                payment_page: '' // This would need to be set or generated
                              };
                              
                              console.log("Saving variant:", variantData);
                              
                              // Call the API to update the variant
                              const response = await fetch(`/api/admin/product/${storedProduct.printful_id}/variant/${variant.id}`, {
                                method: "PUT",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify(variantData),
                              });
                              
                              const result = await response.json();
                              
                              if (result.success) {
                                alert("Variant updated successfully!");
                                // Reset editing state
                                const newEditingState = {...editingVariants};
                                newEditingState[variant.id.toString()] = false;
                                setEditingVariants(newEditingState);
                              } else {
                                alert(`Error: ${result.error || "Failed to update variant"}`);
                              }
                            } catch (error) {
                              console.error("Error saving variant:", error);
                              alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
                            } finally {
                              // Reset saving state
                              const newSavingState = {...savingVariants};
                              newSavingState[variant.id.toString()] = false;
                              setSavingVariants(newSavingState);
                            }
                          }}
                          disabled={savingVariants[variant.id]}
                        >
                          {savingVariants[variant.id.toString()] ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 focus:outline-none"
                          onClick={() => {
                            const newEditingState = {...editingVariants};
                            newEditingState[variant.id.toString()] = false;
                            setEditingVariants(newEditingState);
                          }}
                          disabled={savingVariants[variant.id.toString()]}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 focus:outline-none"
                        onClick={() => {
                          // Convert variant.id to string to use as object key
                          const variantIdStr = variant.id.toString();
                          
                          // Initialize the editing state for this variant
                          const newEditingState = {...editingVariants};
                          newEditingState[variantIdStr] = true;
                          setEditingVariants(newEditingState);
                          
                          // Initialize price if not already set
                          if (!variantPrices[variantIdStr]) {
                            const newPrices = {...variantPrices};
                            newPrices[variantIdStr] = variant.retail_price.toString();
                            setVariantPrices(newPrices);
                          }
                          
                          // Initialize images if not already set
                          if (!variantImages[variantIdStr]) {
                            const newImages = {...variantImages};
                            newImages[variantIdStr] = '';
                            setVariantImages(newImages);
                          }
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Color Definition Dialog */}
      {isColorDialogOpen && editingColor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">
                {colorIndex === -1 ? "Add New Color" : "Edit Color"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Define color properties to match the Product interface requirements.
              </p>
            </div>
            
            <div className="p-4 flex-grow overflow-auto">
              <form className="space-y-4">
                <div>
                  <label htmlFor="colorName" className="block text-sm font-medium text-gray-700 mb-1">
                    Color Name
                  </label>
                  <input
                    type="text"
                    id="colorName"
                    value={editingColor.name}
                    onChange={(e) => setEditingColor({...editingColor, name: e.currentTarget.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Black, White, Red"
                  />
                </div>
                
                <div>
                  <label htmlFor="colorHex" className="block text-sm font-medium text-gray-700 mb-1">
                    Hex Color Value
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      id="colorHex"
                      value={editingColor.hex}
                      onChange={(e) => setEditingColor({...editingColor, hex: e.currentTarget.value})}
                      className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., #000000"
                    />
                    <div 
                      className="w-10 h-10 rounded-md border border-gray-300" 
                      style={{backgroundColor: editingColor.hex || "#FFFFFF"}}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-700 mb-1">
                    Thumbnail URL
                  </label>
                  <input
                    type="text"
                    id="thumbnailUrl"
                    value={editingColor.thumbnail_url}
                    onChange={(e) => setEditingColor({...editingColor, thumbnail_url: e.currentTarget.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                </div>
                
                {editingColor.thumbnail_url && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700 mb-1">Thumbnail Preview:</p>
                    <div className="border border-gray-300 rounded-md p-2 flex justify-center">
                      <img 
                        src={editingColor.thumbnail_url} 
                        alt="Thumbnail preview" 
                        className="max-h-32 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                          (e.target as HTMLImageElement).classList.add("p-4");
                        }}
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            <div className="p-4 border-t flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsColorDialogOpen(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!storedProduct) return;
                  if (!editingColor.name || !editingColor.hex) {
                    alert("Color name and hex value are required!");
                    return;
                  }
                  
                  // Create a copy of the current colors array or initialize a new one
                  const updatedColors = [...(storedProduct.colors || [])];
                  
                  if (colorIndex >= 0) {
                    // Update existing color
                    updatedColors[colorIndex] = editingColor;
                  } else {
                    // Add new color
                    updatedColors.push(editingColor);
                  }
                  
                  // Update the product with the new colors array
                  const result = await updateProduct({
                    printful_id: storedProduct.printful_id,
                    colors: updatedColors
                  });
                  
                  if (result && result.success) {
                    alert("Color definition has been saved successfully!");
                    setIsColorDialogOpen(false);
                    // Reload the page to show the updated information
                    globalThis.location.reload();
                  } else if (result) {
                    alert(`Error: ${result.error}`);
                  }
                }}
                disabled={!editingColor.name || !editingColor.hex}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Save Color
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
