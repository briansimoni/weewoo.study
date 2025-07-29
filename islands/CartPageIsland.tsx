import {
  cartItems,
  getCartTotal,
  removeFromCart,
  updateCartItemQuantity,
} from "../lib/cart_store.ts";
import { useSignal } from "preact/signals";
import { useEffect, useState } from "preact/hooks";

export default function CartPageIsland() {
  const cart = useSignal(cartItems.value);
  const total = useSignal(getCartTotal());
  console.log(cart);

  // Update local state when cart changes
  useEffect(() => {
    const updateCart = () => {
      cart.value = [...cartItems.value];
      total.value = getCartTotal();
    };

    const unsubscribe = cartItems.subscribe(updateCart);

    // Initial update
    updateCart();

    return () => unsubscribe();
  }, []);

  const handleQuantityChange = (variantId: string, newQuantity: number) => {
    updateCartItemQuantity(variantId, newQuantity);
  };

  const handleRemoveItem = (variantId: string) => {
    removeFromCart(variantId);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const handleCheckout = async () => {
    try {
      // Show loading state
      setIsLoading(true);

      // Send cart items to the checkout API
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cartItems: cart.value }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe checkout
      if (data.url) {
        globalThis.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      // Show error message to user
      setCheckoutError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (cart.value.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl mb-4">Your cart is empty</h2>
        <a href="/shop" className="btn btn-primary">Continue Shopping</a>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Product</th>
              <th>Name/Size</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cart.value.map((item) => (
              <tr key={item.variant.variant_id}>
                <td className="min-w-[200px]">
                  <div className="flex items-center space-x-3">
                    <div className="avatar">
                      <div className="mask mask-squircle w-16 h-16">
                        <img
                          src={item.variant.images[0] || ""}
                          alt={`${
                            item.variant.color?.name ?? item.variant.name
                          } ${item.variant.size}`}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold">
                        {item.variant.printful_product_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {item.variant.color && (
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: item.variant.color?.hex }}
                      >
                      </div>
                    )}

                    <span>
                      {item.variant.color?.name.replace(/_/g, " ") ??
                        item.variant.name}
                    </span>
                    <span className="mx-1">/</span>
                    <span>{item.variant.size}</span>
                  </div>
                </td>
                <td>${item.variant.price.toFixed(2)}</td>
                <td>
                  <div className="flex items-center">
                    <button
                      type="button"
                      className="btn btn-xs btn-square"
                      onClick={() =>
                        handleQuantityChange(
                          item.variant.variant_id,
                          item.quantity - 1,
                        )}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="mx-2">{item.quantity}</span>
                    <button
                      type="button"
                      className="btn btn-xs btn-square"
                      onClick={() =>
                        handleQuantityChange(
                          item.variant.variant_id,
                          item.quantity + 1,
                        )}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td>${(item.variant.price * item.quantity).toFixed(2)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleRemoveItem(item.variant.variant_id)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-8">
        <a href="/shop" className="btn btn-outline mb-4 md:mb-0">
          Continue Shopping
        </a>

        <div className="card bg-base-200 p-4 w-full md:w-auto">
          <div className="flex justify-between mb-2">
            <span className="font-semibold">Subtotal:</span>
            <span>${total.value.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-4">
            <span className="font-semibold">Shipping:</span>
            <span>Free!</span>
          </div>
          <div className="divider my-2"></div>
          <div className="flex justify-between mb-4">
            <span className="font-bold text-lg">Total:</span>
            <span className="font-bold text-lg">${total.value.toFixed(2)}</span>
          </div>
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={handleCheckout}
            disabled={isLoading}
          >
            {isLoading
              ? (
                <>
                  <span className="loading loading-spinner loading-xs mr-2">
                  </span>
                  Processing...
                </>
              )
              : (
                "Proceed to Checkout"
              )}
          </button>

          {checkoutError && (
            <div className="text-error mt-2 text-sm">
              {checkoutError}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
