import { Filter, X } from "lucide-preact";
import {
  Category,
  Product,
  productCategories,
} from "../../lib/product_store.ts";
import ProductCard from "./ProductCard.tsx";
import { useState } from "preact/hooks";

// Category metadata for better display
const categoryInfo = {
  apparel: { icon: "👕", label: "Apparel" },
  hats: { icon: "🧢", label: "Hats & Caps" },
  swimwear: { icon: "🏊‍♀️", label: "Swimwear" },
  swag: { icon: "🎁", label: "Swag & Accessories" },
  kids: { icon: "🧸", label: "Kids Collection" },
};

function createAllFilters(show: boolean) {
  const filters = productCategories.reduce<Record<Category, boolean>>(
    (filter, category) => {
      filter[category] = show;
      return filter;
    },
    {} as Record<Category, boolean>,
  );
  return filters;
}
const initialFilters = createAllFilters(true);

export default function Catalog(props: { products: Product[] }) {
  const { products } = props;

  const [allCategories, setAllCategories] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  const productsByCategory = Object.groupBy(products, (product) => {
    return product.category;
  });

  return (
    <div class="drawer">
      <input
        id="filter-drawer"
        type="checkbox"
        class="drawer-toggle"
      />

      {/* Main content */}
      <div class="drawer-content">
        {/* Products content */}
        <div class="p-4 mr-10 ml-10 lg:mr-30 lg:ml-30 xl:ml-50 xl:mr-50">
          {/* Header with filter button */}
          <div class="bg-base-100 border-b border-base-300 mb-8 p-4">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="text-center sm:text-left">
                <h1 class="text-2xl font-bold text-base-content">
                  Shop Collection
                </h1>
                <p class="text-sm text-base-content/60">
                  {products.length} Products Available
                </p>
              </div>
              <div class="flex justify-center sm:justify-end">
                <label
                  for="filter-drawer"
                  class="btn btn-primary drawer-button"
                >
                  <Filter />
                  <span class="hidden sm:inline">Filter Products</span>
                  <span class="sm:hidden">Filter</span>
                </label>
              </div>
            </div>
          </div>
          {productCategories.map((category) => {
            const categoryProducts = productsByCategory[category];
            if (!categoryProducts) return null;
            if (!filters[category]) return null;

            return (
              <section key={category} class="mb-12" data-category={category}>
                <h2 class="text-3xl font-bold mb-6 capitalize text-base-content border-b-2 border-base-300 pb-2">
                  <span class="mr-3">{categoryInfo[category].icon}</span>
                  {categoryInfo[category].label}
                  <span class="ml-3 text-sm font-normal text-base-content/60">
                    ({categoryProducts.length} items)
                  </span>
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {categoryProducts.map((product) => (
                    <ProductCard key={product.printful_id} product={product} />
                  ))}
                </div>
              </section>
            );
          })}

          {Object.values(filters).every((category) => category === false) &&
            (
              <div class="text-center">
                No products found. Try adjusting the filters.
              </div>
            )}
        </div>
      </div>

      {/* Drawer sidebar */}
      <div class="drawer-side">
        <label
          for="filter-drawer"
          aria-label="close sidebar"
          class="drawer-overlay"
        >
        </label>
        <aside class="min-h-full w-80 bg-base-200 p-4">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-base-content">Filter Products</h2>
            <label for="filter-drawer" class="btn btn-sm btn-circle btn-ghost">
              <X />
            </label>
          </div>

          {/* Category filters */}
          <div class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold text-base-content mb-3">
                Categories
              </h3>
              <div class="form-control">
                <label class="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-primary"
                    id="filter-all"
                    checked={allCategories}
                    onChange={() => {
                      const showAll = !allCategories;
                      setAllCategories(showAll);
                      setFilters(createAllFilters(showAll));
                    }}
                  />
                  <span class="label-text text-base">All Categories</span>
                </label>
              </div>
              <div class="divider my-2"></div>
              {productCategories.map((category) => {
                const count = productsByCategory[category]?.length || 0;
                return (
                  <div key={category} class="form-control">
                    <label class="label cursor-pointer justify-start gap-3">
                      <input
                        type="checkbox"
                        class="checkbox checkbox-primary category-filter"
                        data-category={category}
                        checked={filters[category]}
                        onChange={(e) => {
                          const category = e.currentTarget.dataset
                            .category as Category;
                          setFilters({
                            ...filters,
                            [category]: !filters[category],
                          });
                        }}
                      />
                      <span class="label-text text-base flex items-center gap-2">
                        <span>{categoryInfo[category].icon}</span>
                        <span>{categoryInfo[category].label}</span>
                        <span class="badge badge-sm badge-outline">
                          {count}
                        </span>
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => {
                const drawer = document.getElementById(
                  "filter-drawer",
                ) as HTMLInputElement;
                if (!drawer) return;
                drawer.checked = !drawer.checked;
              }}
              type="button"
              class="btn btn-primary"
            >
              Done
            </button>

            <div class="divider"></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
