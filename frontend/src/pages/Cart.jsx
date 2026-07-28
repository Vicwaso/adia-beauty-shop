import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div style={styles.page}>
        <h1 style={styles.h1}>Your cart is empty</h1>
        <p style={{ marginTop: 8, color: "#5b5b5b" }}>
          Browse the shop to find something for your routine.
        </p>
        <Link to="/shop" style={styles.shopLink}>Start shopping →</Link>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Your cart</h1>

      <div style={styles.list}>
        {items.map((item) => (
          <div key={item.productId} style={styles.row}>
            <div style={styles.thumb}>
              {item.image && <img src={item.image} alt="" style={styles.img} />}
            </div>
            <div style={styles.info}>
              <span style={styles.name}>{item.name}</span>
              <span className="price" style={styles.unitPrice}>
                KSh {item.price.toLocaleString()} each
              </span>
            </div>
            <div style={styles.qtyControl}>
              <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} style={styles.qtyBtn}>−</button>
              <span style={styles.qtyValue}>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} style={styles.qtyBtn}>+</button>
            </div>
            <span className="price" style={styles.lineTotal}>
              KSh {(item.price * item.quantity).toLocaleString()}
            </span>
            <button onClick={() => removeItem(item.productId)} style={styles.remove} aria-label={`Remove ${item.name}`}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div style={styles.summary}>
        <div style={styles.summaryRow}>
          <span>Subtotal</span>
          <span className="price">KSh {subtotal.toLocaleString()}</span>
        </div>
        <p style={styles.note}>Delivery fee is calculated at checkout based on your zone.</p>
        <button onClick={() => navigate("/checkout")} style={styles.checkoutBtn}>
          Continue to checkout →
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { maxWidth: 780, margin: "0 auto", padding: "32px 20px 64px" },
  h1: { fontSize: 26, marginBottom: 20 },
  shopLink: { display: "inline-block", marginTop: 16, fontWeight: 600, color: "var(--rose-clay-dark)" },
  list: { display: "flex", flexDirection: "column", gap: 14 },
  row: {
    display: "grid",
    gridTemplateColumns: "56px 1fr auto auto 28px",
    alignItems: "center",
    gap: 14,
    background: "white",
    borderRadius: 8,
    padding: "12px 14px",
    boxShadow: "var(--shadow-card)",
  },
  thumb: { width: 56, height: 56, borderRadius: 6, background: "var(--porcelain-deep)", overflow: "hidden" },
  img: { width: "100%", height: "100%", objectFit: "cover" },
  info: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  name: { fontSize: 14.5, fontWeight: 500 },
  unitPrice: { fontSize: 12.5, color: "#777" },
  qtyControl: {
    display: "flex", alignItems: "center", border: "1px solid rgba(18,37,28,0.15)",
    borderRadius: 999, overflow: "hidden",
  },
  qtyBtn: { border: "none", background: "none", padding: "4px 10px", fontSize: 14 },
  qtyValue: { minWidth: 20, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 13 },
  lineTotal: { fontSize: 14.5, minWidth: 80, textAlign: "right" },
  remove: { border: "none", background: "none", color: "#999", fontSize: 14 },
  summary: {
    marginTop: 28, background: "white", borderRadius: 8, padding: 20, boxShadow: "var(--shadow-card)",
  },
  summaryRow: { display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 600 },
  note: { fontSize: 13, color: "#777", margin: "8px 0 16px" },
  checkoutBtn: {
    width: "100%", background: "var(--ink-green)", color: "white", border: "none",
    borderRadius: 999, padding: "13px", fontWeight: 600, fontSize: 15,
  },
};
