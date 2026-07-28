export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.inner}>
        <div>
          <div style={styles.logo}>Adia Beauty</div>
          <p style={styles.tag}>Skincare, body, nail &amp; self-care — sourced honestly, delivered fast across Nairobi.</p>
        </div>
        <div style={styles.col}>
          <span style={styles.colTitle}>Get help</span>
          <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer">
            WhatsApp support
          </a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://tiktok.com" target="_blank" rel="noreferrer">TikTok</a>
        </div>
        <div style={styles.col}>
          <span style={styles.colTitle}>Delivery</span>
          <span>Nairobi — same-day (boda/Sendy)</span>
          <span>Upcountry — courier/bus parcel</span>
        </div>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    background: "var(--ink-green-dark)",
    color: "rgba(247,243,236,0.85)",
    marginTop: 64,
  },
  inner: {
    maxWidth: 1160,
    margin: "0 auto",
    padding: "40px 20px",
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr 1fr",
    gap: 32,
    fontSize: 14,
  },
  logo: {
    fontFamily: "var(--font-display)",
    fontSize: 20,
    color: "#F7F3EC",
    marginBottom: 8,
  },
  tag: { maxWidth: 320, lineHeight: 1.5, opacity: 0.8 },
  col: { display: "flex", flexDirection: "column", gap: 8 },
  colTitle: { fontWeight: 600, color: "#F7F3EC", marginBottom: 4 },
};
