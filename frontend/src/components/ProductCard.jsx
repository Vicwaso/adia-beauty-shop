import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const CATEGORY_DOT = {
  Skincare: "var(--success)",
  "Body Care": "var(--rose-clay)",
  "Nail Care": "var(--brass)",
  "Wellness / Self-Care": "var(--amber)",
  "Baby Products": "#7893A8",
};

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const dotColor = CATEGORY_DOT[product.category?.name] || "var(--ink-green)";

  return (
    <div style={styles.tag}>
      <div style={styles.punchHole} aria-hidden="true" />
      <Link to={`/product/${product.slug}`} style={styles.imageWrap}>
        {product.primary_image ? (
          <img src={product.primary_image} alt={product.name} style={styles.image} />
        ) : (
          <div style={styles.imagePlaceholder}>
            <span style={{ background: dotColor }} className="dot" />
          </div>
        )}
        {!product.in_stock && <span style={styles.oosBadge}>Out of stock</span>}
      </Link>

      <div style={styles.perforation} aria-hidden="true" />

      <div style={styles.body}>
        <Link to={`/product/${product.slug}`}>
          <h3 style={styles.name}>{product.name}</h3>
        </Link>
        <div style={styles.row}>
          <span className="price" style={styles.price}>
            KSh {Number(product.price).toLocaleString()}
          </span>
          <button
            onClick={() => addItem(product, 1)}
            disabled={!product.in_stock}
            style={{
              ...styles.addBtn,
              opacity: product.in_stock ? 1 : 0.4,
              cursor: product.in_stock ? "pointer" : "not-allowed",
            }}
          >
            {product.in_stock ? "Add to cart" : "Notify me"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  tag: {
    background: "white",
    borderRadius: "2px 2px var(--radius-tag) var(--radius-tag)",
    boxShadow: "var(--shadow-card)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  punchHole: {
    position: "absolute",
    top: 10,
    left: "50%",
    transform: "translateX(-50%)",
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "var(--porcelain)",
    border: "1px solid rgba(18,37,28,0.12)",
    zIndex: 2,
  },
  imageWrap: {
    display: "block",
    position: "relative",
    aspectRatio: "1 / 1",
    background: "var(--porcelain-deep)",
  },
  image: { width: "100%", height: "100%", objectFit: "cover" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  oosBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    background: "var(--danger)",
    color: "white",
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    padding: "2px 8px",
    borderRadius: 3,
  },
  perforation: {
    borderTop: "1px dashed rgba(18,37,28,0.18)",
    margin: "0 12px",
  },
  body: { padding: "12px 14px 14px" },
  name: {
    fontSize: 15,
    fontWeight: 500,
    lineHeight: 1.3,
    marginBottom: 10,
    minHeight: 38,
  },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 14, color: "var(--ink-green-dark)" },
  addBtn: {
    background: "var(--ink-green)",
    color: "white",
    border: "none",
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 12.5,
    fontWeight: 600,
  },
};
