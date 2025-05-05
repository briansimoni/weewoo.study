import { clearCart } from "../lib/cart_store.ts";
import { useEffect, useState } from "preact/hooks";

export default function CartClearer() {
  const [_cartCleared, setCartCleared] = useState(false);

  // Clear the cart on successful checkout
  useEffect(() => {
    // Clear the cart
    clearCart();
    // Set state to indicate cart was cleared
    setCartCleared(true);
  }, []);

  return null;
}
