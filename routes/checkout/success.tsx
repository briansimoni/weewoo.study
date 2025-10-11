import { Head } from "fresh/runtime";
import { PageProps } from "fresh";
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
          <div className="mb-4 max-w-md mx-auto">
            <p className="font-semibold mb-1">Order Reference:</p>
            <p className="break-all bg-base-200 p-2 rounded-md">
              {props.url.searchParams.get("session_id")}
            </p>
          </div>
          <CartClearer />
          <a href="/shop" className="btn btn-primary">Continue Shopping</a>
        </div>
      </div>
    </>
  );
}
