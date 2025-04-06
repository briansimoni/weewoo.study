import { Head } from "$fresh/runtime.ts";
import { PageProps } from "$fresh/server.ts";
import CartClearer from "../../islands/CartClearer.tsx";

export default function CheckoutSuccessPage(props: PageProps) {
  return (
    <>
      <Head>
        <title>Order Confirmed</title>
      </Head>
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center py-12">
          <div className="mb-6 text-success text-6xl">✓</div>
          <h1 className="text-3xl font-bold mb-4">Thank You for Your Order!</h1>
          <p className="mb-8">
            Your order has been confirmed and will be shipped soon.
          </p>
          <p className="mb-4">
            Order ID:{" "}
            {props.url.searchParams.get("session_id")?.substring(0, 8)}
          </p>
          <CartClearer />
          <a href="/shop" className="btn btn-primary">Continue Shopping</a>
        </div>
      </div>
    </>
  );
}
