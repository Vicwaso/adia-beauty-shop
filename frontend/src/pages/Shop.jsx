import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCategories, getProducts } from "../api/client";
import CategoryRail from "../components/CategoryRail";
import ProductCard from "../components/ProductCard";

export default function Shop() {
  const [searchParams] = useSearchParams();
  const categorySlug = searchParams.get("category") || "";
  const search = searchParams.get("search") || "";

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories().then((c) => setCategories(c.results || c)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (categorySlug) params.category = categorySlug;
    if (search) params.search = search;
    getProducts(params)
      .then((p) => setProducts(p.results || p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [categorySlug, search]);

  const activeCategory = categories.find((c) => c.slug === categorySlug);

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>
        {search ? `Results for "${search}"` : activeCategory ? activeCategory.name : "All products"}
      </h1>
      <CategoryRail categories={categories} activeSlug={categorySlug} />

      {loading ? (
        <p style={{ marginTop: 24 }}>Loading…</p>
      ) : products.length === 0 ? (
        <p style={styles.empty}>
          Nothing here yet. Try a different category, or ask us on WhatsApp —
          new stock lands every week.
        </p>
      ) : (
        <div style={styles.grid}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { maxWidth: 1160, margin: "0 auto", padding: "32px 20px 64px" },
  h1: { fontSize: 26, marginBottom: 18 },
  empty: { marginTop: 32, color: "#5b5b5b", maxWidth: 420, lineHeight: 1.6 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 16,
    marginTop: 20,
  },
};
