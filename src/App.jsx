import { useEffect, useState } from 'react'
import {
  ArrowRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CreditCard, KeyRound,
  LogOut, Mail, MapPin, Menu, Minus, Mountain, Phone, Plus, QrCode, ReceiptText, Save,
  ShieldCheck, Star, UserRound, X
} from 'lucide-react'
import { supabase } from './supabase'

const rooms = [
  {
    name: 'Cloud View Cottage', tag: 'For two', price: '2,400',
    image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1100&q=85',
    gallery: [
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=85'
    ],
    details: ['1 king bed', 'Private balcony', 'Mountain breakfast']
  },
  {
    name: 'Forest Family House', tag: 'For four', price: '4,200',
    image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1100&q=85',
    gallery: [
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1400&q=85'
    ],
    details: ['2 bedrooms', 'Living room', 'Valley-facing deck']
  },
  {
    name: 'Hmong Hill Cabin', tag: 'For two', price: '1,850',
    image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1100&q=85',
    gallery: [
      'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=85',
      'https://images.unsplash.com/photo-1521783988139-893ce45e1a30?auto=format&fit=crop&w=1400&q=85'
    ],
    details: ['1 queen bed', 'Garden view', 'Handcrafted interiors']
  }
]

const verifiedUser = (session) => session?.user?.email_confirmed_at ? session.user : null
const formatDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function crc16(value) {
  let crc = 0xffff
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0')
}

function promptPayPayload(account, amount) {
  const number = account.replace(/\D/g, '')
  if (!/^0\d{9}$/.test(number)) return null
  const phone = `0066${number.slice(1)}`
  const merchant = `0016A0000006770101110113${phone}`
  const payload = `00020101021229${merchant.length.toString().padStart(2, '0')}${merchant}530376454${amount.toFixed(2).length.toString().padStart(2, '0')}${amount.toFixed(2)}5802TH6304`
  return `${payload}${crc16(payload)}`
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [guestOpen, setGuestOpen] = useState(false)
  const [guests, setGuests] = useState(2)
  const [notice, setNotice] = useState('')
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [reservations, setReservations] = useState([])
  const [roomOptions, setRoomOptions] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [roomDetail, setRoomDetail] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [paymentReservation, setPaymentReservation] = useState(null)
  const [passwordResetOpen, setPasswordResetOpen] = useState(false)

  useEffect(() => {
    if (!supabase) return

    const syncUser = (session) => {
      const authenticatedUser = verifiedUser(session)
      if (!authenticatedUser && session?.user) supabase.auth.signOut()
      setUser(authenticatedUser)
    }

    supabase.auth.getSession().then(({ data }) => syncUser(data.session))
    supabase.from('rooms').select('id, name, capacity, nightly_rate, image_url').eq('is_active', true).order('nightly_rate')
      .then(({ data, error }) => { if (!error) setRoomOptions(data) })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordResetOpen(true)
      syncUser(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !user) {
      setProfile(null)
      setReservations([])
      return
    }

    let active = true
    Promise.all([
      supabase.from('profiles').select('id, full_name, phone, created_at').eq('id', user.id).single(),
      supabase.from('reservations').select('id, check_in, check_out, guests, total_amount, status, created_at, rooms(name, image_url)').order('created_at', { ascending: false })
    ]).then(([profileResult, reservationsResult]) => {
      if (!active) return
      if (!profileResult.error) setProfile(profileResult.data)
      if (!reservationsResult.error) setReservations(reservationsResult.data)
    })
    return () => { active = false }
  }, [user])

  const submitBooking = async (event) => {
    event.preventDefault()
    if (!supabase) return setNotice('Add Supabase keys in .env to enable reservations.')
    if (!user) return setNotice('Sign in or create an account before reserving.')
    const form = new FormData(event.currentTarget)
    const checkIn = form.get('checkIn')
    const checkOut = form.get('checkOut')
    const room = roomOptions.find((item) => item.id === selectedRoomId)
    if (!room || !checkIn || !checkOut) return setNotice('Select room and valid check-in/check-out dates.')
    if (guests > room.capacity) return setNotice(`${room.name} accommodates up to ${room.capacity} guests.`)
    const nights = Math.round((new Date(`${checkOut}T00:00:00Z`) - new Date(`${checkIn}T00:00:00Z`)) / 86400000)
    if (nights < 1) return setNotice('Check-out must be after check-in.')

    const { data: available, error: availabilityError } = await supabase.rpc('room_is_available', {
      target_room_id: room.id, target_check_in: checkIn, target_check_out: checkOut
    })
    if (availabilityError) return setNotice(`Could not check availability: ${availabilityError.message}`)
    if (!available) return setNotice('Those dates are unavailable. Please choose another room or dates.')

    const { data, error } = await supabase.rpc('create_reservation', {
      target_room_id: room.id, target_check_in: checkIn, target_check_out: checkOut, target_guests: guests
    })
    if (error) return setNotice(`Reservation could not be created: ${error.message}`)

    const { data: reservation } = await supabase.from('reservations')
      .select('id, check_in, check_out, guests, total_amount, status, rooms(name, image_url)')
      .eq('id', data).single()
    setNotice(`Reservation ${data.slice(0, 8).toUpperCase()} is pending confirmation.`)
    setPaymentReservation(reservation ?? { id: data, check_in: checkIn, check_out: checkOut, guests, total_amount: room.nightly_rate * nights, rooms: room })
  }

  const signOut = async () => {
    if (window.confirm('Sign out of your Sakadburi Homestays account?')) await supabase?.auth.signOut()
  }

  const accountName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Account'

  return (
    <div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Sakadburi Homestays home"><Mountain size={26} strokeWidth={1.5} /><span>SAKAD<em>HOMESTAYS</em></span></a>
        <nav className={menuOpen ? 'nav open' : 'nav'}>
          <a href="#stay">Stay</a><a href="#reservations">Reservations</a><a href="#experience">Experiences</a><a href="#find-us">Find us</a>
        </nav>
        <div className="header-actions">
          {user ? <><button className="account-name" onClick={() => setProfileOpen(true)}><UserRound size={17} /> {accountName}</button><button className="text-button signout-button" onClick={signOut}><LogOut size={16} /> Sign out</button></> : <button className="text-button" onClick={() => setAccountOpen(true)}><UserRound size={17} /> Sign in</button>}
          <a className="reserve-button" href="#book">Reserve <ArrowRight size={16} /></a>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </header>

      <main id="top">
        <section className="hero"><div className="hero-copy"><p className="eyebrow light">NAN, NORTHERN THAILAND</p><h1>Wake up<br />above <i>clouds.</i></h1><p className="hero-description">Slow mornings, mountain air, and stories shared across table. Your home in Sakad village.</p><a className="underlined-link" href="#stay">Discover our homes <ArrowRight size={17} /></a></div><div className="hero-note"><span>18.8577° N</span><span>101.0323° E</span></div><div className="scroll-cue"><span>SCROLL TO EXPLORE</span><div /></div></section>

        <section className="booking-shell" id="book">
          <form className="booking-bar" onSubmit={submitBooking}>
            <label><span>CHECK IN</span><div><CalendarDays size={18} /><input name="checkIn" type="date" aria-label="Check in date" required /></div></label>
            <label><span>CHECK OUT</span><div><CalendarDays size={18} /><input name="checkOut" type="date" aria-label="Check out date" required /></div></label>
            <div className="guest-field"><span>GUESTS</span><button type="button" onClick={() => setGuestOpen(!guestOpen)}><UserRound size={18} />{guests} guest{guests !== 1 ? 's' : ''}<ChevronDown size={16} /></button>{guestOpen && <div className="guest-popover"><span>Guests</span><div><button type="button" onClick={() => setGuests(Math.max(1, guests - 1))}><Minus size={15} /></button><strong>{guests}</strong><button type="button" onClick={() => setGuests(guests + 1)}><Plus size={15} /></button></div></div>}</div>
            <label className="room-select"><span>HOMESTAY</span><select name="roomId" required value={selectedRoomId} onChange={(event) => setSelectedRoomId(event.target.value)}><option value="" disabled>Select a home</option>{roomOptions.map((room) => <option value={room.id} key={room.id}>{room.name} · ฿{Number(room.nightly_rate).toLocaleString()}</option>)}</select></label>
            <button className="check-button" type="submit">Reserve stay <ArrowRight size={18} /></button>
          </form>
          {notice && <p className="form-notice"><Check size={15} /> {notice}</p>}
        </section>

        <section className="intro section-pad" id="stay"><div><p className="eyebrow">A PLACE TO PAUSE</p><h2>Rooted in <i>quiet.</i><br />Made for wonder.</h2></div><div className="intro-text"><p>High in Doi Phu Kha National Park, Sakadburi Homestays offers a different rhythm. Each stay is cared for by local families, with warm Thai hospitality and wide-open views.</p><a className="underlined-link dark" href="#reservations">Explore homes <ArrowRight size={17} /></a></div></section>

        <section className="room-grid">{rooms.map((room, index) => <article className={`room-card card-${index}`} key={room.name}><img src={room.image} alt={room.name} /><div className="room-overlay"><div><p>{room.tag}</p><h3>{room.name}</h3></div><button onClick={() => setRoomDetail(room)} aria-label={`View ${room.name}`}><ArrowRight size={19} /></button></div></article>)}</section>

        <section className="reservation-page section-pad" id="reservations"><div className="reservation-heading"><p className="eyebrow">RESERVATION PAGE</p><h2>Choose your<br /><i>mountain stay.</i></h2><p>Open each home to browse its gallery, room details, and nightly price before reserving.</p></div><div className="reservation-room-list">{rooms.map((room) => <button className="reservation-room" key={room.name} onClick={() => setRoomDetail(room)}><img src={room.image} alt="" /><span><small>{room.tag}</small><strong>{room.name}</strong><em>From ฿{room.price} / night</em></span><ArrowRight size={18} /></button>)}</div></section>

        <section className="experience section-pad" id="experience"><div className="experience-image"><img src="https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=85" alt="Northern Thailand mountains" /><div className="image-stamp">LOCAL<br />LIFE</div></div><div className="experience-copy"><p className="eyebrow">MORE THAN A STAY</p><h2>Days with<br /><i>meaning.</i></h2><p>Follow misty trails at sunrise. Learn to make Nan-style food in family kitchens. Drink tea by firelight while village stories unfold.</p><div className="feature-list"><span><Check size={17} /> Local breakfast included</span><span><Check size={17} /> Community-led experiences</span><span><Check size={17} /> Doi Phu Kha National Park</span></div></div></section>

        <section className="testimonial"><p className="quote-mark">“</p><blockquote>Not a hotel. A feeling we carried home with us.</blockquote><div className="stars">{[1, 2, 3, 4, 5].map((star) => <Star size={15} key={star} fill="currentColor" />)}</div><p>ANNA &amp; LEO, BANGKOK</p></section>

        <section className="location" id="find-us"><div className="map-card"><div className="map-lines" /><MapPin className="map-pin" size={42} fill="#c75b35" /><div className="map-label">SAKADBURY<br />HOMESTAYS</div></div><div className="location-copy"><p className="eyebrow">COME FIND US</p><h2>Far from<br />ordinary.</h2><p>Sakadburi Homestays sits in Sakad village, Nan province, about 2.5 hours from Nan Nakhon Airport.</p><a className="underlined-link dark" href="https://www.google.com/maps/search/?api=1&query=Sakadburi+Homestays" target="_blank" rel="noreferrer">Open Sakadburi Homestays in Google Maps <ArrowRight size={17} /></a></div></section>
        <section className="contact-banner" id="contact"><div><p className="eyebrow light">LET'S TALK</p><h2>Planning a<br /><i>mountain escape?</i></h2></div><a className="round-button" href="mailto:hello@sakadhomestays.com"><Mail size={22} /></a></section>
      </main>

      <footer><div className="footer-brand"><Mountain size={25} /><span>SAKAD<em>HOMESTAYS</em></span></div><p>Sakad Village, Pua District<br />Nan 55120, Thailand</p><div className="footer-links"><a href="tel:+6654777777"><Phone size={16} /> +66 54 777 777</a><a href="https://instagram.com">IG</a><a href="https://facebook.com">FB</a></div><p className="copyright">© 2026 Sakadburi Homestays</p></footer>

      {accountOpen && <AccountModal close={() => setAccountOpen(false)} onAuthenticated={() => setAccountOpen(false)} />}
      {roomDetail && <RoomDetail room={roomDetail} roomOptions={roomOptions} close={() => setRoomDetail(null)} reserve={(room) => { const storedRoom = roomOptions.find((item) => item.name === room.name); if (storedRoom) setSelectedRoomId(storedRoom.id); setRoomDetail(null); document.querySelector('#book')?.scrollIntoView({ behavior: 'smooth' }) }} />}
      {profileOpen && <ProfileModal user={user} profile={profile} reservations={reservations} close={() => setProfileOpen(false)} refreshProfile={setProfile} openPayment={setPaymentReservation} />}
      {paymentReservation && <PaymentModal reservation={paymentReservation} close={() => setPaymentReservation(null)} />}
      {passwordResetOpen && <PasswordResetModal close={() => setPasswordResetOpen(false)} />}
    </div>
  )
}

function AccountModal({ close, onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [message, setMessage] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    if (!supabase) return setMessage('Supabase is not configured. Add environment keys first.')
    const form = new FormData(event.currentTarget)
    const email = form.get('email')
    const password = form.get('password')
    const name = form.get('fullName')
    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: window.location.origin } })
      if (error) return setMessage(error.message)
      if (data.session) await supabase.auth.signOut()
      return setMessage('Check your email to confirm account, then sign in.')
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return setMessage(error.message)
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut()
      return setMessage('Confirm your email before signing in. Check your inbox for verification link.')
    }
    onAuthenticated()
  }
  return <Modal close={close} label="Account access"><div className="modal-top"><ShieldCheck size={25} /><p>GUEST ACCOUNT</p><h2>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2></div><form onSubmit={submit}><label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@email.com" required /></label><label>Password<input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="••••••••" minLength="8" required /></label>{mode === 'register' && <label>Full name<input name="fullName" type="text" autoComplete="name" placeholder="Your name" required /></label>}<button className="modal-submit" type="submit">{mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button></form>{message && <p className="account-message">{message}</p>}<button className="switch-mode" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'New here? Create account' : 'Already have an account? Sign in'}</button></Modal>
}

function Modal({ children, close, label }) {
  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={label}><div className="account-modal"><button className="close-modal" onClick={close} aria-label="Close"><X /></button>{children}</div></div>
}

function RoomDetail({ room, roomOptions, close, reserve }) {
  const [photo, setPhoto] = useState(0)
  const storedRoom = roomOptions.find((item) => item.name === room.name)
  const price = storedRoom ? Number(storedRoom.nightly_rate).toLocaleString() : room.price
  const next = () => setPhoto((photo + 1) % room.gallery.length)
  const previous = () => setPhoto((photo - 1 + room.gallery.length) % room.gallery.length)
  return <Modal close={close} label={`${room.name} details`}><div className="room-detail"><div className="gallery"><img src={room.gallery[photo]} alt={`${room.name}, image ${photo + 1}`} /><button className="gallery-arrow left" onClick={previous} aria-label="Previous image"><ChevronLeft /></button><button className="gallery-arrow right" onClick={next} aria-label="Next image"><ChevronRight /></button><span>{photo + 1} / {room.gallery.length}</span></div><p className="eyebrow">{room.tag}</p><h2>{room.name}</h2><p className="room-price">From ฿{price} <small>/ night</small></p><div className="room-features">{room.details.map((detail) => <span key={detail}><Check size={16} /> {detail}</span>)}</div><button className="modal-submit" onClick={() => reserve(room)}>Select this home <ArrowRight size={17} /></button></div></Modal>
}

function ProfileModal({ user, profile, reservations, close, refreshProfile, openPayment }) {
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const saveProfile = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaving(true)
    const { data, error } = await supabase.rpc('update_my_profile', { target_full_name: form.get('fullName'), target_phone: form.get('phone') })
    setSaving(false)
    if (error) return setMessage(error.message)
    refreshProfile(data)
    setMessage('Profile saved.')
  }
  const requestPasswordChange = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin })
    setMessage(error ? error.message : 'Password-change email sent. Open its link to set a new password.')
  }
  return <Modal close={close} label="My profile"><div className="modal-top"><UserRound size={25} /><p>MY ACCOUNT</p><h2>Your profile.</h2></div><div className="account-id"><span>ACCOUNT ID</span><code>{user.id}</code></div><form onSubmit={saveProfile}><label>Full name<input name="fullName" defaultValue={profile?.full_name ?? user.user_metadata?.full_name ?? ''} required /></label><label>Phone number<input name="phone" type="tel" autoComplete="tel" defaultValue={profile?.phone ?? ''} placeholder="+66 00 000 0000" /></label><button className="modal-submit" type="submit" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save profile'}</button></form><button className="password-button" onClick={requestPasswordChange}><KeyRound size={16} /> Change password by email</button>{message && <p className="account-message">{message}</p>}<div className="profile-reservations"><div><p className="eyebrow">YOUR RESERVATIONS</p><h3>Upcoming and past stays</h3></div>{reservations.length === 0 ? <p className="empty-state">No reservations yet.</p> : reservations.map((reservation) => <article className="profile-reservation" key={reservation.id}><img src={reservation.rooms?.image_url || rooms.find((room) => room.name === reservation.rooms?.name)?.image} alt="" /><div><strong>{reservation.rooms?.name}</strong><span>{formatDate(reservation.check_in)} - {formatDate(reservation.check_out)}</span><small>{reservation.guests} guest{reservation.guests === 1 ? '' : 's'} · {reservation.status}</small></div><button onClick={() => openPayment(reservation)} aria-label="Open payment"><ReceiptText size={18} /></button></article>)}</div></Modal>
}

function PasswordResetModal({ close }) {
  const [message, setMessage] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    const password = new FormData(event.currentTarget).get('password')
    const { error } = await supabase.auth.updateUser({ password })
    setMessage(error ? error.message : 'Password changed. You can continue using your account.')
  }
  return <Modal close={close} label="Set new password"><div className="modal-top"><KeyRound size={25} /><p>PASSWORD RESET</p><h2>Set new password.</h2></div><form onSubmit={submit}><label>New password<input name="password" type="password" autoComplete="new-password" minLength="8" required /></label><button className="modal-submit" type="submit">Update password <ArrowRight size={17} /></button></form>{message && <p className="account-message">{message}</p>}</Modal>
}

function PaymentModal({ reservation, close }) {
  const [method, setMethod] = useState('card')
  const promptPayId = import.meta.env.VITE_PROMPTPAY_ID || ''
  const amount = Number(reservation.total_amount)
  const payload = promptPayPayload(promptPayId, amount)
  const qrUrl = payload ? `https://quickchart.io/qr?size=240&text=${encodeURIComponent(payload)}` : null
  return <Modal close={close} label="Payment"><div className="modal-top"><ReceiptText size={25} /><p>PAYMENT PAGE</p><h2>Complete your stay.</h2></div><div className="payment-summary"><span>{reservation.rooms?.name || 'Sakadburi Homestays reservation'}</span><strong>฿{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong><small>Reservation {reservation.id.slice(0, 8).toUpperCase()}</small></div><div className="payment-methods"><button className={method === 'promptpay' ? 'active' : ''} onClick={() => setMethod('promptpay')} disabled={!payload}><QrCode size={18} /> PromptPay / QR</button><button className={method === 'card' ? 'active' : ''} onClick={() => setMethod('card')}><CreditCard size={18} /> Credit card</button></div>{method === 'promptpay' ? <div className="qr-payment"><img src={qrUrl} alt="PromptPay QR code" /><p>Scan with your banking app. Amount is prefilled: ฿{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}.</p></div> : <div className="card-payment"><CreditCard size={28} /><p>Card payment is not configured yet. Card details are intentionally not collected in this app. Connect a PCI-compliant payment provider such as Stripe or Opn before accepting cards.</p>{!payload && <small>PromptPay QR unlocks after <code>VITE_PROMPTPAY_ID</code> is configured.</small>}</div>}</Modal>
}

export default App
