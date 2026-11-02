# BayBook – Smart Parking Slot Booking (MERN)

React.js → Express/Node.js (REST) → MongoDB

## Run it

Prerequisites: Node 18+, MongoDB running locally (or an Atlas URI in `backend/.env`).

Open two terminals from the project root (`smart-parking`). Use Node.js 18+ and make sure MongoDB is running.

```bash
# Terminal 1: backend
cd backend
cp .env.example .env   # then edit backend/.env and add your own secrets
npm install
npm run seed            # optional: creates demo admin, user and sample lots
npm start               # http://localhost:5001
```

```bash
# Terminal 2: frontend (open a NEW terminal at the project root)
cd frontend
npm install              # installs Vite and React dependencies
npm run dev              # open http://localhost:5173
```

Demo logins: `user@parking.com / user123`, `admin@parking.com / admin123`

## Features
- Register / login (JWT, bcrypt-hashed passwords), user and admin roles
- Browse lots with live "free now" counts and search
- Pick arrival and leave time, see the lot drawn as parking bays, book a free bay
- Double-booking prevention (time-window overlap check on the server)
- View, extend/shorten, and cancel bookings
- Admin: create / edit / delete lots (bays auto-generated), view all bookings

## Architecture
See `docs/ARCHITECTURE.md`.


## Razorpay test payments

1. In a terminal at the project root, run `cd backend && cp .env.example .env` (do not overwrite an existing `.env` with your own settings).
2. Open `backend/.env` and replace BOTH Razorpay placeholders with your real Razorpay **Test Mode** API credentials from https://dashboard.razorpay.com/app/keys. The Key ID usually starts with `rzp_test_`; the secret is shown when you generate the key. Placeholder values do not work.
3. Make sure local MongoDB is running, then from `backend` run `npm install` and `npm start`. The server prints a warning if the Razorpay test keys are still placeholders.
4. From `frontend` in a second terminal, run `npm install` and `npm run dev`.
5. Select a parking slot and click **Pay ₹… with Razorpay**. A booking is confirmed only after the backend verifies the Razorpay signature. If checkout does not open, read the error shown on the booking page and the backend terminal.

Never put the Razorpay secret in frontend code or commit `.env`. This implementation uses Razorpay test-mode checkout; switch to live keys only after configuring and testing your Razorpay account. For production, also add webhook-based reconciliation and cleanup/expiry for unpaid pending bookings.

## Local setup (frontend + backend + Razorpay)

1. Install Node.js and MongoDB, then start MongoDB.
2. In `backend/`, copy `.env.example` to `.env` and fill in your own values. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` using a matching pair from the Razorpay Dashboard (Test Mode for testing). Never commit or share `.env`.
3. In a terminal opened at `backend/`, run `npm install` and then `npm start`.
4. In a second terminal opened at `frontend/`, run `npm install` and then `npm run dev`.
5. Open the local URL printed by Vite (usually `http://localhost:5173`).

The Razorpay secret belongs only in `backend/.env`; it must never be added to frontend code. The ZIP intentionally does not include live or test API secrets.

## What changed in this version
- **Vehicle validation (backend):** `backend/utils/vehicle.js` checks Indian plates (state code list, RTO, series, 4 digits, BH series). Used on register, on booking, and by `GET /api/vehicles/validate?number=KA01AB1234` for live feedback in the UI.
- **Razorpay:** shared helper `frontend/src/razorpay.js` opens Checkout with UPI, Cards, Wallets and Netbanking blocks. The backend now reports placeholder keys clearly. API calls go through the Vite proxy (`/api`), so the port can no longer mismatch.
- **UI:** new colourful glass theme, number-plate input, animated bays, and a parking-lot picture behind everything (`frontend/public/parking-bg.svg`; swap it for your own photo by editing the `url()` in `styles.css`).
