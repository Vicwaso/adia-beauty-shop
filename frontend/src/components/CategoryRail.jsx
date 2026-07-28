import { Link } from "react-router-dom";

export default function CategoryRail({ categories, activeSlug }) {
  return (
    <div style={styles.rail}>
      <Link
        to="/shop"
        style={{
          ...styles.chip,
          ...(!activeSlug ? styles.chipActive : {}),
        }}
      >
        All
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          to={`/shop?category=${c.slug}`}
          style={{
            ...styles.chip,
            ...(activeSlug === c.slug ? styles.chipActive : {}),
          }}
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}

const styles = {
  rail: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    padding: "4px 0 4px",
  },
  chip: {
    flexShrink: 0,
    border: "1px solid rgba(18,37,28,0.18)",
    borderRadius: 999,
    padding: "7px 16px",
    fontSize: 13.5,
    fontWeight: 500,
    color: "var(--ink-green-dark)",
    background: "white",
  },
  chipActive: {
    background: "var(--ink-green-dark)",
    color: "white",
    borderColor: "var(--ink-green-dark)",
  },
};
