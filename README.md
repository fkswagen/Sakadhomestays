# Sakad Homestays

Direct-booking site for one Sakad property with three room types, English/Thai guest flow, Supabase authentication, and full Stripe payment.

## Local app

1. Copy `.env.example` to `.env.local` and add Supabase public credentials.
2. Run `npm install`.
3. Run `npm run dev`.

## Supabase deployment

1. Create Supabase project, then apply `supabase/migrations/20260829000000_booking_foundation.sql`.
2. Deploy functions: `supabase functions deploy create-checkout-session` and `supabase functions deploy stripe-webhook --no-verify-jwt`.
3. Set function secrets: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `FRONTEND_URL`.
4. In Stripe sandbox, point webhook endpoint to `/functions/v1/stripe-webhook`; subscribe to `checkout.session.completed` and `checkout.session.expired`.
5. Configure Supabase Auth Site URL and redirect URLs for deployed frontend.

Never put Stripe secret key or Supabase service-role key in Vite variables.
