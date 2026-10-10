import { PageProps } from "fresh";
import CartClearer from "../../islands/CartClearer.tsx";
import { Page } from "../../components/ui/Page.tsx";

export default function CheckoutSuccessPage(props: PageProps) {
  return (
    <Page title="Order Confirmed">
      <div className="text-center py-12">
        <div className="mb-6 text-success text-6xl">✓</div>
        <h1 className="text-3xl font-bold mb-4">Thank You for Your Order!</h1>
        <p className="mb-8">
          Your order has been confirmed and will be shipped soon.
        </p>
        <div className="mb-4 max-w-md mx-auto">
          <p className="font-semibold mb-1">Order Reference:</p>
          <p className="break-all bg-base-100 p-2 rounded-md">
            {props.url.searchParams.get("session_id")}
          </p>
        </div>
        <CartClearer />
        <a href="/shop" className="btn btn-primary">Continue Shopping</a>
      </div>
    </Page>
  );
}
