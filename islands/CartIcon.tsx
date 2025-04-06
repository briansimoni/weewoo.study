import { cartItems, getCartItemCount } from "../lib/cart_store.ts";
import { useEffect, useState } from "preact/hooks";

export default function CartIcon() {
  // Use state instead of signal for better reactivity in islands
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Function to update the count
    const updateCount = () => {
      const currentCount = getCartItemCount();
      setCount(currentCount);
    };

    // Set up listener for cart changes
    const unsubscribe = cartItems.subscribe(updateCount);

    // Initial count on mount
    if (typeof window !== "undefined") {
      // Only run on client-side
      updateCount();
      console.log("Initial cart count:", getCartItemCount());
    }

    // Clean up subscription
    return () => unsubscribe();
  }, []);

  // Don't render anything if cart is empty
  if (count === 0) {
    return null;
  }

  return (
    <a href="/cart" className="btn btn-ghost btn-circle relative">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <div className="absolute -top-1 -right-1 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
        {count > 99 ? "99+" : count}
      </div>
    </a>
  );
}
