import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@22.6.0'

Deno.serve(async (request) => {
  const signature = request.headers.get('stripe-signature')
  if (!signature) return new Response('Missing Stripe signature.', { status: 400 })
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() })
    const event = await stripe.webhooks.constructEventAsync(await request.text(), signature, Deno.env.get('STRIPE_WEBHOOK_SECRET')!)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const session = event.data.object as Stripe.Checkout.Session
    const reservationId = session.metadata?.reservation_id
    if (!reservationId) return new Response('Ignored.', { status: 200 })
    if (event.type === 'checkout.session.completed' && session.payment_status === 'paid') {
      await admin.from('reservations').update({ status: 'confirmed', stripe_payment_intent_id: String(session.payment_intent), expires_at: null }).eq('id', reservationId).eq('status', 'payment_pending')
      await admin.from('reservation_rooms').update({ status: 'confirmed' }).eq('reservation_id', reservationId).eq('status', 'payment_pending')
    }
    if (event.type === 'checkout.session.expired') {
      await admin.from('reservations').update({ status: 'expired' }).eq('id', reservationId).eq('status', 'payment_pending')
      await admin.from('reservation_rooms').update({ status: 'expired' }).eq('reservation_id', reservationId).eq('status', 'payment_pending')
    }
    return new Response('ok', { status: 200 })
  } catch (error) {
    console.error(error)
    return new Response('Webhook error.', { status: 400 })
  }
})
