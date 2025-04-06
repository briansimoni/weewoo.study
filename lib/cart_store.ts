import { ProductVariant } from "./product_store.ts";
import { signal } from "preact/signals";

export interface CartItem {
  variant: ProductVariant;
  quantity: number;
}

// Create a cart signal that persists across page loads using localStorage
const loadInitialCart = (): CartItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const savedCart = localStorage.getItem("cart");
    return savedCart ? JSON.parse(savedCart) : [];
  } catch (e) {
    console.error("Failed to load cart from localStorage:", e);
    return [];
  }
};

export const cartItems = signal<CartItem[]>(loadInitialCart());

// Save cart to localStorage whenever it changes
const saveCart = () => {
  if (typeof window === "undefined") return;
  localStorage.setItem("cart", JSON.stringify(cartItems.value));
};

export const addToCart = (variant: ProductVariant, quantity = 1) => {
  const existingItemIndex = cartItems.value.findIndex(
    (item: CartItem) => item.variant.variant_id === variant.variant_id,
  );

  if (existingItemIndex >= 0) {
    // If item already exists, update quantity
    const updatedCart = [...cartItems.value];
    updatedCart[existingItemIndex].quantity += quantity;
    cartItems.value = updatedCart;
  } else {
    // Otherwise add new item
    cartItems.value = [...cartItems.value, { variant, quantity }];
  }

  saveCart();
};

export const removeFromCart = (variantId: string) => {
  cartItems.value = cartItems.value.filter(
    (item) => item.variant.variant_id !== variantId,
  );

  saveCart();
};

export const updateCartItemQuantity = (variantId: string, quantity: number) => {
  if (quantity <= 0) {
    removeFromCart(variantId);
    return;
  }

  const updatedCart = cartItems.value.map((item: CartItem) =>
    item.variant.variant_id === variantId ? { ...item, quantity } : item
  );

  cartItems.value = updatedCart;
  saveCart();
};

export const getCartTotal = (): number => {
  return cartItems.value.reduce(
    (total, item) => total + (item.variant.price * item.quantity),
    0,
  );
};

// Clear the cart (used after successful checkout)
export const clearCart = (): void => {
  cartItems.value = [];
  saveCart();
};

export const getCartItemCount = (): number => {
  return cartItems.value.reduce(
    (count: number, item: CartItem) => count + item.quantity,
    0,
  );
};
