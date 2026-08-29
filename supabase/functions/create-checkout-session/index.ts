import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@22.6.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('FRONTEND_URL') ?? '',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) throw new Error('Sign in before checkout.')
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) throw new Error('Invalid session.')

    const { roomId, checkIn, checkOut, guests, fullName, phone, specialRequest } = await request.json()
    const start = new Date(`${checkIn}T00:00:00Z`)
    const end = new Date(`${checkOut}T00:00:00Z`)
    const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000)
    if (!roomId || !Number.isInteger(nights) || nights < 1 || nights > 30 || !Number.isInteger(guests) || guests < 1 || typeof fullName !== 'string' || !fullName.trim() || typeof phone !== 'string' || !phone.trim()) throw new Error('Invalid reservation details.')

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: room, error: roomError } = await admin.from('rooms').select('id, name_en, max_guests, base_rate').eq('slug', roomId).eq('is_active', true).single()
    if (roomError || !room || room.max_guests < guests) throw new Error('This stay is not available for selected guests.')
    const total = room.base_rate * nights
    const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString()
    await admin.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() }).eq('id', user.id)
    const { data: reservation, error: reservationError } = await admin.from('reservations').insert({ user_id: user.id, check_in: checkIn, check_out: checkOut, guests, guest_full_name: fullName.trim(), guest_phone: phone.trim(), special_request: typeof specialRequest === 'string' ? specialRequest.trim().slice(0, 2000) || null : null, total_amount: total, expires_at: expiresAt }).select('id, reservation_code').single()
    if (reservationError) throw new Error(reservationError.code === '23P01' ? 'Those dates were just booked. Please choose different dates.' : reservationError.message)
    const { error: roomReservationError } = await admin.from('reservation_rooms').insert({ reservation_id: reservation.id, room_id: room.id, check_in: checkIn, check_out: checkOut, nightly_rate: room.base_rate })
    if (roomReservationError) {
      await admin.from('reservations').delete().eq('id', reservation.id)
      throw new Error(roomReservationError.code === '23P01' ? 'Those dates were just booked. Please choose different dates.' : roomReservationError.message)
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() })
    const siteUrl = Deno.env.get('FRONTEND_URL')!
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment', payment_method_types: ['card', 'promptpay'], customer_email: user.email,
      line_items: [{ price_data: { currency: 'thb', unit_amount: room.base_rate, product_data: { name: `${room.name_en} (${checkIn} - ${checkOut})` } }, quantity: nights }],
      metadata: { reservation_id: reservation.id },
      success_url: `${siteUrl}/confirmation?reservation=${reservation.reservation_code}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?room=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    })
    await admin.from('reservations').update({ stripe_checkout_session_id: checkout.id }).eq('id', reservation.id)
    return Response.json({ url: checkout.url }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ error: error.message || 'Checkout could not start.' }, { status: 400, headers: corsHeaders })
  }
})
