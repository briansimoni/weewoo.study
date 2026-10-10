import CartPageIsland from "../islands/CartPageIsland.tsx";
import { Page } from "../components/ui/Page.tsx";

export default function CartPage() {
  return (
    <Page title="Shopping Cart" heading="Shopping Cart">
      <CartPageIsland />
    </Page>
  );
}
