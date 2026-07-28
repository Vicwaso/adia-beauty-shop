# Adia Beauty — Online Beauty Shop

Full-stack scaffold for the online beauty shop plan: Django + DRF backend,
React + Vite frontend, M-Pesa Daraja STK Push checkout.

## What's built

**Backend** (`backend/`) — Django 5 + DRF + PostgreSQL
- Products: Category / Product / ProductImage models, staff-only admin at a
  custom URL, stock indicators (red = out, amber = low)
- Public read-only API: `/api/products/`, `/api/products/categories/`,
  `/api/products/<slug>/` — supports `?category=` and `?search=`
- Orders: explicit status state machine (`PENDING_PAYMENT → PAYMENT_PROCESSING
  → PAID → PROCESSING → SHIPPED → DELIVERED`, plus `CANCELLED`), server-side
  price/total calculation (the frontend never sends a trusted total)
- Payments: separate state machine from Order status, full M-Pesa Daraja STK
  Push integration, an **idempotent callback handler** (duplicate Safaricom
  callbacks are safely ignored), and a manual Paybill/Till admin fallback
- Stock deduction happens exactly once, at payment confirmation, protected by
  `select_for_update()` + atomic transactions against race conditions
- Automated tests in `apps/orders/tests.py` — all passing

**Frontend** (`frontend/`) — React + Vite, custom design system
- Custom palette/type (deep botanical green, rose-clay, brass — Fraunces +
  Inter + IBM Plex Mono), signature "apothecary hang-tag" product cards
- Pages: Home, Shop (category + search), Product detail, Cart, Checkout
- Checkout drives the real order → STK Push → poll-for-status flow, with
  distinct UI states for payment success, failure/cancellation, and timeout
- Cart persists to `localStorage` (this is real shipped code, not a Claude
  artifact, so browser storage is fine here)

## Running it locally

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in DB + M-Pesa sandbox credentials
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
Admin lives at `http://localhost:8000/<ADMIN_URL_PATH>` (see `.env`), not
`/admin/`.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # points at your backend's /api
npm run dev
```

### M-Pesa sandbox
Get sandbox credentials at https://developer.safaricom.co.ke/. The callback
URL must be a public HTTPS URL Safaricom can reach — use ngrok (or Render,
once deployed) for local testing; `localhost` will not work for callbacks.

## What's still open (per the plan's Build Order)

- Step 5 polish: on-site product search relevance, reviews, richer filters
- SMS/WhatsApp order-status notifications (webhook to a provider like
  Africa's Talking) — the state machine already has the hooks (`transition_to`)
  to trigger these from
- Deployment config for Render (this scaffold runs locally; `requirements.txt`
  includes `gunicorn` for when you're ready to deploy)
- Real product photography/catalog data — everything here uses placeholder
  content structure, ready for your actual products once added via admin
- Cloudinary/S3 image storage is wired in `settings.py` behind
  `USE_CLOUDINARY`, but needs real credentials to activate

## Design decisions worth knowing about

See `backend/apps/orders/services.py` for the documented decision record on
*when* stock is deducted (after payment, not at cart-add or checkout-start)
and why — it's the same reasoning your problem-solving notes called for.
