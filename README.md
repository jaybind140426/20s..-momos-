# Momo's Corner — Full Online Ordering App

Includes:
- Customer menu + cart
- Real server-side orders in SQLite
- Order ID and server-side order tracking
- Admin login
- Admin order dashboard and status updates
- UPI QR generation using your own UPI ID
- WhatsApp notification after order
- Mobile responsive UI

## Run locally
1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Set `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `UPI_ID`, and `UPI_NAME`.
4. Run:
   npm install
   npm start
5. Open http://localhost:3000

## Important about UPI
This app generates a standard UPI payment intent/QR to your configured UPI ID. It does NOT independently verify a bank payment. For automatic payment verification, refunds, webhooks, etc., connect a payment gateway such as Razorpay/PhonePe/PayU and add its merchant credentials/webhooks.

## Production
Use a host that supports Node.js and persistent storage. SQLite is suitable for a small shop when the host provides persistent disk. For serverless hosting, move the database to PostgreSQL/Supabase/Firebase.
Use HTTPS in production.
