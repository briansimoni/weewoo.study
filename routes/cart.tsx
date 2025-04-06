import { Head } from "$fresh/runtime.ts";
import CartPageIsland from "../islands/CartPageIsland.tsx";

export default function CartPage() {
  return (
    <>
      <Head>
        <title>Shopping Cart</title>
      </Head>
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        <CartPageIsland />
      </div>
    </>
  );
}
