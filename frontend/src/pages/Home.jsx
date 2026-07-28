import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCategories, getProducts } from "../api/client";
import CategoryRail from "../components/CategoryRail";
import ProductCard from "../components/ProductCard";

const TICKER_WORDS = [
  "Niacinamide", "Hyaluronic acid", "Shea butter", "Vitamin C", "SPF 50",
  "Ceramides", "Rosehip oil", "Retinol", "Aloe vera", "Squalane",
];

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCategories(), getProducts()])
      .then(([cats, prods]) => {
        setCategories(cats.results || cats);
        setProducts((prods.results || prods).slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <span style={styles.eyebrow}>Nairobi · same-day delivery</span>
          <h1 style={styles.h1}>
            Shade guides you can trust,
            <br />
            delivered before your DM even loads.
          </h1>
          <p style={styles.sub}>
            We test every product locally before we ever import it —
            so what you see on TikTok is what actually shows up at your door.
          </p>
          <div style={styles.heroActions}>
            <Link to="/shop" style={styles.ctaPrimary}>Shop the catalog</Link>
            <a
              href="https://wa.me/254700000000"
              target="_blank"
              rel="noreferrer"
              style={styles.ctaSecondary}
            >
              Ask on WhatsApp →
            </a>
          </div>
        </div>
        <div style={styles.ticker} aria-hidden="true">
          <div style={styles.tickerTrack}>
            {[...TICKER_WORDS, ...TICKER_WORDS].map((w, i) => (
              <span key={i} style={styles.tickerWord}>{w}</span>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHead}>
          <h2 style={styles.h2}>Browse by category</h2>
        </div>
        <CategoryRail categories={categories} />
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHead}>
          <h2 style={styles.h2}>This week's bestsellers</h2>
          <Link to="/shop" style={styles.seeAll}>See all →</Link>
        </div>
        {loading ? (
          <p>Loading products…</p>
        ) : (
          <div style={styles.grid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  hero: {
    background: "var(--ink-green-dark)",
    color: "#F7F3EC",
    overflow: "hidden",
  },
  heroInner: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "72px 20px 56px",
    textAlign: "center",
  },
  eyebrow: {
    fontFamily: "var(--font-mono)",
    fontSize: 12.5,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--rose-clay)",
  },
  h1: {
    fontSize: "clamp(28px, 5vw, 44px)",
    lineHeight: 1.15,
    color: "#F7F3EC",
    margin: "18px 0 20px",
  },
  sub: {
    fontSize: 16,
    lineHeight: 1.6,
    opacity: 0.85,
    maxWidth: 560,
    margin: "0 auto 28px",
  },
  heroActions: { display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" },
  ctaPrimary: {
    background: "var(--rose-clay)",
    color: "white",
    padding: "12px 24px",
    borderRadius: 999,
    fontWeight: 600,
    fontSize: 14.5,
  },
  ctaSecondary: {
    border: "1px solid rgba(247,243,236,0.4)",
    color: "#F7F3EC",
    padding: "12px 24px",
    borderRadius: 999,
    fontWeight: 500,
    fontSize: 14.5,
  },
  ticker: {
    borderTop: "1px solid rgba(247,243,236,0.1)",
    padding: "14px 0",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  tickerTrack: {
    display: "inline-flex",
    animation: "scroll-ticker 28s linear infinite",
  },
  tickerWord: {
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    opacity: 0.5,
    padding: "0 22px",
    borderRight: "1px solid rgba(247,243,236,0.15)",
  },
  section: { maxWidth: 1160, margin: "0 auto", padding: "40px 20px" },
  sectionHead: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  h2: { fontSize: 22 },
  seeAll: { fontSize: 14, fontWeight: 600, color: "var(--rose-clay-dark)" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 16,
  },
};
