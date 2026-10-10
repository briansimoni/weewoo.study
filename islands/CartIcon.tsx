import { cartItems, getCartItemCount } from "../lib/cart_store.ts";
import { useEffect, useState } from "preact/hooks";
import { ShoppingCart } from "lucide-preact";
import { CountBadge } from "../components/ui/Badge.tsx";

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
    }

    // Clean up subscription
    return () => unsubscribe();
  }, []);

  return (
    <a
      href="/cart"
      class="btn btn-ghost btn-circle indicator"
      aria-label={count ? `Cart, ${count} items` : "Cart"}
    >
      {count > 0 && <CountBadge count={count} />}
      <ShoppingCart class="h-6 w-6" />
    </a>
  );
}
