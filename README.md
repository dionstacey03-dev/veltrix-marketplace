# VELTRIX — Shop Smarter. Live Better.

Modern glassmorphic e-commerce marketplace built with React, TypeScript, Tailwind CSS, Express, Google Gemini AI, and Firebase (Authentication & Firestore).

## Architecture Overview

- **Frontend (`src/`)**: React 19 + TypeScript + Tailwind CSS v4 with Light / Dark / System theming, USD / LKR currency switching, PWA support (`vite-plugin-pwa`), dynamic Product JSON-LD SEO, customer storefront, seller studio, and admin console.
- **Backend (`server.ts`)**: Express server hosting server-side `@google/genai` AI shopping assistant endpoints (`/api/ai/search`, `/api/ai/recommend`, `/api/ai/compare`, `/api/ai/chat`), integration status readout (`/api/integrations/status`), and email webhook hook (`/api/notifications/email`).
- **Database & Auth**: Firebase Firestore (schema documented in `firebase-blueprint.json`) and Firebase Authentication (Google Sign-In), secured via hardened rules in `firestore.rules`.

## Local & Production Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` (and optional SMTP / payment gateway credentials).
3. Deploy Firestore rules (when using Firebase CLI):
   ```bash
   firebase deploy --only firestore:rules
   ```
4. Start development server on port `3000`:
   ```bash
   npm run dev
   ```
5. Build and run production server:
   ```bash
   npm run build
   npm start
   ```

## External Integrations Requiring Credentials

- **Google Gemini AI**: Requires `GEMINI_API_KEY` on the server (`process.env.GEMINI_API_KEY`).
- **Transactional Email**: Requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` on the server.
- **Online Card Payment Gateways**: Requires `STRIPE_SECRET_KEY` or `PAYHERE_MERCHANT_ID` + `PAYHERE_MERCHANT_SECRET`. Without gateway credentials configured, checkout operates honestly in Cash on Delivery (COD) and Order Reservation modes.

## Demo Data & Seeding

When Firestore `products` is empty, VELTRIX displays clearly labelled Demo Catalog items from `src/data/demoCatalog.ts`. Signed-in administrators can publish the demo catalog, categories, sellers, and coupons into live Firestore collections directly from the Admin Console.
