import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { createOrder, initiateStkPush, getOrder } from "../api/client";

const ZONES = [
  { label: "Nairobi CBD (same-day, boda)", fee: 150 },
  { label: "Nairobi — other areas (same-day, Sendy)", fee: 250 },
  { label: "Upcountry — courier (G4S / Wells Fargo)", fee: 400 },
  { label: "Upcountry — bus parcel (Modern Coast)", fee: 300 },
];

// Mirrors apps.orders.models.Order.STATUS_CHOICES on the backend.
const TERMINAL_SUCCESS = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];
const BACK_TO_PENDING = ["PENDING_PAYMENT"];

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", zoneIndex: 0, delivery_address: "",
  });
  const [step, setStep] = useState("details"); // details | creating | awaiting_stk | polling | paid | failed
  const [errorMsg, setErrorMsg] = useState(null);
  const [order, setOrder] = useState(null);
  const pollRef = useRef(null);

  const zone = ZONES[form.zoneIndex];
  const total = subtotal + zone.fee;

  useEffect(() => () => clearInterval(pollRef.current), []);

  if (items.length === 0 && step === "details") {
    navigate("/shop");
    return null;
  }

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const startPolling = (orderId) => {
    setStep("polling");
    pollRef.current = setInterval(async () => {
      try {
        const latest = await getOrder(orderId);
        setOrder(latest);
        if (TERMINAL_SUCCESS.includes(latest.status)) {
          clearInterval(pollRef.current);
          clearCart();
          setStep("paid");
        } else if (BACK_TO_PENDING.includes(latest.status)) {
          clearInterval(pollRef.current);
          setStep("failed");
        }
      } catch {
        // transient network hiccup — keep polling, don't fail the whole flow
      }
    }, 3000);

    // Stop polling after 90s so the customer isn't left waiting forever.
    setTimeout(() => {
      clearInterval(pollRef.current);
      setStep((current) => (current === "polling" ? "timeout" : current));
    }, 90000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setStep("creating");
    try {
      const newOrder = await createOrder({
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        delivery_zone: zone.label,
        delivery_fee: zone.fee,
        delivery_address: form.delivery_address,
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      });
      setOrder(newOrder);
      setStep("awaiting_stk");

      await initiateStkPush({ order_id: newOrder.id, phone_number: form.customer_phone });
      startPolling(newOrder.id);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setErrorMsg(detail || "We could not process your order right now. Please try again.");
      setStep("details");
    }
  };

  const retryPayment = async () => {
    setErrorMsg(null);
    setStep("awaiting_stk");
    try {
      await initiateStkPush({ order_id: order.id, phone_number: form.customer_phone });
      startPolling(order.id);
    } catch {
      setErrorMsg("Could not restart the M-Pesa prompt. You can also pay via Paybill and message us on WhatsApp to confirm.");
      setStep("failed");
    }
  };

  if (step === "paid") {
    return (
      <div style={styles.page}>
        <div style={styles.successCard}>
          <h1 style={styles.h1}>Payment confirmed 🎉</h1>
          <p style={styles.p}>
            Order #{order?.id} is being packed. We'll message you on WhatsApp with delivery updates.
          </p>
          <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer" style={styles.waLink}>
            Message us on WhatsApp →
          </a>
        </div>
      </div>
    );
  }

  if (step === "failed" || step === "timeout") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.h1}>
            {step === "timeout" ? "Still waiting on confirmation" : "Payment didn't go through"}
          </h1>
          <p style={styles.p}>
            {step === "timeout"
              ? "This is taking longer than usual. If you completed the M-Pesa prompt, your order will update shortly — you can also check on WhatsApp."
              : "The M-Pesa prompt was cancelled or failed. You can try again, or pay via Paybill/Till and we'll confirm manually."}
          </p>
          <div style={styles.actions}>
            <button onClick={retryPayment} style={styles.primaryBtn}>Retry M-Pesa payment</button>
            <a href="https://wa.me/254700000000" target="_blank" rel="noreferrer" style={styles.waLink}>
              WhatsApp us →
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (step === "awaiting_stk" || step === "polling") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.h1}>Check your phone</h1>
          <p style={styles.p}>
            We've sent an M-Pesa prompt to <strong>{form.customer_phone}</strong> for{" "}
            <span className="price">KSh {total.toLocaleString()}</span>. Enter your PIN to complete
            the payment — this page will update automatically.
          </p>
          <div style={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Checkout</h1>
      {errorMsg && <div style={styles.error}>{errorMsg}</div>}

      <form onSubmit={handleSubmit} style={styles.layout}>
        <div style={styles.formCol}>
          <label style={styles.label}>
            Full name
            <input required value={form.customer_name} onChange={handleChange("customer_name")} style={styles.input} />
          </label>
          <label style={styles.label}>
            M-Pesa phone number
            <input
              required
              placeholder="07XXXXXXXX"
              pattern="0[17][0-9]{8}"
              value={form.customer_phone}
              onChange={handleChange("customer_phone")}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Delivery zone
            <select
              value={form.zoneIndex}
              onChange={(e) => setForm((f) => ({ ...f, zoneIndex: Number(e.target.value) }))}
              style={styles.input}
            >
              {ZONES.map((z, i) => (
                <option key={z.label} value={i}>{z.label} — KSh {z.fee}</option>
              ))}
            </select>
          </label>
          <label style={styles.label}>
            Delivery address / landmark
            <textarea
              required
              rows={3}
              value={form.delivery_address}
              onChange={handleChange("delivery_address")}
              style={{ ...styles.input, resize: "vertical" }}
            />
          </label>
        </div>

        <div style={styles.summaryCol}>
          <div style={styles.summaryCard}>
            <h3 style={{ marginBottom: 14 }}>Order summary</h3>
            {items.map((i) => (
              <div key={i.productId} style={styles.summaryLine}>
                <span>{i.quantity} × {i.name}</span>
                <span className="price">KSh {(i.price * i.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div style={styles.divider} />
            <div style={styles.summaryLine}>
              <span>Subtotal</span>
              <span className="price">KSh {subtotal.toLocaleString()}</span>
            </div>
            <div style={styles.summaryLine}>
              <span>Delivery ({zone.label.split(" (")[0]})</span>
              <span className="price">KSh {zone.fee}</span>
            </div>
            <div style={styles.divider} />
            <div style={{ ...styles.summaryLine, fontWeight: 700, fontSize: 16 }}>
              <span>Total</span>
              <span className="price">KSh {total.toLocaleString()}</span>
            </div>
            <button type="submit" disabled={step === "creating"} style={styles.primaryBtn}>
              {step === "creating" ? "Creating order…" : "Pay with M-Pesa"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

const styles = {
  page: { maxWidth: 900, margin: "0 auto", padding: "32px 20px 64px" },
  h1: { fontSize: 26, marginBottom: 20 },
  p: { lineHeight: 1.6, color: "#3a3a3a", fontSize: 15 },
  error: {
    background: "#FBEAE9", color: "var(--danger)", padding: "10px 14px",
    borderRadius: 6, marginBottom: 16, fontSize: 14,
  },
  layout: { display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 32 },
  formCol: { display: "flex", flexDirection: "column", gap: 16 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13.5, fontWeight: 600 },
  input: {
    border: "1px solid rgba(18,37,28,0.18)", borderRadius: 6, padding: "10px 12px",
    fontSize: 14.5, fontFamily: "var(--font-body)",
  },
  summaryCol: {},
  summaryCard: {
    background: "white", borderRadius: 8, padding: 20, boxShadow: "var(--shadow-card)",
    position: "sticky", top: 90,
  },
  summaryLine: {
    display: "flex", justifyContent: "space-between", fontSize: 14, padding: "5px 0", color: "#3a3a3a",
  },
  divider: { borderTop: "1px solid rgba(18,37,28,0.1)", margin: "8px 0" },
  primaryBtn: {
    width: "100%", background: "var(--ink-green)", color: "white", border: "none",
    borderRadius: 999, padding: "13px", fontWeight: 600, fontSize: 15, marginTop: 16,
  },
  card: {
    background: "white", borderRadius: 10, padding: 32, boxShadow: "var(--shadow-card)", maxWidth: 480,
  },
  successCard: {
    background: "white", borderRadius: 10, padding: 32, boxShadow: "var(--shadow-card)",
    maxWidth: 480, borderTop: "4px solid var(--success)",
  },
  waLink: { display: "inline-block", marginTop: 16, fontWeight: 600, color: "var(--rose-clay-dark)" },
  actions: { display: "flex", flexDirection: "column", gap: 12, marginTop: 20, alignItems: "flex-start" },
  spinner: {
    width: 28, height: 28, border: "3px solid rgba(18,37,28,0.15)", borderTopColor: "var(--ink-green)",
    borderRadius: "50%", marginTop: 20, animation: "spin 0.8s linear infinite",
  },
};
