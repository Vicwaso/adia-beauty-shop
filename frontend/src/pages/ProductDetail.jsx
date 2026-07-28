import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getProduct } from "../api/client";
import { useCart } from "../context/CartContext";

export default function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setProduct(null);
    getProduct(slug)
      .then(setProduct)
      .catch(() => setError("We couldn't load this product. It may no longer be available."));
  }, [slug]);

  if (error) return <div style={styles.page}><p>{error}</p></div>;
  if (!product) return <div style={styles.page}><p>Loading…</p></div>;

  const images = product.images?.length ? product.images : [{ image: null }];

  const handleAdd = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div style={styles.page}>
      <Link to="/shop" style={styles.back}>← Back to shop</Link>
      <div style={styles.layout}>
        <div>
          <div style={styles.mainImage}>
            {images[activeImage]?.image ? (
              <img src={images[activeImage].image} alt={product.name} style={styles.img} />
            ) : (
              <div style={styles.placeholder} />
            )}
          </div>
          {images.length > 1 && (
            <div style={styles.thumbRow}>
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  style={{
                    ...styles.thumb,
                    borderColor: i === activeImage ? "var(--ink-green)" : "transparent",
                  }}
                >
                  {img.image && <img src={img.image} alt="" style={styles.img} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span style={styles.category}>{product.category?.name}</span>
          <h1 style={styles.name}>{product.name}</h1>
          <div className="price" style={styles.price}>
            KSh {Number(product.price).toLocaleString()}
          </div>

          {!product.in_stock && <div style={styles.oos}>Currently out of stock</div>}

          <p style={styles.desc}>{product.description}</p>

          <div style={styles.qtyRow}>
            <div style={styles.qtyControl}>
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} style={styles.qtyBtn}>−</button>
              <span style={styles.qtyValue}>{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} style={styles.qtyBtn}>+</button>
            </div>
            <button
              onClick={handleAdd}
              disabled={!product.in_stock}
              style={{
                ...styles.addBtn,
                opacity: product.in_stock ? 1 : 0.4,
                cursor: product.in_stock ? "pointer" : "not-allowed",
              }}
            >
              {added ? "Added ✓" : product.in_stock ? "Add to cart" : "Out of stock"}
            </button>
          </div>

          <Link to="/cart" style={styles.viewCart}>
            {added ? "View cart →" : ""}
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "28px 20px 64px" },
  back: { fontSize: 13.5, color: "var(--rose-clay-dark)", fontWeight: 600 },
  layout: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 40,
    marginTop: 20,
  },
  mainImage: {
    aspectRatio: "1 / 1",
    background: "var(--porcelain-deep)",
    borderRadius: 8,
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  placeholder: { width: "100%", height: "100%" },
  thumbRow: { display: "flex", gap: 8, marginTop: 10 },
  thumb: {
    width: 56, height: 56, borderRadius: 6, overflow: "hidden",
    border: "2px solid transparent", background: "var(--porcelain-deep)", padding: 0,
  },
  category: {
    fontFamily: "var(--font-mono)", fontSize: 12, textTransform: "uppercase",
    letterSpacing: "0.05em", color: "var(--rose-clay-dark)",
  },
  name: { fontSize: 28, margin: "8px 0 12px" },
  price: { fontSize: 20, color: "var(--ink-green-dark)" },
  oos: {
    marginTop: 10, display: "inline-block", background: "#FBEAE9",
    color: "var(--danger)", fontSize: 13, fontWeight: 600, padding: "4px 10px", borderRadius: 4,
  },
  desc: { marginTop: 18, lineHeight: 1.7, color: "#3a3a3a", fontSize: 15 },
  qtyRow: { display: "flex", gap: 14, marginTop: 24, alignItems: "center" },
  qtyControl: {
    display: "flex", alignItems: "center", border: "1px solid rgba(18,37,28,0.18)",
    borderRadius: 999, overflow: "hidden",
  },
  qtyBtn: { border: "none", background: "none", padding: "8px 14px", fontSize: 16 },
  qtyValue: { minWidth: 24, textAlign: "center", fontFamily: "var(--font-mono)" },
  addBtn: {
    background: "var(--ink-green)", color: "white", border: "none",
    borderRadius: 999, padding: "12px 28px", fontWeight: 600, fontSize: 14.5, flex: 1,
  },
  viewCart: { display: "block", marginTop: 14, fontSize: 14, fontWeight: 600, color: "var(--rose-clay-dark)" },
};
