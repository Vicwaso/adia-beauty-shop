import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../context/CartContext";

export default function Header() {
  const { itemCount } = useCart();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const onSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <Link to="/" style={styles.logo}>
          Adia&nbsp;<span style={{ color: "var(--rose-clay)" }}>Beauty</span>
        </Link>

        <form onSubmit={onSearch} style={styles.searchForm}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search serums, shades, self-care…"
            style={styles.searchInput}
            aria-label="Search products"
          />
        </form>

        <nav style={styles.nav}>
          <Link to="/shop">Shop</Link>
          <Link to="/cart" style={styles.cartLink}>
            Cart
            {itemCount > 0 && <span style={styles.badge}>{itemCount}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}

const styles = {
  header: {
    background: "var(--ink-green-dark)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },
  inner: {
    maxWidth: 1160,
    margin: "0 auto",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    gap: 24,
    color: "#F7F3EC",
  },
  logo: {
    fontFamily: "var(--font-display)",
    fontSize: 22,
    fontWeight: 600,
    color: "#F7F3EC",
    whiteSpace: "nowrap",
  },
  searchForm: { flex: 1, minWidth: 0 },
  searchInput: {
    width: "100%",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 999,
    padding: "9px 16px",
    color: "#F7F3EC",
    fontSize: 14,
    outline: "none",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    fontSize: 15,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  cartLink: { position: "relative" },
  badge: {
    position: "absolute",
    top: -8,
    right: -14,
    background: "var(--rose-clay)",
    color: "white",
    fontSize: 11,
    fontFamily: "var(--font-mono)",
    borderRadius: 999,
    padding: "1px 6px",
  },
};
